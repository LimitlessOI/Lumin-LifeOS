/**
 * SYNOPSIS: Founder reply cards — DONE synopsis + bullets, NEXT + why (Chair format).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { shouldUsePersonalLuminCard } from './chair-lumin-personal-mode.js';
import {
  formatDirectConnectionReply,
  formatConversationalLuminReply,
  isDirectLuminConnection,
  scrubCounselTheater,
} from './chair-direct-connection-truth.js';

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
  const clarify = truth.pass_fail === 'CLARIFY';
  const technicalOnly = truth.receipt_truth === 'TECHNICAL_ONLY_AWAITING_FOUNDER';
  const noCommand = truth.command_truth === 'NO_COMMAND_RAN' || truth.pass_fail === 'NO_COMMAND_RAN';
  const icon = pass ? '✅' : running ? '⏳' : clarify ? '🔍' : technicalOnly ? '⏳' : truth.pass_fail === 'FAIL' ? '❌' : noCommand ? '💬' : 'ℹ️';
  const statusLabel = pass ? 'DONE' : running ? 'RUNNING' : clarify ? 'CLARIFY' : technicalOnly ? 'AWAITING FOUNDER' : truth.pass_fail === 'FAIL' ? 'NOT DONE' : noCommand ? 'COUNSEL ONLY' : 'STATUS';
  const action = truth.action || truth.chair_channel || 'response';

  const doneSynopsis = truth.done_synopsis
    || truth.human_summary_card?.done
    || (pass
      ? `Completed ${action.replace(/_/g, ' ')}.`
      : running
        ? `${action.replace(/_/g, ' ')} is running.`
        : technicalOnly
          ? `Machine path ran — founder usability not confirmed yet.`
          : clarify
            ? 'Confirm intent before code runs.'
            : truth.pass_fail === 'FAIL'
            ? `${action.replace(/_/g, ' ')} failed.`
            : noCommand
              ? 'Nothing executed — counsel only.'
              : firstSentence(truth.human_summary) || 'Status update.');

  const doneBullets = truth.done_bullets || truth.human_summary_card?.done_bullets || [];
  if (!doneBullets.length) {
    if (truth.pass_fail) doneBullets.push(`Status: ${truth.pass_fail}`);
    if (truth.chair_channel) doneBullets.push(`Channel: ${truth.chair_channel}`);
    if (truth.execution_kind) doneBullets.push(`Kind: ${truth.execution_kind}`);
    if (truth.command_truth) doneBullets.push(`Command: ${truth.command_truth}`);
    if (truth.receipt_truth) doneBullets.push(`Receipt: ${truth.receipt_truth}`);
    if (truth.transport_status) doneBullets.push(`Transport: ${truth.transport_status}`);
    if (truth.execution_path) doneBullets.push(`Path: ${truth.execution_path}`);
    if (truth.target_file) doneBullets.push(`File: ${truth.target_file}`);
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

  const lines = [`${icon} ${statusLabel}`, doneSynopsis, ...bulletLines(doneBullets, 12)];
  if (nextSynopsis || nextBullets.length || technicalOnly) {
    lines.push(
      '',
      'NEXT',
      nextSynopsis || (technicalOnly ? 'Open LifeRE and confirm daily command center usability.' : 'Continue toward Point B.'),
      ...(nextWhy || technicalOnly ? [`Why: ${nextWhy || 'Machine receipts passed; Alpha requires your YES on founder usability.'}`] : []),
      ...bulletLines(nextBullets),
    );
  }
  return lines.join('\n');
}

export function wrapChairHumanSummary(truth, technicalReply) {
  const commandTruth = truth.command_truth || 'NO_COMMAND_RAN';
  const action = String(truth.action || '');
  const isCounsel = commandTruth === 'NO_COMMAND_RAN'
    && (['lumin', 'chair', 'counsel', 'life_admin'].includes(truth.chair_channel)
      || truth.action === 'lumin'
      || truth.action === 'chair');

  // Soften intent_clarify for the drawer: never dump receipt theater when the
  // user was trying to talk. Prefer the technical clarify body alone if short,
  // else one plain ask.
  if (truth.chair_channel === 'intent_clarify' || truth.action === 'intent_clarify') {
    const scrubbed = scrubCounselTheater(technicalReply || '', commandTruth);
    const body = String(scrubbed || technicalReply || '').trim();
    if (body && !/\bCLARIFY\b/.test(body.slice(0, 40))) return body;
    const qMatch = body.match(/Questions for you:[\s\S]{0,400}/i);
    if (qMatch) return qMatch[0].replace(/^Questions for you:\s*/i, '').trim() || body;
    return body || 'Say that again one notch clearer — what do you want me to answer or do?';
  }

  if (shouldUsePersonalLuminCard(truth)) {
    const scrubbed = scrubCounselTheater(technicalReply || truth.human_summary || '', commandTruth);
    if (isCounsel) {
      return formatConversationalLuminReply(truth, scrubbed);
    }
    return scrubbed;
  }

  if (isCounsel) {
    const scrubbed = scrubCounselTheater(technicalReply || '', commandTruth);
    return isDirectLuminConnection(truth)
      ? formatConversationalLuminReply(truth, scrubbed)
      : formatDirectConnectionReply(truth, scrubbed);
  }

  if (truth.chair_channel === 'system_action' && commandTruth === 'COMMAND_RAN') {
    const card = formatFounderCard({ ...truth, human_summary: technicalReply || truth.human_summary });
    return card;
  }

  if (truth.chair_channel === 'work_execute' && commandTruth === 'COMMAND_RAN') {
    return String(technicalReply || truth.human_summary || '').trim();
  }

  const card = formatFounderCard({ ...truth, human_summary: technicalReply || truth.human_summary });
  const technical = String(technicalReply || '').trim();
  const suppressTechnicalEcho =
    commandTruth === 'COMMITTED' &&
    (action === 'build' || action === 'execute' || action === 'mission_pipeline');
  if (!technical || technical === card) return card;
  if (suppressTechnicalEcho) return card;
  return `${card}\n\n── Technical ──\n${technical}`;
}
