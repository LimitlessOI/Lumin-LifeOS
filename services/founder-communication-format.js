/**
 * SYNOPSIS: Founder reply cards — DONE synopsis + bullets, NEXT + why (Chair format).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function firstSentence(text, max = 160) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/^[^.!?\n]+[.!?]?/);
  const s = (m ? m[0] : t).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function bulletLines(items, max = 5) {
  return (items || []).filter(Boolean).slice(0, max).map((x) => `• ${x}`);
}

export function formatFounderCard(truth = {}) {
  const pass = truth.pass_fail === 'PASS';
  const running = truth.pass_fail === 'RUNNING';
  const icon = pass ? '✅' : running ? '⏳' : truth.pass_fail === 'FAIL' ? '❌' : 'ℹ️';
  const action = truth.action || truth.chair_channel || 'response';

  const doneSynopsis = truth.done_synopsis
    || truth.human_summary_card?.done
    || (pass
      ? `Completed ${action.replace(/_/g, ' ')}.`
      : running
        ? `${action.replace(/_/g, ' ')} is running.`
        : truth.pass_fail === 'FAIL'
          ? `${action.replace(/_/g, ' ')} failed.`
          : firstSentence(truth.human_summary) || 'No command ran — counsel only.');

  const doneBullets = truth.done_bullets || truth.human_summary_card?.done_bullets || [];
  if (!doneBullets.length) {
    if (truth.command_truth) doneBullets.push(`Command: ${truth.command_truth}`);
    if (truth.receipt_truth) doneBullets.push(`Receipt: ${truth.receipt_truth}`);
    if (truth.execution_path) doneBullets.push(`Path: ${truth.execution_path}`);
    if (truth.sha) doneBullets.push(`Commit: ${String(truth.sha).slice(0, 12)}`);
    if (truth.first_blocker && truth.pass_fail === 'FAIL') doneBullets.push(`Blocker: ${truth.first_blocker}`);
    if (truth.point_b?.next_action) doneBullets.push(`Point B next: ${truth.point_b.next_action}`);
  }

  const nextSynopsis = truth.next_synopsis
    || truth.human_summary_card?.next
    || (truth.point_b?.blocker && !pass ? firstSentence(truth.point_b.blocker) : null)
    || (truth.pass_fail === 'FAIL' && truth.first_blocker ? `Fix: ${firstSentence(truth.first_blocker)}` : null);

  const nextWhy = truth.next_why || truth.human_summary_card?.next_why
    || (truth.point_b?.founder_success_test && truth.point_b?.next_action === 'founder_usability_check'
      ? 'Machine path done — your usability YES/NO closes Alpha.'
      : null);

  const nextBullets = truth.next_bullets || truth.human_summary_card?.next_bullets || [];
  if (!nextBullets.length && truth.point_b?.next_script) {
    nextBullets.push(truth.point_b.next_script);
  }

  const lines = [`${icon} DONE`, doneSynopsis, ...bulletLines(doneBullets)];
  if (nextSynopsis || nextBullets.length) {
    lines.push('', 'NEXT', nextSynopsis || 'Continue toward Point B.', ...(nextWhy ? [`Why: ${nextWhy}`] : []), ...bulletLines(nextBullets));
  }
  return lines.join('\n');
}

export function wrapChairHumanSummary(truth, technicalReply) {
  const card = formatFounderCard({ ...truth, human_summary: technicalReply || truth.human_summary });
  const technical = String(technicalReply || '').trim();
  if (!technical || technical === card) return card;
  return `${card}\n\n── Technical ──\n${technical}`;
}
