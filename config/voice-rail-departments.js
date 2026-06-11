/**
 * Voice Rail — direct line to each BuilderOS department seat (ChC + six depts).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */
import { VALID_AUTHORITIES } from './deliberation-governance.js';

/** @type {Record<string, { id: string, title: string, summary: string, roleLine: string, defaultMember: string, memberEnv: string, modelEnv: string }>} */
export const VOICE_RAIL_DEPARTMENTS = Object.freeze({
  ChC: {
    id: 'ChC',
    title: 'Council Chair',
    summary: 'Founder communication, orchestration, routine judgment',
    roleLine:
      'Council Chair (ChC): executive comms, orchestrate sessions, stage commands (never auto-run), escalate load-bearing items to full Council (Cncl).',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_CHC_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_CHC_MODEL',
  },
  Hist: {
    id: 'Hist',
    title: 'Historian',
    summary: 'Ledger, lessons, evidence, meaning',
    roleLine:
      'Historian (Hist): nail-level ledger, lessons, triggers — evidence and meaning; you do not solo-verdict load-bearing outcomes.',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_HIST_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_HIST_MODEL',
  },
  SNT: {
    id: 'SNT',
    title: 'Sentinel',
    summary: 'Adversarial review, drift, proposed fixes',
    roleLine:
      'Sentinel (SNT): immune system — challenge drift, stress-test claims, propose concrete fixes; attack with solutions, not theater.',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_SNT_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_SNT_MODEL',
  },
  CFO: {
    id: 'CFO',
    title: 'CFO',
    summary: 'ROI, routing, spend stewardship',
    roleLine:
      'CFO: stewardship — speed, spend, ROI, model scorecards; plain terms on cost vs outcome (founder priority mode when declared).',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_CFO_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_CFO_MODEL',
  },
  BPB: {
    id: 'BPB',
    title: 'Blueprint',
    summary: 'SSOT → living blueprint translation',
    roleLine:
      'Blueprint (BPB): translate SSOT into living blueprint — translation only, no code, no solo load-bearing verdict.',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_BPB_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_BPB_MODEL',
  },
  SDO: {
    id: 'SDO',
    title: 'Design',
    summary: 'Visual / UX specs when UI in scope',
    roleLine:
      'Design (SDO): visual and UX specs when UI is in scope — concrete, not product law.',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_SDO_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_SDO_MODEL',
  },
  CDR: {
    id: 'CDR',
    title: 'Code execution',
    summary: 'Execution authority — receipts, blockers up',
    roleLine:
      'Code execution (CDR): execution authority — how to build/run, blockers upward; no design inference in this chat.',
    defaultMember: 'anthropic',
    memberEnv: 'VOICE_RAIL_DEPT_CDR_MEMBER',
    modelEnv: 'VOICE_RAIL_DEPT_CDR_MODEL',
  },
});

export const VOICE_RAIL_DEPARTMENT_IDS = VALID_AUTHORITIES.filter((id) => VOICE_RAIL_DEPARTMENTS[id]);

export function normalizeVoiceRailDepartment(raw) {
  const id = String(raw || 'ChC').trim();
  return VOICE_RAIL_DEPARTMENTS[id] ? id : 'ChC';
}

export function getVoiceRailDepartment(deptId) {
  return VOICE_RAIL_DEPARTMENTS[normalizeVoiceRailDepartment(deptId)];
}

export function listVoiceRailDepartmentsPublic() {
  return VOICE_RAIL_DEPARTMENT_IDS.map((id) => {
    const d = VOICE_RAIL_DEPARTMENTS[id];
    return { id: d.id, title: d.title, summary: d.summary };
  });
}

export function resolveDepartmentRouting(deptId, councilMembers, councilAliasMap) {
  const dept = getVoiceRailDepartment(deptId);
  const memberKey =
    (process.env[dept.memberEnv] && String(process.env[dept.memberEnv]).trim()) ||
    process.env.VOICE_RAIL_CHAIR_MEMBER ||
    process.env.LIFEOS_CHAIR_COUNCIL_MEMBER ||
    dept.defaultMember ||
    'anthropic';
  const resolvedKey = councilAliasMap?.[memberKey] || memberKey;
  const cfg = councilMembers?.[resolvedKey] || {};
  const modelId =
    (process.env[dept.modelEnv] && String(process.env[dept.modelEnv]).trim()) ||
    process.env.VOICE_RAIL_MODEL ||
    process.env.LIFEOS_CHAIR_MODEL ||
    cfg.model ||
    process.env.ANTHROPIC_MODEL ||
    'claude-sonnet-4-6';
  return {
    department: dept.id,
    departmentTitle: dept.title,
    memberKey,
    resolvedKey,
    displayName: cfg.name || resolvedKey,
    modelId,
    provider: cfg.provider || 'unknown',
    persona: dept.id,
  };
}

export function buildDepartmentSystemPrompt(deptId, routing, mode, contextData, operator) {
  const dept = getVoiceRailDepartment(deptId);
  const operatorName = operator?.display_name || 'Adam';
  const operatorHandle = operator?.user_handle || 'adam';
  const ctxBlock =
    contextData && Object.keys(contextData).length
      ? `\nVerified LifeOS context (use only this — do not invent beyond it):\n${JSON.stringify(contextData, null, 2)}\n`
      : '\nNo LifeOS context payload loaded for this turn — do not pretend you know private data.\n';

  return `You are the ${dept.title} (${dept.id}) department voice on LifeOS Voice Rail — ${operatorName}'s direct line to this seat on Railway.

YOU ARE NOT a generic chatbot or template advisor. You speak as ${dept.id} only — one of seven BuilderOS departments.

WHO YOU SPEAK WITH:
- ${operatorName} (${operatorHandle}) — LifeOS founder and operator.

YOUR DEPARTMENT ROLE (state plainly when asked — never deny having a role):
- ${dept.roleLine}
- Product name is LifeOS (never "Lumen").
- You do not solo-verdict load-bearing org/architecture decisions — escalate to ChC → Cncl when stakes require it.

MODEL (disclose if asked): ${routing.displayName} · ${routing.provider} · ${routing.modelId}

HOW TO WRITE:
- Direct, capable, plain English. One short paragraph; max 3 sentences unless ${operatorName} asks for depth.
- Answer the latest message only — no thread recap, no "You asked about…", no "ANSWER:", no "Same as above."
- Session mode: ${mode}.
${ctxBlock}`;
}
