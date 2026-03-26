/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-sync-service.js
 * Snapshot parsing and reconciliation for ClientCare when exports or browser copies are all we have.
 */

function stripTags(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtmlTables(html = '') {
  const tables = [];
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  const tableMatches = String(html || '').match(tableRegex) || [];
  for (const tableHtml of tableMatches) {
    const rows = [];
    const rowMatches = tableHtml.match(rowRegex) || [];
    for (const rowHtml of rowMatches) {
      const cells = [];
      let match;
      while ((match = cellRegex.exec(rowHtml)) !== null) {
        cells.push(stripTags(match[1]));
      }
      cellRegex.lastIndex = 0;
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function parseDelimitedText(text = '') {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const split = (line) => line.split(delimiter).map((item) => item.trim());
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => {
    const values = split(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function normalizeHeader(header = '') {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toObjectsFromTable(table = []) {
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);
  return table.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

function pick(obj, keys = []) {
  for (const key of keys) {
    if (obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
  }
  return null;
}

function normalizeMoney(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function inferStatus(row = {}) {
  const raw = [
    pick(row, ['claim_status', 'status', 'submission_status', 'billing_status']),
    pick(row, ['denial_reason', 'rejection_reason']),
  ].filter(Boolean).join(' ').toLowerCase();
  if (/reject/.test(raw)) return 'rejected';
  if (/deny|denied/.test(raw)) return 'denied';
  if (/paid|closed/.test(raw)) return 'paid';
  if (/submitted|accepted|in process|processing/.test(raw)) return 'submitted';
  if (/unbilled|pending|draft/.test(raw)) return 'unbilled';
  return (pick(row, ['claim_status', 'status', 'submission_status']) || 'imported').toLowerCase();
}

function normalizeSnapshotRow(row = {}, source = 'snapshot_import') {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  return {
    external_claim_id: pick(normalized, ['external_claim_id', 'claim_id', 'id']),
    patient_id: pick(normalized, ['patient_id', 'client_id']),
    patient_name: pick(normalized, ['patient_name', 'client_name', 'patient', 'client']),
    payer_name: pick(normalized, ['payer_name', 'payer', 'insurance', 'insurance_company']) || 'Unknown',
    payer_type: pick(normalized, ['payer_type']),
    provider_state: pick(normalized, ['provider_state', 'state']),
    member_id: pick(normalized, ['member_id', 'subscriber_id']),
    claim_number: pick(normalized, ['claim_number', 'claim_no']),
    account_number: pick(normalized, ['account_number', 'account_no']),
    date_of_service: pick(normalized, ['date_of_service', 'dos', 'service_date']),
    service_end_date: pick(normalized, ['service_end_date', 'to_date']),
    original_submitted_at: pick(normalized, ['original_submitted_at', 'submitted_at', 'date_submitted']),
    latest_submitted_at: pick(normalized, ['latest_submitted_at', 'last_submitted_at']),
    claim_status: inferStatus(normalized),
    submission_status: pick(normalized, ['submission_status', 'status']),
    denial_code: pick(normalized, ['denial_code', 'reason_code']),
    denial_reason: pick(normalized, ['denial_reason', 'rejection_reason', 'status_reason']),
    billed_amount: normalizeMoney(pick(normalized, ['billed_amount', 'charge_amount', 'amount_billed', 'amount'])),
    allowed_amount: normalizeMoney(pick(normalized, ['allowed_amount'])),
    paid_amount: normalizeMoney(pick(normalized, ['paid_amount', 'insurance_paid', 'paid'])),
    patient_balance: normalizeMoney(pick(normalized, ['patient_balance', 'client_balance'])),
    insurance_balance: normalizeMoney(pick(normalized, ['insurance_balance', 'balance', 'outstanding_balance'])),
    cpt_codes: pick(normalized, ['cpt_codes', 'cpt', 'procedure_codes']),
    icd_codes: pick(normalized, ['icd_codes', 'diagnosis_codes', 'dx_codes']),
    modifiers: pick(normalized, ['modifiers']),
    notes: pick(normalized, ['notes', 'claim_notes']),
    source,
    metadata: { snapshot: normalized },
  };
}

export function createClientCareSyncService({ billingService, logger = console }) {
  function parseSnapshot(payload = {}) {
    const source = payload.source || 'snapshot_import';
    if (Array.isArray(payload.rows)) {
      return payload.rows.map((row) => normalizeSnapshotRow(row, source));
    }
    if (typeof payload.json === 'string' && payload.json.trim()) {
      const parsed = JSON.parse(payload.json);
      const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.rows) ? parsed.rows : [];
      return rows.map((row) => normalizeSnapshotRow(row, source));
    }
    if (typeof payload.html === 'string' && payload.html.trim()) {
      const tables = parseHtmlTables(payload.html);
      const rows = tables.flatMap((table) => toObjectsFromTable(table));
      return rows.map((row) => normalizeSnapshotRow(row, source));
    }
    if (typeof payload.text === 'string' && payload.text.trim()) {
      const rows = parseDelimitedText(payload.text);
      return rows.map((row) => normalizeSnapshotRow(row, source));
    }
    return [];
  }

  async function importSnapshot(payload = {}) {
    const claims = parseSnapshot(payload).filter((item) => item.date_of_service && item.payer_name);
    const results = await billingService.importClaims(claims, { source: payload.source || 'snapshot_import' });
    return {
      parsed: claims.length,
      imported: results.filter((item) => !item.error).length,
      failed: results.filter((item) => item.error).length,
      results,
    };
  }

  async function buildReconciliationSummary(filters = {}) {
    const claims = await billingService.listClaims({ ...filters, limit: filters.limit || 500 });
    const summary = {
      total: claims.length,
      unbilled: 0,
      submitted: 0,
      rejected: 0,
      denied: 0,
      paid: 0,
      missing_submission_date: 0,
      high_priority: 0,
    };
    for (const claim of claims) {
      const status = String(claim.claim_status || '').toLowerCase();
      if (/unbilled|imported/.test(status)) summary.unbilled += 1;
      else if (/submitted/.test(status)) summary.submitted += 1;
      else if (/reject/.test(status)) summary.rejected += 1;
      else if (/deny/.test(status)) summary.denied += 1;
      else if (/paid|closed/.test(status)) summary.paid += 1;
      if (!claim.original_submitted_at && !claim.latest_submitted_at) summary.missing_submission_date += 1;
      if (Number(claim.priority_score || 0) >= 200) summary.high_priority += 1;
    }
    return { summary, claims: claims.slice(0, 100) };
  }

  return {
    parseSnapshot,
    importSnapshot,
    buildReconciliationSummary,
  };
}
