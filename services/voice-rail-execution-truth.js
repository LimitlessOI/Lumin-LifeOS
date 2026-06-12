/**
 * Voice Rail — execution truth enforcement (no background-work theater).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/** Machine-readable operational reality — every reply must align with this. */
export const VOICE_RAIL_EXECUTION_MANIFEST = Object.freeze({
  mode: 'sync_chat_only',
  background_work: false,
  runs_while_operator_offline: false,
  staged_commands_auto_execute: false,
  writes_files_on_chat: false,
  builder_runs_on_chat: false,
  honest_staged_command_meaning:
    'A row in voice_rail_staged_commands (executed=false) — not BTB/Sentry/CBR until builder API runs.',
});

/** Model claims that imply async work, progress, or execution without a receipt. */
const EXECUTION_LIE_PATTERNS = [
  { id: 'background_work', re: /\b(still actively working|actively working on|still working on|i am working on|i'm working on|we are working on|cross-?referenc(?:ing)?|retriev(?:ing)?|aligning the|auditing the|synthesiz)/i },
  { id: 'report_when_done', re: /\b(will report back|report back (to you )?(when|upon|immediately)|upon completion,? i will|as soon as (it|the task) is (done|complete|finished))/i },
  { id: 'in_progress_task', re: /\b(still actively|not yet complete|remains incomplete|alignment (is )?in progress|blueprint (review|alignment).{0,40}in progress)/i },
  { id: 'fake_routing', re: /\b(routed to|forwarded to|assigned to).{0,60}(technical team|BTB|blueprint builder|sentry|CBR|money pod)/i },
  { id: 'fake_pipeline', re: /\b(converted into an executable blueprint|undergo(es)? (automated )?review by sentry|CBR execution phase|operational pipeline)/i },
  { id: 'fake_provision', re: /\b(will stage the command to provision|provision.{0,40}account.{0,40}(for activation|by tomorrow|target completion))/i },
  { id: 'percent_progress', re: /\b(\d{1,3}% (complete|done)|percent complete|making progress on the (blueprint|alignment|audit))/i },
  { id: 'continuing_process_steps', re: /\bcontinuing the (detailed )?(explanation of )?(the )?(blueprint|alignment|audit|process)/i },
  { id: 'initiated_work', re: /\b(i (have )?initiated|i will begin|i'll begin|beginning (this|the) (process|alignment|audit|review))/i },
];

const RECEIPT_IN_REPLY = /\b(job_id|build_run_id|commit[_ ]?sha|[a-f0-9]{7,40}|products\/receipts\/|builderos-reboot\/|\.md written|file path:)/i;

export function detectExecutionLie(replyText) {
  const text = String(replyText || '').trim();
  if (!text) return { lied: false, violations: [] };
  if (RECEIPT_IN_REPLY.test(text)) return { lied: false, violations: [] };

  const violations = [];
  for (const { id, re } of EXECUTION_LIE_PATTERNS) {
    if (re.test(text)) violations.push(id);
  }
  return { lied: violations.length > 0, violations };
}

export function buildExecutionTruthPromptBlock(operatorName = 'Adam') {
  const m = VOICE_RAIL_EXECUTION_MANIFEST;
  return `
EXECUTION TRUTH (constitutional — violating this is a system failure):
- You ONLY run when ${operatorName} sends a message on Voice Rail. NOTHING runs while they sleep. NO background jobs. NO "I am working on it" between messages.
- You CANNOT write files, update blueprints, run builder, deploy, provision accounts, or execute staged commands from chat alone.
- Staged commands = database rows (executed=false). They are NOT routed to BTB/Sentry/CBR until POST /api/v1/lifeos/builder/build (or equivalent) runs and returns a receipt.
- NEVER claim progress, "still working", "will report when done", "in progress", "routed to team", pipeline phases, or % complete unless the context payload includes a concrete receipt (job_id, commit SHA, file path, build ok:true).
- When asked to DO work: say what was staged (if anything) and what API/human step actually executes it — or say nothing was executed this turn.
- When asked for status of prior work: if no receipt in context, answer FAIL — nothing was done — not "still in progress".
- No apologies for failure. No SOT citations to soften failure. Results only: done (with receipt) or not done.
- Read-only context below is memory for THIS chat — not proof that async work happened.`.trim();
}

export function buildExecutionTruthReplacement(operatorName, userQuestion, violations = []) {
  const name = operatorName || 'Adam';
  const q = String(userQuestion || '').trim().slice(0, 200);
  const codes = violations.length ? violations.join(', ') : 'execution_theater';
  return (
    `${name} — TRUTH (reply blocked — model claimed work that did not happen): ` +
    `Voice Rail is sync chat only. Nothing runs between your messages. ` +
    `No files were written, no builder ran, no account was provisioned, staged commands were not executed. ` +
    `Violations: ${codes}. ` +
    (q ? `Your ask: "${q}". ` : '') +
    `To actually execute: use Command Center builder, Cursor conductor, or an API with a receipt — not this chat loop alone.`
  );
}

/**
 * Enforce execution truth on council output.
 * @returns {{ ok: boolean, text: string, violations: string[], replaced: boolean }}
 */
export function enforceExecutionTruth(replyText, userQuestion, operatorName) {
  const { lied, violations } = detectExecutionLie(replyText);
  if (!lied) {
    return { ok: true, text: replyText, violations: [], replaced: false };
  }
  return {
    ok: false,
    text: buildExecutionTruthReplacement(operatorName, userQuestion, violations),
    violations,
    replaced: true,
    manifest: VOICE_RAIL_EXECUTION_MANIFEST,
  };
}
