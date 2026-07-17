/**
 * SYNOPSIS: Governance / SSOT / North Star asks — clarify layer + right-way routing.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { paraphraseFounderAsk } from './founder-intent-clarify.js';

const GOVERNANCE_MARKERS = /\b(north star|nssot|ssot|source of truth|constitution|constitutional|amendment|protocol|doctrine|gate-change|gate change|change receipt|bp priority|founder packet|article vii|companion|zero.degree|hist domain|pssot|bpsync|governance|separation of powers|pipeline law|dual.?judge|honesty grade|trust levels?|not_on_blueprint|blueprint law)\b/i;

/** Counsel about pipeline / dual-judge / constitution — never intake_blueprint theater. */
export function isPipelineGovernanceCounsel(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/\b(governance|constitution|constitutional|separation of powers|pipeline law|dual.?judge|honesty|trust levels?|not_on_blueprint|blueprint law|ratify|enforceable)\b/i.test(t)) {
    return true;
  }
  if (/\b(digital twin|architect|factory)\b/i.test(t) && /\b(law|mandate|must|never redefine|judge|grade|receipt)\b/i.test(t)) {
    return true;
  }
  return false;
}
const CHANGE_MARKERS = /\b(change|update|add|remove|amend|fix|implement|set|encode|write|merge|ship|make|need|should be|must be|new rule|new law)\b/i;
const EXPLAIN_ONLY = /\b(what is|what are|explain|tell me about|where is|how does|summarize)\b/i;

export function isGovernanceOrSsotIntent(text = '') {
  const t = String(text || '').trim();
  if (!GOVERNANCE_MARKERS.test(t)) return false;
  if (EXPLAIN_ONLY.test(t) && !CHANGE_MARKERS.test(t)) return false;
  return CHANGE_MARKERS.test(t) || /\b(law|rule|protocol|doctrine|receipt row)\b/i.test(t);
}

export function inferGovernanceAmendment(text = '') {
  const t = String(text || '');
  const m = t.match(/\bAMENDMENT[_\s-]?(\d+)\b/i) || t.match(/\bamendment\s+(\d+)\b/i);
  if (m) return `docs/projects/AMENDMENT_${String(m[1]).padStart(2, '0')}_*.md (verify exact file)`;
  if (/lifeos|lumin|chair|founder interface/i.test(t)) return 'docs/products/lifeos/PRODUCT_HOME.md';
  if (/builder|builderos|c2|command control/i.test(t)) return 'docs/products/builderos/PRODUCT_HOME.md + owning amendment';
  if (/north star|nssot|constitution/i.test(t)) return 'docs/constitution/NORTH_STAR_SSOT.md (full read before any edit — Article VII path)';
  return null;
}

function governancePathOptions(text) {
  const amendmentHint = inferGovernanceAmendment(text);
  return [
    {
      id: 'A',
      label: 'Product / runtime behavior (code, routes, UI)',
      channel: 'build_async',
      right_way: [
        'Use the builder path: named target_file + scoped patch.',
        'After commit: update owning amendment ## Change Receipts + @ssot on touched .js files.',
        'Not for changing constitutional law text.',
      ],
    },
    {
      id: 'B',
      label: 'Operational truth only (Change Receipts, handoff, continuity — no law rewrite)',
      channel: 'counsel',
      right_way: [
        amendmentHint ? `Append a new row to ## Change Receipts in ${amendmentHint}` : 'Identify owning amendment first (AMENDMENT_21 for LifeOS lane).',
        'Update docs/CONTINUITY_LOG.md — append only, never erase history.',
        'No NSSOT merge; no gate removal.',
      ],
    },
    {
      id: 'C',
      label: 'Load-bearing rule / gate / process change (needs council debate)',
      channel: 'gate_change',
      right_way: [
        'Run recorded council: npm run lifeos:gate-change-run -- --preset maturity (or POST /api/v1/lifeos/gate-change/run-preset).',
        'Read prompts/lifeos-gate-change-proposal.md + AMENDMENT_01 gate-change subsection.',
        'Receipt + SSOT update before removing or weakening any gate.',
      ],
    },
    {
      id: 'D',
      label: 'Constitutional / North Star / NSSOT text change',
      channel: 'counsel',
      right_way: [
        'Read entire docs/constitution/NORTH_STAR_SSOT.md in session before writing (SSOT READ-BEFORE-WRITE).',
        'Draft standalone amendment doc — do NOT silently edit supreme law.',
        'Article VII path + AI Council debate; founder authorization required before merge.',
      ],
    },
    {
      id: 'E',
      label: 'Priority / queue / what we build next (machine layer)',
      channel: 'counsel',
      right_way: [
        'Active queue: builderos-reboot/BP_PRIORITY.json (machine — not Hist).',
        'Product registry: docs/products/INDEX.md + docs/products/[product].md CURRENT BP.',
        'Legacy artifacts: Hist read/salvage only per prompts/00-HIST-LEGACY-BOUNDARY.md.',
      ],
    },
  ];
}

/**
 * @returns {{ needs_clarify: boolean, domain: string, paraphrase: string, assumptions: string[], options: object[] }}
 */
export function assessGovernanceClarity(cleanedInput = '') {
  const text = String(cleanedInput || '').trim();
  const assumptions = [];
  const amendmentHint = inferGovernanceAmendment(text);

  assumptions.push('Governance ask detected — changing law, protocol, or SSOT is not the same as shipping code.');
  if (amendmentHint) {
    assumptions.push(`You may mean ${amendmentHint} — I will not edit until you pick the right layer.`);
  } else {
    assumptions.push('No owning amendment named — I would have to guess LifeOS (21) vs BuilderOS vs NSSOT.');
  }
  if (/\b(remove|delete|skip|disable)\b.*\b(gate|hook|verify|preflight)\b/i.test(text)) {
    assumptions.push('Gate removal is load-bearing — council gate-change required, not a casual code patch.');
  }
  if (/\bnorth star|nssot\b/i.test(text) && /\b(change|update|rewrite)\b/i.test(text)) {
    assumptions.push('North Star / NSSOT edits are one-way-door — wrong layer causes constitutional drift.');
  }

  return {
    needs_clarify: true,
    domain: 'governance_ssot',
    paraphrase: paraphraseFounderAsk(text),
    assumptions,
    options: governancePathOptions(text),
    inferred_amendment: amendmentHint,
  };
}

export function formatGovernanceClarifySummary(clarity = {}) {
  const lines = [
    '🔍 CLARIFY — GOVERNANCE / SSOT / PROTOCOL',
    clarity.paraphrase || '',
    '',
    'This touches source-of-truth layers. Assumptions I refuse to make silently:',
    ...(clarity.assumptions || []).map((a) => `• ${a}`),
    '',
    'How we can do what you want — pick the RIGHT layer:',
  ];
  for (const opt of clarity.options || []) {
    lines.push('', `  ${opt.id}) ${opt.label}`);
    for (const step of opt.right_way || []) {
      lines.push(`     → ${step}`);
    }
  }
  lines.push(
    '',
    'Nothing executes until you confirm. Reply *confirm A** (or B/C/D/E) — or rewrite with the layer explicit.',
    'Wrong layer = theater (code change when you meant law, or law edit without council).',
  );
  return lines.join('\n');
}

export function parseGovernanceConfirmChoice(text = '') {
  const t = String(text || '').trim();
  const m = t.match(/\bconfirm\s+([abcde])\b/i) || t.match(/^([abcde])\s*[—:-]/i);
  if (!m) return null;
  return String(m[1]).toUpperCase();
}