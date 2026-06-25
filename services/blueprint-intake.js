/**
 * SYNOPSIS: Blueprint Intake Service — three flows: backfill existing amendment, greenfield
 * conversation, and adjustment patch. Scans codebase patterns before generation so every import,
 * auth ref, and AI call matches reality. GAP_FLAG surfaces unknowns for founder conversation.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCodebasePatterns } from './blueprint-codebase-scanner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Prompt templates ─────────────────────────────────────────────────────────

const INTENT_EXTRACT_SYSTEM = `You are BuilderOS ARC. Your job: read a product amendment document and extract structured build intent as JSON.

Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Required shape:
{
  "product_name": "string",
  "product_purpose": "one sentence",
  "phase": 1,
  "routes_needed": [{"method":"POST","path":"/api/v1/...","purpose":"...","auth":"requireKey|public","body_fields":["field:type"]}],
  "services_needed": [{"name":"file-stem-no-js","purpose":"...","ai_operations":["what AI does here, which model alias"]}],
  "db_tables_needed": [{"name":"...","columns":[{"name":"...","type":"TEXT|UUID|JSONB|TIMESTAMPTZ|INT|NUMERIC(3,2)","nullable":false,"default":"gen_random_uuid()|NOW()|[]|{}"}]}],
  "env_vars_needed": ["VAR_NAME"],
  "ai_operations": [{"name":"...","purpose":"...","alias":"claude|gemini|openai"}],
  "acceptance_criteria": ["human-readable test that proves it works"],
  "non_goals": ["what is explicitly NOT in this phase"],
  "html_files": [{"path":"public/overlay/name.html","purpose":"..."}],
  "scripts": [{"path":"scripts/verify-name.mjs","purpose":"acceptance test runner"}]
}

If a section is unclear or missing from the amendment: use the string "UNKNOWN" for that field's value.
Do NOT invent requirements. Only extract what is stated or clearly implied.`;

const BLUEPRINT_GEN_SYSTEM = (patterns) => `You are BuilderOS ARC generating a machine-readable blueprint JSON.

CODEBASE PATTERNS (use these exactly — verified against live project):
${JSON.stringify(patterns, null, 2)}

BLUEPRINT FORMAT RULES:
1. Root object must have: _meta, env, steps[]
2. _meta must have: product, phase, parent_ssot, blueprint_version, build_rule, ssot_tag, acceptance_cmd
3. Each step must have: id (SMS-P1-NNN), file, type (sql|esm|esm_script|html), deps (array of step IDs), ssot_tag
4. SQL steps: include full idempotent DDL in "sql" field
5. ESM service steps: include factory_export, imports[], exports[] with sig and behavior[] arrays
6. Route steps: include export (factory fn), ctx_destructure, imports[], routes[] with full behavior[]
7. HTML steps: include template reference, on_load behavior, element descriptions
8. Script steps: include run command, exit_0_means, tests[] with assert strings
9. For EVERY import: must be from installed_packages list in codebase patterns OR add to packages_to_install
10. For EVERY AI call: use callCouncilMember from ctx, alias from patterns.ai_call_pattern.aliases
11. For EVERY auth check: use patterns.auth_pattern.owner_id_guard exactly
12. For EVERY DB column typed owner_id: use TEXT NOT NULL (JWT sub is a string, not a PG UUID)
13. GAP_FLAG rule: if you cannot determine a value from intent or patterns, write "GAP_FLAG: [describe exactly what is missing]" as the value

Return ONLY a valid JSON object. No markdown, no code fences.`;

const GAP_CONVERSATION_SYSTEM = `You are Lumin (the BuilderOS Chair). A blueprint has gaps that need founder input to resolve.

Be direct and conversational. Ask one gap at a time. When the founder answers, confirm understanding before moving to the next gap.

Never ask for technical details Adam hasn't offered — frame gaps in plain product terms ("What should happen when X?").

When all gaps are answered, say exactly: "GAPS_RESOLVED" on a new line.`;

const ADJUSTMENT_SYSTEM = (existingBlueprint, patterns) => `You are BuilderOS ARC. The founder has requested an adjustment to an existing blueprint.

EXISTING BLUEPRINT:
${JSON.stringify(existingBlueprint, null, 2)}

CODEBASE PATTERNS:
${JSON.stringify(patterns, null, 2)}

The founder's adjustment request will follow. Apply it precisely:
1. Only change what the founder described — do not refactor unrelated parts
2. If the adjustment requires a new step, add it with the next sequential id
3. If the adjustment removes a feature, remove its step and update deps arrays
4. If the adjustment changes a route, update only that route's behavior array
5. Flag any consequence that needs the founder's attention with: "CONSEQUENCE_FLAG: [description]"

Return the COMPLETE updated blueprint JSON — no partial updates, no diffs. Full object only.`;

// ── Gap detection ─────────────────────────────────────────────────────────────

function detectGaps(blueprintJson) {
  const text = JSON.stringify(blueprintJson);
  const gaps = [];
  const regex = /"GAP_FLAG:\s*([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 100), match.index + 100);
    const keyMatch = context.match(/"([^"]+)":\s*"GAP_FLAG:/);
    gaps.push({
      id: `gap_${gaps.length + 1}`,
      description: match[1].trim(),
      field_context: keyMatch ? keyMatch[1] : 'unknown_field',
      resolved: false,
      answer: null,
    });
  }
  return gaps;
}

function detectConsequenceFlags(blueprintJson) {
  const text = JSON.stringify(blueprintJson);
  const flags = [];
  const regex = /"CONSEQUENCE_FLAG:\s*([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    flags.push(match[1].trim());
  }
  return flags;
}

function applyGapAnswers(blueprintJson, answers) {
  let text = JSON.stringify(blueprintJson);
  for (const [gapId, answer] of Object.entries(answers)) {
    const gap = blueprintJson._gaps?.find(g => g.id === gapId);
    if (gap) {
      const escaped = gap.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(
        new RegExp(`"GAP_FLAG: ${escaped}"`, 'g'),
        JSON.stringify(answer)
      );
    }
  }
  return JSON.parse(text);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAmendment(amendmentFile) {
  const candidates = [
    amendmentFile,
    path.join(ROOT, amendmentFile),
    path.join(ROOT, 'docs/projects', amendmentFile),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`AmendmentNotFound: ${amendmentFile}`);
}

function parseBlueprintFromAiResponse(raw) {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

async function updateSession(pool, id, updates) {
  const sets = Object.entries(updates).map(([k, v], i) => `${k} = $${i + 2}`);
  const vals = Object.values(updates).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
  await pool.query(
    `UPDATE blueprint_intake_sessions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`,
    [id, ...vals]
  );
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createBlueprintIntakeService(pool, callCouncilMember) {

  // ── FLOW 1: Backfill (existing amendment → blueprint) ─────────────────────
  async function startBackfill({ amendmentFile, productName, ownerId = null }) {
    const codebaseScan = await scanCodebasePatterns();
    const amendmentText = readAmendment(amendmentFile);

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, amendment_file, flow_type, status, codebase_scan_json, owner_id)
       VALUES ($1, $2, 'backfill', 'extracting', $3, $4) RETURNING id`,
      [productName, amendmentFile, JSON.stringify(codebaseScan), ownerId]
    );
    const sessionId = rows[0].id;

    try {
      // Step 1: extract intent
      const intentRaw = await callCouncilMember('claude',
        `Amendment to analyze:\n\n${amendmentText.slice(0, 12000)}`,
        { systemPrompt: INTENT_EXTRACT_SYSTEM, maxOutputTokens: 3000, taskType: 'general' }
      );
      const intent = parseBlueprintFromAiResponse(intentRaw);
      await updateSession(pool, sessionId, { extracted_intent_json: intent, status: 'generating' });

      // Step 2: generate blueprint
      const blueprintRaw = await callCouncilMember('claude',
        `PRODUCT INTENT:\n${JSON.stringify(intent, null, 2)}\n\nGenerate the complete blueprint JSON now.`,
        { systemPrompt: BLUEPRINT_GEN_SYSTEM(codebaseScan), maxOutputTokens: 8000, taskType: 'general' }
      );
      const blueprint = parseBlueprintFromAiResponse(blueprintRaw);

      // Step 3: gap detection
      const gaps = detectGaps(blueprint);
      blueprint._gaps = gaps;
      blueprint._meta = { ...blueprint._meta, blueprint_version: '1.0.0-intake', generated_by: 'blueprint-intake-service', scanned_at: codebaseScan.scanned_at };

      const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
      await updateSession(pool, sessionId, {
        blueprint_json: blueprint,
        gaps_json: gaps,
        status: newStatus,
      });

      return { sessionId, status: newStatus, gapCount: gaps.length, gaps };
    } catch (err) {
      await updateSession(pool, sessionId, { status: 'failed' });
      throw err;
    }
  }

  // ── FLOW 2: Greenfield (conversation → spec → blueprint) ──────────────────
  async function startGreenfield({ productName, firstMessage, ownerId = null }) {
    const codebaseScan = await scanCodebasePatterns();

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, flow_type, status, codebase_scan_json, conversation_json, owner_id)
       VALUES ($1, 'greenfield', 'extracting', $2, $3, $4) RETURNING id`,
      [productName, JSON.stringify(codebaseScan), JSON.stringify([{ role: 'user', content: firstMessage }]), ownerId]
    );
    const sessionId = rows[0].id;

    const greenfieldSystem = `You are Lumin (Chair) running a product intake conversation with the founder.
Your goal: understand the new product well enough to generate a complete build spec.

Phase 1 — Discovery (ask until you know): What does it do? Who uses it? What's the single most important flow?
Phase 2 — Tech decisions (resolve each): What data needs to be stored? What AI operations are needed? Any external APIs?
Phase 3 — Scope lock: "Here's what Phase 1 includes / excludes. Confirm?"

When scope is confirmed, say exactly: SPEC_READY
Then output the spec as a JSON block using the intent extraction format.

Ask ONE question at a time. Be brief and direct. You are Lumin — conversational, not formal.`;

    const firstResponse = await callCouncilMember('claude',
      firstMessage,
      { systemPrompt: greenfieldSystem, maxOutputTokens: 500, taskType: 'general' }
    );

    const conversation = [
      { role: 'user', content: firstMessage },
      { role: 'assistant', content: firstResponse },
    ];

    await updateSession(pool, sessionId, { conversation_json: conversation });

    const specReady = firstResponse.includes('SPEC_READY');
    return { sessionId, response: firstResponse, specReady, status: specReady ? 'generating' : 'extracting' };
  }

  async function continueGreenfield({ sessionId, userMessage }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const codebaseScan = session.codebase_scan_json;
    const conversation = session.conversation_json || [];

    const greenfieldSystem = `You are Lumin (Chair) running a product intake conversation.
You are mid-conversation. Continue naturally. When scope is confirmed say SPEC_READY then output the JSON spec.
Ask ONE question at a time. Be brief.`;

    const messages = [...conversation, { role: 'user', content: userMessage }];
    const response = await callCouncilMember('claude',
      messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
      { systemPrompt: greenfieldSystem, maxOutputTokens: 600, taskType: 'general' }
    );

    messages.push({ role: 'assistant', content: response });
    await updateSession(pool, sessionId, { conversation_json: messages });

    if (response.includes('SPEC_READY')) {
      const jsonMatch = response.match(/```json([\s\S]+?)```/) || response.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        const intent = parseBlueprintFromAiResponse(jsonMatch[0]);
        const blueprintRaw = await callCouncilMember('claude',
          `PRODUCT INTENT:\n${JSON.stringify(intent, null, 2)}\n\nGenerate the complete blueprint JSON now.`,
          { systemPrompt: BLUEPRINT_GEN_SYSTEM(codebaseScan), maxOutputTokens: 8000, taskType: 'general' }
        );
        const blueprint = parseBlueprintFromAiResponse(blueprintRaw);
        const gaps = detectGaps(blueprint);
        blueprint._gaps = gaps;
        const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
        await updateSession(pool, sessionId, {
          extracted_intent_json: intent,
          blueprint_json: blueprint,
          gaps_json: gaps,
          status: newStatus,
        });
        return { sessionId, response, specReady: true, gapCount: gaps.length, status: newStatus };
      }
    }

    return { sessionId, response, specReady: false, status: 'extracting' };
  }

  // ── FLOW 3: Adjustment (founder says change X → ARC patches blueprint) ─────
  async function startAdjustment({ amendmentFile, adjustmentText, ownerId = null }) {
    const blueprintFile = amendmentFile.replace('.md', '.blueprint.json');
    const blueprintPath = path.join(ROOT, 'docs/projects', path.basename(blueprintFile));

    let existingBlueprint;
    try {
      existingBlueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
    } catch {
      throw new Error(`BlueprintNotFound: ${blueprintPath} — run backfill first`);
    }

    const codebaseScan = await scanCodebasePatterns();
    const productName = existingBlueprint._meta?.product || path.basename(amendmentFile, '.md');

    const { rows } = await pool.query(
      `INSERT INTO blueprint_intake_sessions
         (product_name, amendment_file, flow_type, status, codebase_scan_json, conversation_json, owner_id)
       VALUES ($1, $2, 'adjustment', 'generating', $3, $4, $5) RETURNING id`,
      [
        productName, amendmentFile,
        JSON.stringify(codebaseScan),
        JSON.stringify([{ role: 'user', content: adjustmentText }]),
        ownerId,
      ]
    );
    const sessionId = rows[0].id;

    try {
      const patchedRaw = await callCouncilMember('claude',
        `FOUNDER ADJUSTMENT REQUEST:\n${adjustmentText}`,
        { systemPrompt: ADJUSTMENT_SYSTEM(existingBlueprint, codebaseScan), maxOutputTokens: 8000, taskType: 'general' }
      );
      const patched = parseBlueprintFromAiResponse(patchedRaw);
      const gaps = detectGaps(patched);
      const consequenceFlags = detectConsequenceFlags(patched);
      patched._gaps = gaps;
      patched._meta = { ...patched._meta, blueprint_version: incrementVersion(existingBlueprint._meta?.blueprint_version || '1.0.0'), adjusted_at: new Date().toISOString() };

      const newStatus = gaps.length > 0 ? 'gap_collection' : 'arc_review';
      await updateSession(pool, sessionId, {
        blueprint_json: patched,
        gaps_json: gaps,
        status: newStatus,
      });

      // Write updated blueprint file
      if (gaps.length === 0) {
        fs.writeFileSync(blueprintPath, JSON.stringify(patched, null, 2) + '\n');
      }

      return {
        sessionId, status: newStatus,
        gapCount: gaps.length, gaps,
        consequenceFlags,
        blueprintVersion: patched._meta.blueprint_version,
      };
    } catch (err) {
      await updateSession(pool, sessionId, { status: 'failed' });
      throw err;
    }
  }

  // ── Gap conversation (fill gaps via Lumin) ────────────────────────────────
  async function sendGapMessage({ sessionId, userMessage }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    if (session.status !== 'gap_collection') {
      throw new Error(`SessionNotInGapCollection: status=${session.status}`);
    }

    const gaps = session.gaps_json || [];
    const openGaps = gaps.filter(g => !g.resolved);
    const conversation = session.conversation_json || [];

    const gapContext = `Open gaps:\n${openGaps.map(g => `- ${g.id}: ${g.description}`).join('\n')}`;
    const messages = [...conversation, { role: 'user', content: userMessage }];

    const response = await callCouncilMember('claude',
      `${gapContext}\n\nCurrent message from founder: ${userMessage}`,
      { systemPrompt: GAP_CONVERSATION_SYSTEM, maxOutputTokens: 400, taskType: 'general' }
    );
    messages.push({ role: 'assistant', content: response });

    // Extract answers for specific gaps from the conversation
    const gapAnswers = { ...(session.gap_answers_json || {}) };
    for (const gap of openGaps) {
      if (userMessage.toLowerCase().includes(gap.id.toLowerCase()) ||
          response.toLowerCase().includes('got it') ||
          response.toLowerCase().includes('confirmed')) {
        gapAnswers[gap.id] = userMessage;
        gap.resolved = true;
        gap.answer = userMessage;
      }
    }

    const allResolved = gaps.every(g => g.resolved);
    await updateSession(pool, sessionId, {
      conversation_json: messages,
      gaps_json: gaps,
      gap_answers_json: gapAnswers,
      status: allResolved ? 'arc_review' : 'gap_collection',
    });

    return { response, allResolved, openGapCount: gaps.filter(g => !g.resolved).length };
  }

  // ── Answer a specific gap directly (API call without conversation) ─────────
  async function answerGap({ sessionId, gapId, answer }) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const gaps = session.gaps_json || [];
    const gap = gaps.find(g => g.id === gapId);
    if (!gap) throw new Error(`GapNotFound: ${gapId}`);

    gap.resolved = true;
    gap.answer = answer;
    const gapAnswers = { ...(session.gap_answers_json || {}), [gapId]: answer };
    const allResolved = gaps.every(g => g.resolved);

    if (allResolved) {
      // Apply answers to blueprint and move to arc_review
      const patched = applyGapAnswers(session.blueprint_json, gapAnswers);
      patched._gaps = gaps;
      await updateSession(pool, sessionId, {
        gaps_json: gaps,
        gap_answers_json: gapAnswers,
        blueprint_json: patched,
        status: 'arc_review',
      });
    } else {
      await updateSession(pool, sessionId, { gaps_json: gaps, gap_answers_json: gapAnswers });
    }

    return { resolved: true, allResolved, remainingGaps: gaps.filter(g => !g.resolved).length };
  }

  // ── ARC review (gap-check the current blueprint) ──────────────────────────
  async function runArcReview(sessionId) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) throw new Error('SessionNotFound: ' + sessionId);
    const session = rows[0];
    const blueprint = session.blueprint_json;
    if (!blueprint) throw new Error('NoBlueprintYet: run startBackfill or continueGreenfield first');

    const arcPrompt = `Review this blueprint for gaps. For each step, check:
1. All imports exist in installed_packages
2. All AI calls use valid council aliases (claude, gemini, openai)
3. All DB columns have explicit types and nullability
4. All route behaviors are specific enough to implement without guessing
5. No references to packages that need installation without being listed in packages_to_install

Return JSON:
{
  "critical": [{"step_id":"...","issue":"...","fix":"..."}],
  "moderate": [{"step_id":"...","issue":"...","fix":"..."}],
  "minor": [{"step_id":"...","issue":"...","fix":"..."}],
  "total_critical": N,
  "total_moderate": N,
  "total_minor": N,
  "ready_to_execute": true|false
}`;

    const arcRaw = await callCouncilMember('claude',
      `BLUEPRINT TO REVIEW:\n${JSON.stringify(blueprint, null, 2).slice(0, 12000)}`,
      { systemPrompt: arcPrompt, maxOutputTokens: 3000, taskType: 'general' }
    );
    const arcReport = parseBlueprintFromAiResponse(arcRaw);

    const newStatus = arcReport.ready_to_execute ? 'ready' : 'gap_collection';
    await updateSession(pool, sessionId, { arc_report_json: arcReport, status: newStatus });

    // If ready, write blueprint to disk
    if (arcReport.ready_to_execute && session.amendment_file) {
      const blueprintFile = path.join(ROOT, 'docs/projects',
        path.basename(session.amendment_file).replace('.md', '.blueprint.json'));
      fs.writeFileSync(blueprintFile, JSON.stringify(blueprint, null, 2) + '\n');
      await updateSession(pool, sessionId, { blueprint_file: blueprintFile, status: 'ready' });
    }

    return { arcReport, status: newStatus };
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  async function getSession(sessionId) {
    const { rows } = await pool.query('SELECT * FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
    return rows[0] || null;
  }

  async function listSessions({ status, flowType, limit = 20 } = {}) {
    let sql = 'SELECT id, product_name, flow_type, status, amendment_file, created_at, updated_at FROM blueprint_intake_sessions';
    const params = [];
    const conditions = [];
    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (flowType) { conditions.push(`flow_type = $${params.length + 1}`); params.push(flowType); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY updated_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  return {
    startBackfill,
    startGreenfield,
    continueGreenfield,
    startAdjustment,
    sendGapMessage,
    answerGap,
    runArcReview,
    getSession,
    listSessions,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────
function incrementVersion(v) {
  const parts = String(v).split('.');
  const patch = parseInt(parts[2] || '0', 10) + 1;
  return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
}
