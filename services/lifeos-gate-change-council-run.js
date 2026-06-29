/**
 * SYNOPSIS: Shared multi-model gate-change debate (round 1 + opposite-argument round 2 +
 * Shared multi-model gate-change debate (round 1 + opposite-argument round 2 +
 * future-back review).
 * Used by routes/lifeos-gate-change-routes.js — runs on the **server** where
 * callCouncilMember and provider keys already exist (e.g. Railway).
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { parseCouncilVerdict } from './lifeos-gate-change-proposals.js';

const DEFAULT_CONSENSUS_MODELS = ['gemini_flash', 'groq_llama', 'deepseek'];

function normalizeVerdict(v) {
  const n = String(v || '').toUpperCase();
  if (['APPROVE', 'REJECT', 'DEFER', 'UNKNOWN'].includes(n)) return n;
  return 'UNKNOWN';
}

function countVerdicts(entries) {
  const counts = { APPROVE: 0, REJECT: 0, DEFER: 0, UNKNOWN: 0 };
  for (const e of entries || []) counts[normalizeVerdict(e?.verdict)] += 1;
  return counts;
}

export function summarizeConsensus(entries) {
  const counts = countVerdicts(entries);
  const total = Math.max(1, entries.length);
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [winner, votes] = ordered[0];
  const unanimous = votes === total;
  const majority = votes >= Math.ceil(total / 2);
  const reached = unanimous || majority;
  return {
    reached,
    unanimous,
    final_verdict: reached ? winner : 'DEFER',
    vote_counts: counts,
    summary: reached
      ? `${winner} (${votes}/${total} votes${unanimous ? ', unanimous' : ''})`
      : `No consensus after opposite-argument round; default DEFER (${JSON.stringify(counts)})`,
  };
}

/**
 * @param {string[]|undefined} explicitModels
 * @param {(taskType: string) => string | null} [getModelForTask]
 */
export function resolveMemberKeys(explicitModels, getModelForTask) {
  const g = getModelForTask || (() => null);
  let memberKeys = (
    Array.isArray(explicitModels) && explicitModels.length
      ? explicitModels.map((m) => String(m)).filter(Boolean)
      : [...DEFAULT_CONSENSUS_MODELS]
  ).slice(0, 5);
  if (!memberKeys.length) {
    memberKeys = [g('council.gate_change.debate') || 'gemini_flash'];
  }
  return memberKeys;
}

/**
 * @param {object} opts
 * @param {Function} opts.callCouncilMember
 * @param {string} opts.rubricText - full prompt file + proposal block will be appended by caller... actually row is passed
 * @param {object} opts.row - gate_change_proposals row
 * @param {string[]} opts.memberKeys
 */
export async function runGateChangeCouncilDebate({ callCouncilMember, rubricText, row, memberKeys }) {
  async function runSingleCouncilPrompt(memberKey, fullPrompt) {
    const result = await callCouncilMember(memberKey, fullPrompt, { useCache: false });
    const raw = typeof result === 'string' ? result : result?.content || result?.text || '';
    const verdict = normalizeVerdict(parseCouncilVerdict(raw) || 'UNKNOWN');
    return { member: memberKey, raw, verdict };
  }

  const userPrompt = [
    rubricText,
    '',
    '--- PROPOSAL RECORD (JSON) ---',
    JSON.stringify(
      {
        id: row.id,
        created_at: row.created_at,
        title: row.title,
        pain_summary: row.pain_summary,
        hypothesis_label: row.hypothesis_label,
        steps_to_remove: row.steps_to_remove,
        proposed_equivalence_metrics: row.proposed_equivalence_metrics,
        created_by: row.created_by,
      },
      null,
      2
    ),
  ].join('\n');

  const systemPrompt =
    'You are one member of the LifeOS AI Council. Follow the rubric exactly. Always end with one VERDICT line.';

  const round1Prompt = `${systemPrompt}\n\nROUND 1: State your own recommendation.\n\n${userPrompt}`;
  const round1 = [];
  for (const memberKey of memberKeys) {
    try {
      const response = await runSingleCouncilPrompt(memberKey, round1Prompt);
      round1.push(response);
    } catch (err) {
      round1.push({
        member: memberKey,
        raw: `ERROR: ${err.message}`,
        verdict: 'UNKNOWN',
      });
    }
  }

  let oppositeRound = [];
  let consensus = summarizeConsensus(round1);

  if (!consensus.unanimous) {
    for (const r1 of round1) {
      const oppositeTarget = r1.verdict === 'APPROVE' ? 'REJECT' : 'APPROVE';
      const oppositePrompt = [
        systemPrompt,
        '',
        `ROUND 2 (OPPOSITE ARGUMENT): Your round-1 verdict was ${r1.verdict}.`,
        `Now argue the opposite side as strongly as possible (${oppositeTarget}) and then provide your updated final verdict.`,
        '',
        userPrompt,
      ].join('\n');
      try {
        const response = await runSingleCouncilPrompt(r1.member, oppositePrompt);
        oppositeRound.push(response);
      } catch (err) {
        oppositeRound.push({
          member: r1.member,
          raw: `ERROR: ${err.message}`,
          verdict: 'UNKNOWN',
        });
      }
    }
    consensus = summarizeConsensus(oppositeRound);
  }

  let synthesisRound = [];
  let position_e_or_k_found = false;
  let final_synthesis = null;

  if (!consensus.unanimous || consensus.final_verdict === 'DEFER') {
    const synthesisPrompt = [
      systemPrompt,
      '',
      'ROUND 3 (SYNTHESIS — Position E/K):',
      'After pro/con and opposite-argument rounds, search for a synthesis or reframe',
      'that is NOT simply A or B — name Position E or K if one exists.',
      'Cover multi-horizon future-back (1y, 2y, 4y, 5y) and competitive/external scan briefly.',
      'End with SYNTHESIS: <one paragraph> then your VERDICT line.',
      '',
      userPrompt,
      '',
      '--- PRIOR ROUNDS SUMMARY ---',
      ...round1.map((r) => `${r.member} R1: ${r.verdict}`),
      ...oppositeRound.map((r) => `${r.member} R2: ${r.verdict}`),
    ].join('\n');

    const synthesizer = memberKeys[0];
    try {
      const syn = await runSingleCouncilPrompt(synthesizer, synthesisPrompt);
      synthesisRound.push(syn);
      const raw = syn.raw || '';
      const synMatch = raw.match(/SYNTHESIS:\s*([\s\S]+?)(?=VERDICT:|$)/i);
      if (synMatch) {
        final_synthesis = synMatch[1].trim();
        position_e_or_k_found = /position\s+[ek]/i.test(raw) || Boolean(final_synthesis);
      }
      if (syn.verdict && syn.verdict !== 'UNKNOWN') {
        consensus = summarizeConsensus([...oppositeRound.length ? oppositeRound : round1, syn]);
      }
    } catch (err) {
      synthesisRound.push({
        member: synthesizer,
        raw: `ERROR: ${err.message}`,
        verdict: 'UNKNOWN',
      });
    }
  }

  const rounds = {
    protocol: 'consensus_v4_opposite_synthesis_v27',
    required_sections: [
      'steel_man_risk',
      'equivalence',
      'blind_spots',
      'future_back_1y_2y_4y_5y',
      'competitive_scan',
      'synthesis_e_or_k',
      'recommendation',
    ],
    models: memberKeys,
    round1,
    round2_opposite: oppositeRound,
    round3_synthesis: synthesisRound,
    position_e_or_k_found,
    final_synthesis,
    final: consensus,
  };

  const councilOutput = [
    'ROUND 1',
    ...round1.map((r) => `\n=== ${r.member} (${r.verdict}) ===\n${r.raw}`),
    oppositeRound.length ? '\n\nROUND 2 (OPPOSITE ARGUMENT)' : '',
    ...oppositeRound.map((r) => `\n=== ${r.member} (${r.verdict}) ===\n${r.raw}`),
    synthesisRound.length ? '\n\nROUND 3 (SYNTHESIS E/K)' : '',
    ...synthesisRound.map((r) => `\n=== ${r.member} (${r.verdict}) ===\n${r.raw}`),
    final_synthesis ? `\n\nFINAL SYNTHESIS: ${final_synthesis}` : '',
    `\n\nCONSENSUS SUMMARY: ${consensus.summary}`,
    `VERDICT: ${consensus.final_verdict}`,
  ].join('\n');

  return {
    round1,
    oppositeRound,
    synthesisRound,
    position_e_or_k_found,
    final_synthesis,
    consensus,
    rounds,
    councilOutput,
    memberKeys,
  };
}
