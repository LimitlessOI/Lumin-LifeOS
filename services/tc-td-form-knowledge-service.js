/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Persists TD form catalog snapshots + operator handling guidance.
 */

export function createTDTDFormKnowledgeService({ pool, coordinator, logger = console }) {
  async function ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tc_td_form_knowledge (
        id BIGSERIAL PRIMARY KEY,
        transaction_id BIGINT REFERENCES tc_transactions(id) ON DELETE SET NULL,
        source TEXT NOT NULL DEFAULT 'td_scrape',
        form_name TEXT NOT NULL,
        role_hint TEXT,
        source_text TEXT,
        machine_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
        handling_playbook JSONB NOT NULL DEFAULT '{}'::jsonb,
        confidence NUMERIC(4,3),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (transaction_id, source, form_name)
      );
    `);
  }

  function inferHandlingPlaybookFromRow(row = {}) {
    const formName = String(row.form_name || '').toLowerCase();
    const roleHint = String(row.role_hint || '').toLowerCase();
    const schema = row.machine_schema && typeof row.machine_schema === 'object' ? row.machine_schema : {};
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const textBlob = `${formName} ${(row.source_text || '').toLowerCase()}`;
    const hasSeller = /seller|listing/.test(textBlob) || roleHint === 'seller';
    const hasBuyer = /buyer/.test(textBlob) || roleHint === 'buyer';
    const isR4R = /repair|r4r|inspection|binsr|response|counter/.test(textBlob);
    const signer_role = hasSeller && hasBuyer ? 'both' : hasSeller ? 'seller' : hasBuyer ? 'buyer' : 'unknown';
    const hasDateField = fields.some((f) => /date/.test(String(f?.name || '') + ' ' + String(f?.label || '')));
    const hasSignatureField = fields.some((f) =>
      /sign|signature|initial/.test(String(f?.name || '') + ' ' + String(f?.label || ''))
    );
    const required_fields = fields
      .filter((f) => f?.required)
      .map((f) => ({
        name: f.name || f.id || null,
        label: f.label || null,
        type: f.type || f.tag || null,
      }))
      .slice(0, 60);

    const flow = isR4R
      ? 'r4r_response'
      : /inspection/.test(textBlob)
        ? 'inspection'
        : /counter|amendment|addendum/.test(textBlob)
          ? 'negotiation'
          : 'general';

    const autoFillHints = [];
    for (const f of fields.slice(0, 250)) {
      const n = String(f?.name || '').toLowerCase();
      const l = String(f?.label || '').toLowerCase();
      const t = `${n} ${l}`;
      if (/property|address|site/.test(t)) autoFillHints.push({ field: f.name || f.id || f.label || null, source: 'transaction.address' });
      if (/mls/.test(t)) autoFillHints.push({ field: f.name || f.id || f.label || null, source: 'transaction.mls_number' });
      if (/seller/.test(t)) autoFillHints.push({ field: f.name || f.id || f.label || null, source: 'parties.seller.name/email' });
      if (/buyer/.test(t)) autoFillHints.push({ field: f.name || f.id || f.label || null, source: 'parties.buyer.name/email' });
      if (/date/.test(t)) autoFillHints.push({ field: f.name || f.id || f.label || null, source: 'now.date' });
    }

    const confidenceBase =
      signer_role !== 'unknown' ? 0.55 : 0.35;
    const confidence =
      Math.min(
        0.95,
        confidenceBase +
          (hasSignatureField ? 0.1 : 0) +
          (required_fields.length > 0 ? 0.1 : 0) +
          (isR4R ? 0.08 : 0)
      );

    return {
      flow,
      signer_role,
      requires_signature: !!hasSignatureField,
      requires_date: !!hasDateField,
      required_fields,
      auto_fill_hints: autoFillHints.slice(0, 80),
      review_required: confidence < 0.8,
      routing_defaults: {
        approval_gate: true,
        notify_channels: ['email'],
      },
      template_defaults: {
        intent: 'standard',
        doc_type_prefix: flow === 'r4r_response' ? 'R4R response package' : 'TD form package',
        send_mode: 'approval_required',
      },
      source: 'machine_inference_v1',
      generated_at: new Date().toISOString(),
      confidence,
    };
  }

  async function upsertSnapshot(transactionId, rows = [], { source = 'td_scrape' } = {}) {
    await ensureTable();
    const saved = [];
    for (const row of rows) {
      const formName = String(row.name || '').trim();
      if (!formName) continue;
      const roleHint = row.role_hint ? String(row.role_hint) : null;
      const sourceText = row.source_text ? String(row.source_text) : null;
      const machineSchema = row.machine_schema && typeof row.machine_schema === 'object'
        ? row.machine_schema
        : {};
      const confidence = row.confidence != null ? Number(row.confidence) : null;
      const playbook = row.handling_playbook && typeof row.handling_playbook === 'object'
        ? row.handling_playbook
        : {};
      const { rows: q } = await pool.query(
        `INSERT INTO tc_td_form_knowledge
           (transaction_id, source, form_name, role_hint, source_text, machine_schema, handling_playbook, confidence, last_seen_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
         ON CONFLICT (transaction_id, source, form_name)
         DO UPDATE SET
           role_hint = COALESCE(EXCLUDED.role_hint, tc_td_form_knowledge.role_hint),
           source_text = COALESCE(EXCLUDED.source_text, tc_td_form_knowledge.source_text),
           machine_schema = CASE
             WHEN tc_td_form_knowledge.machine_schema = '{}'::jsonb
               THEN EXCLUDED.machine_schema
             ELSE tc_td_form_knowledge.machine_schema
           END,
           handling_playbook = CASE
             WHEN tc_td_form_knowledge.handling_playbook = '{}'::jsonb
               THEN EXCLUDED.handling_playbook
             ELSE tc_td_form_knowledge.handling_playbook
           END,
           confidence = COALESCE(EXCLUDED.confidence, tc_td_form_knowledge.confidence),
           last_seen_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [
          transactionId || null,
          source,
          formName,
          roleHint,
          sourceText,
          JSON.stringify(machineSchema),
          JSON.stringify(playbook),
          confidence,
        ]
      );
      saved.push(q[0]);
    }
    if (transactionId) {
      await coordinator.logEvent(transactionId, 'td_forms_snapshot_saved', { count: saved.length, source });
    }
    return saved;
  }

  async function listKnowledge({ transactionId = null, limit = 300 } = {}) {
    await ensureTable();
    const values = [];
    const where = [];
    if (transactionId != null) {
      values.push(transactionId);
      where.push(`transaction_id = $${values.length}`);
    }
    values.push(Math.max(1, Math.min(1000, Number(limit) || 300)));
    const { rows } = await pool.query(
      `SELECT * FROM tc_td_form_knowledge
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(last_seen_at, updated_at, created_at) DESC
       LIMIT $${values.length}`,
      values
    );
    return rows;
  }

  async function updatePlaybook(id, playbook = {}, confidence = null, machineSchema = null) {
    await ensureTable();
    const { rows } = await pool.query(
      `UPDATE tc_td_form_knowledge
       SET handling_playbook = $2,
           confidence = COALESCE($3, confidence),
           machine_schema = COALESCE($4, machine_schema),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(playbook || {}), confidence, machineSchema ? JSON.stringify(machineSchema) : null]
    );
    return rows[0] || null;
  }

  async function generatePlaybooks({ transactionId = null, limit = 200, overwrite = false } = {}) {
    await ensureTable();
    const rows = await listKnowledge({ transactionId, limit });
    const updated = [];
    for (const row of rows) {
      const cur = row.handling_playbook && typeof row.handling_playbook === 'object' ? row.handling_playbook : {};
      if (!overwrite && Object.keys(cur).length) continue;
      const inferred = inferHandlingPlaybookFromRow(row);
      const next = await updatePlaybook(row.id, inferred, inferred.confidence, null);
      if (next) updated.push(next);
    }
    if (transactionId) {
      await coordinator.logEvent(transactionId, 'td_forms_playbooks_generated', {
        count: updated.length,
        overwrite: !!overwrite,
      });
    }
    return { scanned: rows.length, updated_count: updated.length, items: updated };
  }

  function deepMerge(base, patch) {
    const b = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
    const p = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
    const out = { ...b };
    for (const [k, v] of Object.entries(p)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  async function resolveExecutionPlan(id, { intent = 'standard', overrides = {} } = {}) {
    await ensureTable();
    const { rows } = await pool.query(`SELECT * FROM tc_td_form_knowledge WHERE id=$1`, [id]);
    const row = rows[0];
    if (!row) return null;
    const playbook = row.handling_playbook && typeof row.handling_playbook === 'object' ? row.handling_playbook : {};
    const templateDefaults =
      playbook.template_defaults && typeof playbook.template_defaults === 'object'
        ? playbook.template_defaults
        : {};
    const intents = playbook.intents && typeof playbook.intents === 'object' ? playbook.intents : {};
    const intentPlan = intents[intent] && typeof intents[intent] === 'object' ? intents[intent] : {};
    const resolved = deepMerge(deepMerge(playbook, templateDefaults), intentPlan);
    const finalPlan = deepMerge(resolved, overrides && typeof overrides === 'object' ? overrides : {});
    return {
      form: row,
      intent,
      plan: finalPlan,
    };
  }

  return {
    upsertSnapshot,
    listKnowledge,
    updatePlaybook,
    inferHandlingPlaybookFromRow,
    generatePlaybooks,
    resolveExecutionPlan,
  };
}

export default createTDTDFormKnowledgeService;
