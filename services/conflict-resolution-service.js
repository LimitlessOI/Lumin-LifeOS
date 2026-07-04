/**
 * SYNOPSIS: Exports createConflictResolutionService — services/conflict-resolution-service.js.
 */
const AI_CALL_TASK_TYPE = 'general';

function safeString(value) {
  return String(value ?? '').trim();
}

function ensureLogger(logger) {
  const base = logger && typeof logger === 'object' ? logger : console;
  return {
    info: typeof base.info === 'function' ? base.info.bind(base) : () => {},
    warn: typeof base.warn === 'function' ? base.warn.bind(base) : () => {},
    error: typeof base.error === 'function' ? base.error.bind(base) : () => {},
    debug: typeof base.debug === 'function' ? base.debug.bind(base) : () => {},
  };
}

function toJsonMaybe(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function buildIssueText(conflict) {
  const parts = [];
  if (conflict.title) parts.push(`Title: ${conflict.title}`);
  if (conflict.summary) parts.push(`Summary: ${conflict.summary}`);
  if (conflict.positions) parts.push(`Positions: ${JSON.stringify(conflict.positions)}`);
  if (conflict.needs) parts.push(`Needs: ${JSON.stringify(conflict.needs)}`);
  if (conflict.context) parts.push(`Context: ${JSON.stringify(conflict.context)}`);
  return parts.join('\n');
}

function normalizeAIResult(result) {
  if (!result) return {};
  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      return { text: trimmed };
    }
  }
  return result;
}

function extractProposalText(stepResult) {
  if (!stepResult) return '';
  if (typeof stepResult === 'string') return stepResult;
  if (Array.isArray(stepResult)) return stepResult.map((x) => extractProposalText(x)).filter(Boolean).join('\n');
  if (typeof stepResult === 'object') {
    return (
      safeString(stepResult.proposal) ||
      safeString(stepResult.recommendation) ||
      safeString(stepResult.text) ||
      safeString(stepResult.content) ||
      safeString(stepResult.summary)
    );
  }
  return '';
}

export function createConflictResolutionService(callCouncilMember) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  async function mediateConflict(conflictInput = {}) {
    const conflict = {
      title: safeString(conflictInput.title),
      summary: safeString(conflictInput.summary),
      positions: conflictInput.positions ?? null,
      needs: conflictInput.needs ?? null,
      context: conflictInput.context ?? null,
      conflictId: conflictInput.conflictId ?? null,
      ownerId: conflictInput.ownerId ?? null,
    };

    const issueText = buildIssueText(conflict);

    const positionAnalysisRaw = await callCouncilMember(
      'gemini',
      issueText,
      { taskType: AI_CALL_TASK_TYPE },
    );
    const positionAnalysis = normalizeAIResult(positionAnalysisRaw);

    const stressTestRaw = await callCouncilMember(
      'claude',
      JSON.stringify({
        conflict,
        positionAnalysis,
        instruction: 'Stress-test proposals for weaknesses, edge cases, and missing stakeholder concerns.',
      }),
      { taskType: AI_CALL_TASK_TYPE },
    );
    const stressTest = normalizeAIResult(stressTestRaw);

    const imbalanceCheckRaw = await callCouncilMember(
      'gemini',
      JSON.stringify({
        conflict,
        positionAnalysis,
        stressTest,
        instruction: 'Check for power imbalance, coercion, missing consent, or uneven voice distribution.',
      }),
      { taskType: AI_CALL_TASK_TYPE },
    );
    const imbalanceCheck = normalizeAIResult(imbalanceCheckRaw);

    const proposals = [
      extractProposalText(positionAnalysis),
      extractProposalText(stressTest),
      extractProposalText(imbalanceCheck),
    ].filter(Boolean);

    return {
      conflict,
      positionAnalysis,
      stressTest,
      imbalanceCheck,
      proposals,
      resolved: proposals.length > 0,
    };
  }

  return {
    mediateConflict,
  };
}