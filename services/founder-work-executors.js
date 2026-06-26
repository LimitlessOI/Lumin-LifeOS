/**
 * SYNOPSIS: Founder work executors — SMOS content + system deliverables (not template theater).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { executeSocialMediaContentPackage } from './founder-smos-content-executor.js';

async function executeVideoPackage(deps) {
  return executeSocialMediaContentPackage({
    ...deps,
    autoApproveFounder: deps.founderRole !== 'guest',
  });
}

const EXECUTORS = {
  video_package: executeVideoPackage,
  socialmediaos_content: executeVideoPackage,
};

/**
 * Run a compiled work intent — returns chair-ready result or null if unsupported.
 */
export async function executeFounderWorkIntent(compiled, deps = {}) {
  if (!compiled || compiled.intent !== 'work' || !compiled.execute_now || !compiled.executor) {
    return null;
  }
  const fn = EXECUTORS[compiled.executor];
  if (typeof fn !== 'function') {
    return {
      ok: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      action_type: compiled.executor,
      error: 'executor_not_implemented',
      human_summary: `That kind of work (${compiled.executor}) isn't wired yet — I'll say so instead of faking it.`,
    };
  }
  const result = await fn({
    params: compiled.params || {},
    utterance: deps.utterance || compiled.paraphrase || '',
    pool: deps.pool,
    userId: deps.userId || 'adam',
    userHandle: deps.userHandle || 'adam',
    tenantId: deps.tenantId || 'default',
    callCouncilMember: deps.callCouncilMember,
    founderRole: deps.founderRole,
  });
  return { ...result, intent_compiler: compiled };
}
