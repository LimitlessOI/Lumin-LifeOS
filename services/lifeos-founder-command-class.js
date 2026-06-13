/**
 * Founder command class routing — repo/build vs BP vs read vs provider vs system action.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { parseFounderDirectProviderUtterance } from './founder-direct-provider.js';
import { parseProviderToolProofUtterance } from './founder-provider-tool-action.js';
import { detectSystemAgentQuestion } from './lifeos-system-agent.js';
import { extractTargetFileFromInstruction } from './voice-rail-command-executor.js';

/** @typedef {'repo_build'|'bp_level'|'system_read'|'direct_provider'|'provider_tool_action'|'system_action'|'brainstorm'|'lifeos_operator'|'unsupported'} FounderCommandClass */

export function isBuildNextBpStepUtterance(text) {
  const t = String(text || '').toLowerCase();
  return (
    /\bnext\b.*\b(lifeos\s+)?(bp|blueprint)\b.*\bstep\b/.test(t)
    || /\bbuild\b.*\bnext\b.*\b(lifeos\s+)?(bp|blueprint)\b/.test(t)
    || /\b(build|run|execute|complete)\b.*\bnext\b.*\b(bp|blueprint)\b/.test(t)
  );
}

export function isAuditUtterance(text) {
  const t = String(text || '').toLowerCase();
  return (
    /\b(show me proof|proof this was|was this deployed|deployed or only committed|only committed)\b/.test(t)
    || /\b(deploy sha|deployment proof|prove.*deployed)\b/.test(t)
  );
}

export function isBrainstormUtterance(text) {
  const t = String(text || '').toLowerCase();
  return /\b(brainstorm|what if|ideas? for|could we explore|monetize|monetization)\b/.test(t);
}

export function declaresNoRepoEdits(text) {
  const t = String(text || '').toLowerCase();
  return /\b(no repo edits?|without repo (edits?|changes?)|no file changes?|no git commits?|don'?t edit (the )?repo|not in (the )?repo|zero repo|without (changing|editing|modifying) (any )?files?)\b/i.test(t);
}

/**
 * Live system write/event/receipt with no repo patch — connection proofs, heartbeats, etc.
 */
export function detectSystemActionIntent(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  if (extractTargetFileFromInstruction(text)) return null;

  const writeIntent =
    /\b(creat(e|ing)|writ(e|ing)|record(ing)?|log(ging)?|emit(ting)?|add(ing)?|insert(ing)?|store|save|generat(e|ing)|produc(e|ing))\b/.test(t)
    && /\b(receipt|event|record|proof|marker|heartbeat|ping|signal|audit trail)s?\b/.test(t);

  const connectionIntent =
    /\b(prove|proof|verify|confirm|test|demonstrate|show)\b.*\b(live|connection|connected|system|railway|online|reachable)\b/.test(t)
    || /\b(live system|system connection|connection proof|prove.*connection)\b/.test(t);

  const noRepo = declaresNoRepoEdits(text);

  if (noRepo && (writeIntent || connectionIntent)) {
    return { kind: 'harmless_system_receipt', no_repo_edit: true, write_intent: writeIntent, connection_intent: connectionIntent };
  }
  if (connectionIntent && writeIntent) {
    return { kind: 'harmless_system_receipt', no_repo_edit: noRepo, write_intent: true, connection_intent: true };
  }
  return null;
}

export function isRepoBuildCommand(text, { explicitMode = 'lifeos' } = {}) {
  const utterance = String(text || '').trim();
  if (!utterance) return false;
  if (detectSystemActionIntent(utterance)) return false;
  if (detectSystemAgentQuestion(utterance)) return false;
  if (isBuildNextBpStepUtterance(utterance)) return false;

  const targetFile = extractTargetFileFromInstruction(utterance);
  const t = utterance.toLowerCase();

  if (targetFile) return true;

  if (explicitMode === 'command' || explicitMode === 'lifeos') {
    if (/\b(please build|please fix|please run|deploy this|execute this|run builder)\b/.test(t)) return true;
    if (
      /\b(take a look at|fix the|update the|change the|patch the|implement|make the system)\b/.test(t)
      && /\b(assistant|voice rail|lifeos|builder|overlay|command.control|app)\b/.test(t)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Map utterance → command class (deterministic, not one-off sentence matching).
 * @returns {{ class: FounderCommandClass, reason: string, system_action?: object }}
 */
export function classifyFounderCommandClass(utterance, { explicitMode = 'lifeos' } = {}) {
  const text = String(utterance || '').trim();
  if (!text) return { class: 'lifeos_operator', reason: 'empty' };

  if (parseProviderToolProofUtterance(text)) {
    return { class: 'provider_tool_action', reason: 'ask_provider_tool_proof_pattern' };
  }

  if (parseFounderDirectProviderUtterance(text)) {
    return { class: 'direct_provider', reason: 'talk_to_provider_pattern' };
  }

  const systemAction = detectSystemActionIntent(text);
  if (systemAction) {
    return { class: 'system_action', reason: 'system_action_no_repo', system_action: systemAction };
  }

  if (detectSystemAgentQuestion(text)) {
    return { class: 'system_read', reason: 'system_agent_question' };
  }

  if (isAuditUtterance(text)) {
    return { class: 'system_read', reason: 'deploy_proof_question' };
  }

  if (isBuildNextBpStepUtterance(text)) {
    return { class: 'bp_level', reason: 'build_next_bp_step' };
  }

  if (isRepoBuildCommand(text, { explicitMode })) {
    return { class: 'repo_build', reason: 'repo_build_command' };
  }

  if (isBrainstormUtterance(text) || explicitMode === 'brainstorm') {
    return { class: 'brainstorm', reason: 'brainstorm_intent' };
  }

  if (explicitMode === 'command' && !extractTargetFileFromInstruction(text)) {
    return { class: 'unsupported', reason: 'command_without_repo_target_or_system_action' };
  }

  return { class: 'lifeos_operator', reason: 'default_lifeos' };
}

/** Intent-router lane id (stable API for voice-rail-intent-router). */
export function commandClassToIntentLane(commandClass) {
  switch (commandClass) {
    case 'direct_provider':
      return 'direct_provider';
    case 'provider_tool_action':
      return 'provider_tool_action';
    case 'system_read':
      return 'audit';
    case 'bp_level':
      return 'execution_bp';
    case 'repo_build':
      return 'execution_repo';
    case 'system_action':
      return 'system_action';
    case 'brainstorm':
      return 'brainstorm';
    case 'unsupported':
      return 'blocked';
    default:
      return 'lifeos_operator';
  }
}
