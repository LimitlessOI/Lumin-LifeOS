/**
 * SYNOPSIS: Chair context classifier — life vs code vs command (default help, not builder theater).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { isRepairContinuationIntent, extractTargetFileFromInstruction, isCssOnlyUiFeedback, inferTargetFileFromFounderFeedback } from './builder-instruction-target.js';
import { isFounderConfirmIntent } from './founder-intent-clarify.js';
import { isGovernanceOrSsotIntent, isPipelineGovernanceCounsel } from './founder-governance-clarify.js';
import { isMissionPipelineIntent, isIntakeBlueprintIntent } from './lifeos-mission-pipeline-executor.js';
import { isPointBExecuteIntent, isPointBStatusIntent } from './point-b-navigator.js';
import { isFounderShipOrUsabilityIntent } from './founder-chair-intent.js';
import {
  isFounderIdentityIntent,
  isFounderPersonalLifeIntent,
  isProductBuildChangeVerb,
} from './founder-life-admin-intent.js';
import {
  isBlueprintExecuteIntent,
  isExplicitExecuteCommand,
  isBuildRequest,
  isCounselOnlyBypass,
  isFounderRepairOrderIntent,
  isFounderUiBehaviorChangeRequest,
} from './chair-intent-signals.js';

const PRODUCT_MARKERS = /\b(html|css|\.js|\.mjs|route|routes\/|services\/|overlay|lifere|lifeos-app|deploy|railway|builder|commit|target_file|ui|nav|bubble|button|drawer|panel|server|migration|blueprint|mission|ssot|amendment|api\/|public\/|npm run|gap-fill)\b/i;

const SYSTEM_STATUS_MARKERS = /\b(point b|alpha|progress|keep going|continue building|machine path|receipt scan|queue status|what(?:'s| is) next)\b/i;
const CONTINUE_TO_PASS_MARKERS = /\b(keep going|continue|advance|do the next|next machine step)\b.*\b(pass|exact blocker)\b/i;

const CONVERSATION_MARKERS = /\b( worried|feel|think about|should i|can you find|help me|what do you|how do i|coupon|appointment|errand|family|kids|wife|health|sleep|money|budget)\b/i;

export function hasProductBuildContext(text = '') {
  const t = String(text || '');
  if (isFounderIdentityIntent(t)) return false;
  if (isFounderPersonalLifeIntent(t) && !/^\s*(do|execute|run)\s*:/i.test(t) && !isProductBuildChangeVerb(t)) {
    return false;
  }
  return PRODUCT_MARKERS.test(t)
    || isCssOnlyUiFeedback(t)
    || isFounderShipOrUsabilityIntent(t)
    || isRepairContinuationIntent(t)
    || isFounderRepairOrderIntent(t)
    || isProductBuildChangeVerb(t)
    || isBuildRequest(t);
}

export function hasHighConfidenceBuildTarget(text = '') {
  const t = String(text || '');
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return true;
  if (/\b(fix|add|change|implement|wire|update)\s+(this|that|it)\b/i.test(t)) return true;
  if (isFounderConfirmIntent(t)) return true;
  if (/target_file:\s*\S+/i.test(t)) return true;
  if (extractTargetFileFromInstruction(t)) return true;
  if (/\bpublic\/overlay\/[\w.-]+\.(html|css|js)\b/i.test(t)) return true;
  if (/\b(lifeos-app|lifeos-lifere|lifeos-dashboard|lifeos-login)\.html\b/i.test(t)) return true;
  const inferred = inferTargetFileFromFounderFeedback(t);
  if (inferred?.confidence === 'high') return true;
  return false;
}

export function computeContextScores(text = '') {
  const t = String(text || '').trim();
  const scores = {
    personal: 0,
    build: 0,
    system: 0,
    governance: 0,
    display: 0,
  };

  if (isFounderPersonalLifeIntent(t)) scores.personal += 10;
  if (isFounderIdentityIntent(t)) {
    scores.personal += 12;
    scores.build = 0;
    scores.system = Math.max(0, scores.system - 8);
  }
  if (CONVERSATION_MARKERS.test(t)) scores.personal += 3;
  if (/\b(coupon|oil change|on the way|errand|appointment)\b/i.test(t)) scores.personal += 4;

  if (hasProductBuildContext(t)) scores.build += 4;
  if (isBuildRequest(t)) scores.build += 5;
  if (isProductBuildChangeVerb(t)) scores.build += 4;
  if (isRepairContinuationIntent(t)) scores.build += 8;
  if (isFounderRepairOrderIntent(t)) scores.build += 12;
  if (isFounderUiBehaviorChangeRequest(t)) scores.build += 20;
  if (hasHighConfidenceBuildTarget(t)) scores.build += 6;
  if (/\b(fix|add|change|implement|wire|update)\s+(this|that|it)\b/i.test(t)) scores.build += 10;

  if (isBlueprintExecuteIntent(t)) scores.system += 12;
  if (isExplicitExecuteCommand(t)) scores.system += 8;
  if (isPointBExecuteIntent(t)) scores.system += 10;
  if (isPointBStatusIntent(t)) scores.system += 4;
  if (isMissionPipelineIntent(t)) scores.system += 6;
  if (SYSTEM_STATUS_MARKERS.test(t)) scores.system += 5;
  if (CONTINUE_TO_PASS_MARKERS.test(t)) scores.system += 8;
  if (/\b(status|progress|blocker|receipt scan)\b/i.test(t) && /\b(mission|blueprint|point b|alpha|lifere|build step|step you just started)\b/i.test(t)) {
    scores.system += 8;
  }
  if (/\b(what should we do next|what(?:'s| is) next)\b/i.test(t) && /\b(lifere|point b|alpha|mission|program)\b/i.test(t)) {
    scores.system += 8;
  }

  if (isGovernanceOrSsotIntent(t)) scores.governance += 8;

  if (/\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt)\b/i.test(t)
    && !/\b(build|fix|change|deploy)\b/i.test(t)) {
    scores.display += 4;
  }

  if (scores.personal >= 5 && !hasProductBuildContext(t)) {
    scores.build = Math.max(0, scores.build - 12);
  }
  if (scores.personal >= 5 && scores.build > 0 && !PRODUCT_MARKERS.test(t)) {
    scores.build = Math.max(0, scores.build - 8);
  }
  if (isCounselOnlyBypass(t)) {
    scores.build = 0;
    scores.personal += 2;
  }

  return scores;
}

export function detectDualIntent(text = '') {
  const t = String(text || '').trim();
  const scores = computeContextScores(t);
  const personal = scores.personal >= 5;
  const build = scores.build >= 5 && hasProductBuildContext(t);
  return {
    dual: personal && build,
    personal,
    build,
    scores,
  };
}

/**
 * Single routing brain — default is Lumin help (personal + counsel), not Point B or builder CLARIFY.
 */
export function resolveChairContext(text = '', ctx = {}) {
  const t = String(text || '').trim();
  const {
    shouldDisplayOnly = false,
    explicitExecute = false,
    useTerminalForBuild = false,
    explicitAction = 'auto',
  } = ctx;

  if (shouldDisplayOnly && !isFounderPersonalLifeIntent(t) && !CONVERSATION_MARKERS.test(t)) {
    const scores = computeContextScores(t);
    if (scores.personal < 5) {
      return {
        channel: 'display',
        domain: 'display',
        confidence: 1,
        requires_execute_clarify: false,
        personal_search: false,
        scores,
      };
    }
  }

  // Governance / pipeline counsel wins over intake — mentioning Creative Engine
  // or "blueprint" in a law conversation must not hijack into intake_blueprint.
  if (isPipelineGovernanceCounsel(t) || (isGovernanceOrSsotIntent(t) && !/\b(create|generate|kick.?off)\s+(a\s+)?blueprint\b/i.test(t))) {
    return {
      channel: 'chair',
      domain: 'governance',
      confidence: 1,
      requires_execute_clarify: false,
      personal_search: false,
      scores: computeContextScores(t),
    };
  }

  if (isIntakeBlueprintIntent(t) && !isPipelineGovernanceCounsel(t)) {
    return {
      channel: 'intake_blueprint',
      domain: 'product_build',
      confidence: 0.95,
      requires_execute_clarify: false,
      personal_search: false,
      scores: computeContextScores(t),
    };
  }

  if (explicitAction && explicitAction !== 'auto') {
    const forced = String(explicitAction).toLowerCase();
    const map = {
      build: useTerminalForBuild ? 'build_terminal' : 'build_async',
      execute: 'execute',
      display: 'display',
      counsel: 'chair',
      life_admin: 'chair',
      lumin: 'chair',
      chair: 'chair',
      mission_pipeline: 'mission_pipeline',
      intake_blueprint: 'intake_blueprint',
      blueprint_execute: 'blueprint_execute',
      point_b: 'point_b',
    };
    if (map[forced]) {
      return {
        channel: map[forced],
        domain: isFounderPersonalLifeIntent(t) ? 'personal_life' : forced,
        confidence: 1,
        requires_execute_clarify: ['build_async', 'build_terminal'].includes(map[forced])
          && !hasHighConfidenceBuildTarget(t),
        personal_search: isFounderPersonalLifeIntent(t) || ['lumin', 'counsel', 'life_admin'].includes(forced),
        scores: computeContextScores(t),
      };
    }
  }

  const scores = computeContextScores(t);
  const dual = detectDualIntent(t);

  if (isCounselOnlyBypass(t)) {
    return {
      channel: 'chair',
      domain: 'counsel',
      confidence: 1,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (isIntakeBlueprintIntent(t) && !isPipelineGovernanceCounsel(t)) {
    return {
      channel: 'intake_blueprint',
      domain: 'product_build',
      confidence: 0.95,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (isBlueprintExecuteIntent(t)) {
    if (isPointBExecuteIntent(t)) {
      return {
        channel: 'point_b',
        domain: 'system_ops',
        confidence: 1,
        requires_execute_clarify: false,
        personal_search: false,
        scores,
      };
    }
    return {
      channel: 'blueprint_execute',
      domain: 'system_execute',
      confidence: 1,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (isFounderUiBehaviorChangeRequest(t)) {
    return {
      channel: useTerminalForBuild ? 'build_terminal' : 'build_async',
      domain: 'product_build',
      confidence: 1,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (explicitExecute && isExplicitExecuteCommand(t)) {
    return {
      channel: 'execute',
      domain: 'system_execute',
      confidence: 1,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (dual.dual) {
    return {
      channel: 'chair',
      domain: 'dual',
      confidence: 0.85,
      requires_execute_clarify: false,
      personal_search: true,
      secondary_build: true,
      scores,
    };
  }

  if (scores.personal >= 5 && scores.build < 5) {
    return {
      channel: shouldDisplayOnly ? 'chair' : 'lumin',
      domain: 'personal_life',
      confidence: Math.min(1, scores.personal / 10),
      requires_execute_clarify: false,
      personal_search: true,
      scores,
    };
  }

  if (scores.build >= 5 && (hasProductBuildContext(t) || isRepairContinuationIntent(t))) {
    const channel = useTerminalForBuild ? 'build_terminal' : 'build_async';
    return {
      channel,
      domain: 'product_build',
      confidence: Math.min(1, scores.build / 12),
      requires_execute_clarify: !hasHighConfidenceBuildTarget(t),
      personal_search: false,
      scores,
    };
  }

  if (scores.governance >= 6 && isGovernanceOrSsotIntent(t)) {
    return {
      channel: 'chair',
      domain: 'governance',
      confidence: 0.8,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (scores.system >= 7) {
    return {
      channel: 'point_b',
      domain: 'system_ops',
      confidence: Math.min(1, scores.system / 12),
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  if (isMissionPipelineIntent(t)) {
    return {
      channel: 'mission_pipeline',
      domain: 'system_ops',
      confidence: 0.9,
      requires_execute_clarify: false,
      personal_search: false,
      scores,
    };
  }

  return {
    channel: 'chair',
    domain: 'conversation',
    confidence: 0.6,
    requires_execute_clarify: false,
    personal_search: scores.personal >= 2 || CONVERSATION_MARKERS.test(t),
    scores,
  };
}

export function requiresPreExecuteClarify(text = '', ctx = {}) {
  if (ctx.confirmIntent || ctx.forceExecute) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(text)) return false;
  const resolved = resolveChairContext(text, ctx);
  return resolved.requires_execute_clarify === true;
}

export function chairChannelFromContext(text = '', ctx = {}) {
  return resolveChairContext(text, ctx).channel;
}