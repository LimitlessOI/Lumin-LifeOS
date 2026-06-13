/**
 * Governed outcome verifier — fail closed on wrong-deliverable commits.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const COMMIT_MESSAGE_MARKER = '--COMMIT-MESSAGE-END--';
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'into', 'your', 'you', 'are', 'not',
  'was', 'were', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'then', 'than',
  'what', 'when', 'where', 'which', 'who', 'why', 'how', 'but', 'about', 'without', 'before',
  'after', 'through', 'only', 'must', 'can', 'cannot', 'again', 'lane', 'lanes',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function extractQuotedOutcomes(text) {
  const source = normalizeText(text);
  if (!source) return [];
  const matches = [];
  const regex = /["“”']([^"“”']{6,})["“”']/g;
  let match = regex.exec(source);
  while (match) {
    const candidate = normalizeText(match[1]);
    if (candidate) matches.push(candidate);
    match = regex.exec(source);
  }
  return matches;
}

function chooseRequiredOutcome(instruction, metadata = {}) {
  const metadataOutcome = normalizeText(metadata.required_outcome);
  if (metadataOutcome) {
    return { source: 'metadata.required_outcome', text: metadataOutcome };
  }
  const quoted = extractQuotedOutcomes(instruction)[0];
  if (quoted) {
    return { source: 'instruction.quote', text: quoted };
  }
  return { source: 'instruction.full', text: normalizeText(instruction) };
}

function buildEvidenceText({ commitMessage, patchText, changedFiles }) {
  return [
    normalizeText(commitMessage),
    normalizeText(patchText),
    Array.isArray(changedFiles) ? changedFiles.join('\n') : '',
  ].filter(Boolean).join('\n');
}

function evaluateRequirementMatch(requiredOutcome, evidenceText, requirementSource) {
  const required = normalizeText(requiredOutcome).toLowerCase();
  const evidence = normalizeText(evidenceText).toLowerCase();
  if (!required || !evidence) {
    return {
      ok: false,
      reason: 'missing_required_or_evidence_text',
      matched_terms: [],
      missing_terms: [],
      required_terms: [],
      match_ratio: 0,
    };
  }

  if (requirementSource !== 'instruction.full') {
    const exactMatch = evidence.includes(required);
    return {
      ok: exactMatch,
      reason: exactMatch ? 'exact_phrase_match' : 'required_phrase_absent',
      matched_terms: exactMatch ? [required] : [],
      missing_terms: exactMatch ? [] : [required],
      required_terms: [required],
      match_ratio: exactMatch ? 1 : 0,
    };
  }

  const requiredTerms = tokenize(required);
  if (!requiredTerms.length) {
    return {
      ok: false,
      reason: 'no_required_terms',
      matched_terms: [],
      missing_terms: [],
      required_terms: [],
      match_ratio: 0,
    };
  }

  const matchedTerms = requiredTerms.filter((term) => evidence.includes(term));
  const missingTerms = requiredTerms.filter((term) => !evidence.includes(term));
  const matchRatio = matchedTerms.length / requiredTerms.length;
  return {
    ok: matchRatio >= 0.7 && matchedTerms.length >= 2,
    reason: matchRatio >= 0.7 && matchedTerms.length >= 2 ? 'term_threshold_met' : 'term_threshold_missed',
    matched_terms: matchedTerms,
    missing_terms: missingTerms,
    required_terms: requiredTerms,
    match_ratio: Number(matchRatio.toFixed(3)),
  };
}

async function readCommitEvidence(commitSha) {
  const sha = normalizeText(commitSha);
  if (!sha) return { ok: false, error: 'missing_commit_sha' };
  try {
    const messageResult = await execFileAsync('git', [
      'show',
      '--name-only',
      '--pretty=format:%B%n' + COMMIT_MESSAGE_MARKER,
      sha,
    ]);
    const splitIdx = messageResult.stdout.indexOf(COMMIT_MESSAGE_MARKER);
    const messagePart = splitIdx === -1 ? '' : messageResult.stdout.slice(0, splitIdx);
    const filesPart = splitIdx === -1 ? messageResult.stdout : messageResult.stdout.slice(splitIdx + COMMIT_MESSAGE_MARKER.length);
    const changedFiles = filesPart
      .split('\n')
      .map((line) => normalizeText(line))
      .filter(Boolean);

    const patchResult = await execFileAsync('git', [
      'show',
      '--pretty=format:',
      '--unified=0',
      sha,
    ]);
    return {
      ok: true,
      commit_sha: sha,
      commit_message: normalizeText(messagePart),
      changed_files: changedFiles,
      patch_text: patchResult.stdout || '',
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'git_show_failed',
      commit_sha: sha,
    };
  }
}

export async function verifyGovernedOutcomeBeforePass({
  job,
  trace,
  verifierResult,
  readCommit = readCommitEvidence,
}) {
  const instruction = normalizeText(job?.instruction);
  const requiredOutcome = chooseRequiredOutcome(instruction, job?.metadata_json || {});
  const commitSha = normalizeText(
    trace?.builder_output?.commit_sha
      || trace?.builder_output?.raw?.commit_sha
      || trace?.builder_output?.raw?.sha,
  );

  if (!instruction || !requiredOutcome.text) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'missing_instruction_or_required_outcome',
      required_outcome: requiredOutcome,
      acceptance_result: verifierResult?.ok === true ? 'pass' : 'fail',
    };
  }
  if (verifierResult?.ok !== true) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'acceptance_not_pass',
      required_outcome: requiredOutcome,
      acceptance_result: verifierResult?.ok === true ? 'pass' : 'fail',
    };
  }

  const commitEvidence = await readCommit(commitSha);
  if (!commitEvidence.ok) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'missing_committed_content_evidence',
      required_outcome: requiredOutcome,
      commit_sha: commitSha || null,
      commit_read_error: commitEvidence.error || 'unknown',
      acceptance_result: 'pass',
    };
  }

  const evidenceText = buildEvidenceText({
    commitMessage: commitEvidence.commit_message,
    patchText: commitEvidence.patch_text,
    changedFiles: commitEvidence.changed_files,
  });
  const match = evaluateRequirementMatch(requiredOutcome.text, evidenceText, requiredOutcome.source);
  if (!match.ok) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'requested_outcome_missing_in_commit',
      founder_request: instruction,
      required_outcome: requiredOutcome,
      commit_sha: commitEvidence.commit_sha,
      changed_files: commitEvidence.changed_files,
      acceptance_result: 'pass',
      outcome_match: match,
      evidence_excerpt: evidenceText.slice(0, 2000),
    };
  }

  return {
    ok: true,
    code: 'PASS_OUTCOME_VERIFIED',
    founder_request: instruction,
    required_outcome: requiredOutcome,
    commit_sha: commitEvidence.commit_sha,
    changed_files: commitEvidence.changed_files,
    acceptance_result: 'pass',
    outcome_match: match,
  };
}

export const __private__ = {
  chooseRequiredOutcome,
  evaluateRequirementMatch,
};
