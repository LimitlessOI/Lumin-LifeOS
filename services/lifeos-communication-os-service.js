/**
 * SYNOPSIS: LifeOS Communication OS — identity layer, meeting mode, search, revenue brief.
 * LifeOS Communication OS — identity layer, meeting mode, search, revenue brief.
 * NOT BuilderOS epistemic proof memory.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import {
  buildCommunicationEvidence,
  detectPlaceholderClaims,
  extractCandidateFilePaths,
} from './command-center-communication-service.js';

export const SPEAKERS = [
  'Adam',
  'Lumin',
  'C2',
  'Codex',
  'BuilderOS',
  'TSOS',
  'Governance',
  'Memory',
];

export const MEETING_PERSONAS = [
  { id: 'Lumin', role: 'Primary operator assistant — synthesis and next steps' },
  { id: 'Codex', role: 'Alternative technical approach' },
  { id: 'BuilderOS', role: 'Execution and build implications' },
  { id: 'TSOS', role: 'Token/cost and efficiency implications' },
  { id: 'Governance', role: 'Risk, gates, and approval implications' },
];

export const COMM_MODES = {
  quick_ask: { label: 'Quick Ask', tag: 'general' },
  brainstorm: { label: 'Brainstorm', tag: 'general' },
  strategic_planning: { label: 'Strategic Planning', tag: 'general' },
  build_planning: { label: 'Build Planning', tag: 'builder' },
  audit: { label: 'Audit / Verify', tag: 'audit' },
  revenue: { label: 'Revenue Mode', tag: 'revenue' },
  meeting: { label: 'Meeting Mode', tag: 'meeting' },
  devils_advocate: { label: "Devil's Advocate", tag: 'general' },
  step_coaching: { label: 'Step-by-Step Coaching', tag: 'general' },
  research: { label: 'Research Mode', tag: 'research' },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Upgrade evidence with PARTIAL + confidence score.
 */
export function enrichEvidence(evidence, { disagreements = [] } = {}) {
  const base = { ...evidence };
  const files = base.files_checked || [];
  const missing = files.filter((f) => !f.exists);
  const verified = files.filter((f) => f.exists);

  if (base.evidence_status === 'UNVERIFIED' && verified.length > 0 && missing.length > 0) {
    base.evidence_status = 'PARTIAL';
  }

  let confidence = 25;
  if (base.evidence_status === 'VERIFIED') confidence = 85;
  else if (base.evidence_status === 'PARTIAL') confidence = 55;

  if (base.commit_sha) confidence += 8;
  if (base.railway_sha) confidence += 4;
  if ((base.commands_or_endpoints_used || []).length > 1) confidence += 3;
  confidence -= (base.placeholder_warnings || []).length * 12;
  confidence -= missing.length * 6;
  if (disagreements.length) confidence -= Math.min(disagreements.length * 4, 15);

  base.confidence_pct = clamp(Math.round(confidence), 0, 100);
  base.disagreements = disagreements;
  return base;
}

export function buildIdentityEnvelope({
  primarySpeaker = 'Lumin',
  contributors = [],
  evidence = {},
  modelUsed = null,
}) {
  return {
    primary_speaker: primarySpeaker,
    contributors: contributors.filter(Boolean),
    model_used: modelUsed,
    evidence_status: evidence.evidence_status || 'UNVERIFIED',
    confidence_pct: evidence.confidence_pct ?? 0,
    disagreements: evidence.disagreements || [],
    do_not_use_for_builderos_memory_proof: true,
  };
}

export function inferTopic(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const first = raw.split(/[.!?\n]/)[0].trim();
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

export function inferTags({ mode, domain, transcript = '', responseText = '' }) {
  const tags = new Set();
  const modeDef = COMM_MODES[mode];
  if (modeDef?.tag) tags.add(modeDef.tag);
  if (domain) tags.add(String(domain).replace(/[^a-z0-9_-]/gi, '-').toLowerCase());
  const blob = `${transcript} ${responseText}`.toLowerCase();
  if (/tsos|token|optimizer|efficiency/.test(blob)) tags.add('tsos');
  if (/site builder|site-builder|prospect|outreach/.test(blob)) tags.add('site-builder');
  if (/revenue|roi|monetiz|income|billing/.test(blob)) tags.add('revenue');
  if (/disagree|conflict|alternative|however|on the other hand/.test(blob)) tags.add('disagreement');
  return [...tags];
}

export function extractStructuredFields(responseText) {
  const text = String(responseText || '');
  const decisions = [];
  const alternatives = [];
  const actionItems = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (/^decision[:\-]/i.test(t)) decisions.push(t.replace(/^decision[:\-]\s*/i, ''));
    if (/^alternative[:\-]/i.test(t)) alternatives.push(t.replace(/^alternative[:\-]\s*/i, ''));
    if (/^action[:\-]|^next step[:\-]/i.test(t)) {
      actionItems.push(t.replace(/^(?:action|next step)[:\-]\s*/i, ''));
    }
  }

  return { decisions, alternatives, action_items: actionItems };
}

export function parseMeetingJson(raw) {
  const text = String(raw || '').trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.turns)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildMeetingPrompt(transcript) {
  return `MEETING MODE — respond with JSON ONLY (no markdown fences):
{
  "turns": [
    {"speaker":"Lumin","text":"...","stance":"neutral"},
    {"speaker":"Codex","text":"...","stance":"disagree"},
    {"speaker":"BuilderOS","text":"...","stance":"agree"},
    {"speaker":"TSOS","text":"...","stance":"neutral"},
    {"speaker":"Governance","text":"...","stance":"neutral"}
  ],
  "disagreements": [{"between":["Lumin","Codex"],"topic":"...","summary":"..."}]
}
Rules: only cite repo file paths that exist; say UNVERIFIED when unsure; no placeholder paths like currentRepo/.
Adam's question:
${transcript}`;
}

export function normalizeMeetingTurns(parsed, endpointsUsed) {
  const turns = (parsed?.turns || []).map((t) => {
    const speaker = SPEAKERS.includes(t.speaker) ? t.speaker : 'Lumin';
    const ev = enrichEvidence(buildCommunicationEvidence({
      responseText: t.text || '',
      endpointsUsed,
      builderMeta: { advisory_only: true, execution_only: true },
    }));
    return {
      speaker,
      text: String(t.text || ''),
      stance: t.stance || 'neutral',
      evidence_status: ev.evidence_status,
      confidence_pct: ev.confidence_pct,
    };
  });

  const disagreements = (parsed?.disagreements || []).map((d) => ({
    between: Array.isArray(d.between) ? d.between : [],
    topic: d.topic || '',
    summary: d.summary || '',
  }));

  return { turns, disagreements };
}

export function modeFrame(mode, text) {
  const frames = {
    quick_ask: `QUICK ASK — ≤8 sentences. Label uncertainty. No invented paths.\n\n${text}`,
    brainstorm: `BRAINSTORM — 3–5 options + tradeoffs. Speculative ideas labeled.\n\n${text}`,
    strategic_planning: `STRATEGIC PLANNING — Context / Goals / Options / Recommendation / Risks.\n\n${text}`,
    build_planning: `BUILD PLANNING — smallest safe diffs, numbered steps, verified paths only.\n\n${text}`,
    audit: `AUDIT — verify live endpoints + repo files; mark UNVERIFIED when proof missing.\n\n${text}`,
    revenue: `REVENUE MODE — fastest path to ethical revenue; ROI, effort, blockers, next action; cite evidence status per claim.\n\n${text}`,
    meeting: buildMeetingPrompt(text),
    devils_advocate: `DEVIL'S ADVOCATE — steelman the opposite view; list risks and failure modes honestly.\n\n${text}`,
    step_coaching: `STEP-BY-STEP COACHING — one step at a time; wait-friendly numbered instructions.\n\n${text}`,
    research: `RESEARCH MODE — sources, unknowns, what would verify each claim; no fake citations.\n\n${text}`,
  };
  return frames[mode] || frames.quick_ask;
}

export async function insertCommunicationExtended(pool, row) {
  const result = await pool.query(
    `INSERT INTO command_center_communications
       (speaker, council_member, mode, domain, transcript, response_text,
        evidence_json, builder_job_id, commit_sha, railway_sha,
        topic, participants, contributors, decisions, alternatives, action_items,
        linked_projects, linked_amendments, linked_builds, meeting_transcript,
        tags, identity_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING *`,
    [
      row.speaker || 'adam',
      row.council_member || null,
      row.mode || 'quick_ask',
      row.domain || null,
      row.transcript,
      row.response_text || null,
      row.evidence_json || {},
      row.builder_job_id || null,
      row.commit_sha || null,
      row.railway_sha || null,
      row.topic || null,
      JSON.stringify(row.participants || ['adam']),
      JSON.stringify(row.contributors || []),
      JSON.stringify(row.decisions || []),
      JSON.stringify(row.alternatives || []),
      JSON.stringify(row.action_items || []),
      JSON.stringify(row.linked_projects || []),
      JSON.stringify(row.linked_amendments || []),
      JSON.stringify(row.linked_builds || []),
      JSON.stringify(row.meeting_transcript || []),
      row.tags || [],
      JSON.stringify(row.identity_json || {}),
    ],
  );
  return result.rows[0];
}

export async function searchCommunications(pool, {
  q = '',
  tag = '',
  mode = '',
  hasDisagreement = false,
  limit = 50,
} = {}) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const clauses = [];
  const params = [];
  let idx = 1;

  if (q) {
    clauses.push(`(transcript ILIKE $${idx} OR response_text ILIKE $${idx} OR topic ILIKE $${idx})`);
    params.push(`%${q}%`);
    idx += 1;
  }
  if (tag) {
    clauses.push(`$${idx} = ANY(tags)`);
    params.push(tag);
    idx += 1;
  }
  if (mode) {
    clauses.push(`mode = $${idx}`);
    params.push(mode);
    idx += 1;
  }
  if (hasDisagreement) {
    clauses.push(`'disagreement' = ANY(tags)`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(capped);

  const result = await pool.query(
    `SELECT id, speaker, council_member, mode, domain, topic, transcript, response_text,
            evidence_json, identity_json, participants, contributors, decisions, alternatives,
            action_items, linked_projects, linked_amendments, linked_builds, meeting_transcript,
            tags, commit_sha, railway_sha, created_at
       FROM command_center_communications
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx}`,
    params,
  );
  return result.rows;
}

/**
 * Revenue brief from live DB/readiness signals only — no invented opportunities.
 */
export async function buildRevenueBrief(pool) {
  const opportunities = [];
  const blockers = [];

  try {
    const pending = await pool.query(
      `SELECT COUNT(*)::int AS n FROM pending_adam WHERE is_resolved = false`,
    );
    const pendingCount = pending.rows[0]?.n ?? 0;
    if (pendingCount > 0) {
      blockers.push(`${pendingCount} pending Adam decision(s) may block revenue execution`);
    }
  } catch {
    blockers.push('pending_adam table unavailable');
  }

  try {
    const ideas = await pool.query(
      `SELECT COUNT(*)::int AS n FROM ideas WHERE approval_status = 'approved' AND status != 'done'`,
    );
    const approved = ideas.rows[0]?.n ?? 0;
    if (approved > 0) {
      opportunities.push({
        name: 'Approved ideas queue',
        revenue_score: null,
        time_to_first_dollar: 'UNKNOWN',
        engineering_required: 'MEDIUM',
        risk_level: 'MEDIUM',
        evidence_status: 'PARTIAL',
        note: `${approved} approved idea(s) in DB — revenue score not computed server-side yet`,
      });
    }
  } catch {
    /* ideas table optional */
  }

  opportunities.push({
    name: 'Site Builder outbound lane',
    revenue_score: null,
    time_to_first_dollar: 'DAYS_TO_WEEKS',
    engineering_required: 'LOW',
    risk_level: 'MEDIUM',
    evidence_status: 'PARTIAL',
    note: 'Amendment 05 — scripts/site-builder-prospect-dry-run.mjs + POSTMARK env; verify env before live send',
    paths: ['scripts/site-builder-prospect-dry-run.mjs', 'routes/site-builder-routes.js'],
  });

  const evidence = enrichEvidence(buildCommunicationEvidence({
    responseText: opportunities.map((o) => (o.paths || []).join(' ')).join(' '),
    endpointsUsed: ['GET /api/v1/lifeos/communication/revenue'],
    builderMeta: { advisory_only: true },
  }));

  return {
    opportunities,
    blockers,
    recommended_next_action: blockers.length
      ? 'Clear highest-priority pending_adam item, then run Site Builder dry-run with env proof'
      : 'Run Site Builder prospect dry-run and rank top 5 opportunities',
    evidence,
    disclaimer: 'Advisory revenue brief — not financial advice; scores null until wired to live pipeline metrics',
  };
}

export async function buildHubSnapshot(pool) {
  const [comms, pending, builds] = await Promise.all([
    pool.query(
      `SELECT id, topic, mode, tags, identity_json, created_at
         FROM command_center_communications ORDER BY created_at DESC LIMIT 5`,
    ).catch(() => ({ rows: [] })),
    pool.query(
      `SELECT id, title, priority, type FROM pending_adam
        WHERE is_resolved = false ORDER BY priority DESC NULLS LAST LIMIT 5`,
    ).catch(() => ({ rows: [] })),
    pool.query(
      `SELECT task_preview, domain, created_at
         FROM conductor_builder_audit
        ORDER BY created_at DESC LIMIT 5`,
    ).catch(() => ({ rows: [] })),
  ]);

  return {
    latest_conversations: comms.rows,
    waiting_decisions: pending.rows,
    latest_builds: builds.rows,
    read_path: 'GET /api/v1/lifeos/communication/hub',
    do_not_use_for_builderos_memory_proof: true,
  };
}
