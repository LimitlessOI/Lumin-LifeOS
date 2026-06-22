/**
 * SYNOPSIS: Detect ambiguous founder build asks — paraphrase, assumptions, confirm before execute.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import {
  extractTargetFileFromInstruction,
  isCssOnlyUiFeedback,
  resolveFounderBuildTarget,
} from './builder-instruction-target.js';
import { expandFounderBuildTask } from './founder-chair-intent.js';

const OUTCOME_MARKERS = /\b(so that|when i|on open|when open|visible|show|load|auto-?load|fix|error|broken|not working|daily|top-?3|debrief|color|yellow|nav|strip|button|wire|connect|working|usability)\b/i;
const BUILD_VERB = /\b(fix|change|update|add|remove|create|make|build|implement|wire|ship|get it working|make it work)\b/i;

export function isFounderConfirmIntent(text = '') {
  const t = String(text || '').trim();
  if (/^confirm\b/i.test(t)) return true;
  if (/^(yes|yep|do it|build it|proceed|go ahead|option [abc123]|#[123])\b/i.test(t)) return true;
  return /\b(confirm intent|yes build|yes — build|approved — build)\b/i.test(t);
}

export function paraphraseFounderAsk(text = '') {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'You sent an empty request.';
  if (t.length <= 220) return `You asked: "${t}"`;
  return `You asked: "${t.slice(0, 217)}…"`;
}

function defaultLifeREOptions(text) {
  return [
    {
      id: 'A',
      label: 'Patch LifeRE overlay only (`public/overlay/lifeos-lifere.html`)',
      channel: 'build_async',
      suggested_task: expandFounderBuildTask(text),
    },
    {
      id: 'B',
      label: 'Patch LifeOS app shell + LifeRE nav (`public/overlay/lifeos-app.html`)',
      channel: 'build_async',
      suggested_task: expandFounderBuildTask(`${text}\ntarget_file: public/overlay/lifeos-app.html`),
    },
    {
      id: 'C',
      label: 'BoldTrail / API layer (routes + services, not just HTML)',
      channel: 'build_async',
      suggested_task: `${text}\ntarget_file: services/lifere-boldtrail-bridge.js\nGAP-FILL scoped patch ONLY.`,
    },
  ];
}

function pointBAmbiguityOptions(text) {
  return [
    {
      id: 'A',
      label: 'Execute code change toward what I described (builder commit)',
      channel: 'build_async',
      suggested_task: expandFounderBuildTask(text),
    },
    {
      id: 'B',
      label: 'Receipt scan only — check machine path, no code commit',
      channel: 'mission_pipeline',
    },
    {
      id: 'C',
      label: 'Founder usability test only — I will open LifeRE and say PASS/FAIL',
      channel: 'point_b',
    },
  ];
}

/**
 * @returns {{ needs_clarify: boolean, paraphrase: string, assumptions: string[], options: object[], inferred_target: string|null }}
 */
export function assessFounderBuildClarity(cleanedInput = '', expandedTask = '') {
  const text = String(cleanedInput || '').trim();
  const task = String(expandedTask || text).trim();
  const explicitPath = extractTargetFileFromInstruction(text);
  const targetInTask = task.match(/target_file:\s*(\S+)/i)?.[1]?.replace(/^\//, '');
  const resolvedTarget = targetInTask || explicitPath || resolveFounderBuildTarget(task) || resolveFounderBuildTarget(text);

  const assumptions = [];
  const options = [];

  if (isCssOnlyUiFeedback(text) && resolvedTarget?.includes('.css')) {
    return { needs_clarify: false, paraphrase: paraphraseFounderAsk(text), assumptions: [], options: [], inferred_target: resolvedTarget };
  }

  if (explicitPath && OUTCOME_MARKERS.test(text)) {
    return { needs_clarify: false, paraphrase: paraphraseFounderAsk(text), assumptions: [], options: [], inferred_target: explicitPath };
  }

  if (resolvedTarget && !explicitPath) {
    assumptions.push(`Assumption: I would edit \`${resolvedTarget}\` — you did not name a file.`);
  }

  if (!OUTCOME_MARKERS.test(text) && BUILD_VERB.test(text)) {
    assumptions.push('Assumption: success criteria are unclear — I do not know what "done" looks like yet.');
  }

  if (/\b(point b|alpha)\b/i.test(text) && !/\b(receipt|pipeline|scan|usability pass|founder test)\b/i.test(text)) {
    assumptions.push('Assumption: "Point B / Alpha" could mean code change, receipt scan, or your manual usability test.');
    options.push(...pointBAmbiguityOptions(text));
  } else if (/\b(lifere|life-?re)\b/i.test(text) && !explicitPath) {
    assumptions.push('Assumption: "LifeRE" could mean the LifeRE page, the app shell, or BoldTrail wiring.');
    if (!options.length) options.push(...defaultLifeREOptions(text));
  }

  if (!resolvedTarget && BUILD_VERB.test(text)) {
    assumptions.push('Assumption: no target file detected — I cannot commit code without knowing which surface to patch.');
    options.push({
      id: 'A',
      label: 'LifeRE daily command page',
      channel: 'build_async',
      suggested_task: expandFounderBuildTask(`${text}\nLifeRE overlay`),
    });
    options.push({
      id: 'B',
      label: 'Lumin / lifeos-app shell',
      channel: 'build_async',
      suggested_task: expandFounderBuildTask(`${text}\nlifeos-app shell`),
    });
  }

  const needs_clarify = assumptions.length > 0 && (
    assumptions.length >= 2
    || (resolvedTarget && !explicitPath)
    || !resolvedTarget
  );

  return {
    needs_clarify,
    paraphrase: paraphraseFounderAsk(text),
    assumptions,
    options: options.slice(0, 4),
    inferred_target: resolvedTarget || null,
  };
}

export function formatClarifySummary(clarity = {}) {
  const lines = [
    '🔍 CLARIFY BEFORE BUILD',
    clarity.paraphrase || '',
    '',
    'Assumptions I would make unless you correct me:',
    ...(clarity.assumptions || []).map((a) => `• ${a}`),
  ];
  if (clarity.options?.length) {
    lines.push('', 'Pick one (reply with A, B, or C — or rewrite the ask):');
    for (const opt of clarity.options) {
      lines.push(`  ${opt.id}) ${opt.label}`);
    }
  }
  lines.push('', 'Nothing runs until you confirm. Reply **confirm** + your choice, or set `confirm_intent: true` with a clearer ask.');
  return lines.filter(Boolean).join('\n');
}
