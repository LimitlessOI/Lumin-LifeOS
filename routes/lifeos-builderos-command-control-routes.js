/**
 * SYNOPSIS: Founder-facing LifeOS BuilderOS command-control routes for direct chat, build orchestration, and governed execution receipts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildContextForPrompt, storeMemory } from '../core/memory-system.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT } from '../services/repo-root.js';
import { verifyToken } from '../services/lifeos-auth.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { resolveLifeOSUserId } from '../services/lifeos-user-resolver.js';
import { enforceExecutionTruth, formatExecutionTruthReply, sanitizeConversationReply } from '../services/lifeos-execution-truth.js';
import { enforceTruthLockdown } from '../services/truth-lockdown.js';
import { createLuminContextLoader } from '../services/lumin-context-loader.js';
import { createLuminConversationLearner } from '../services/lumin-conversation-learner.js';
import {
  extractPriorBuildTask,
  isRepairContinuationIntent,
  resolveFounderBuildTarget,
} from '../services/builder-instruction-target.js';
import { expandFounderBuildTask, isFounderShipOrUsabilityIntent } from '../services/founder-chair-intent.js';
import { isFounderConfirmIntent } from '../services/founder-intent-clarify.js';
import { runFounderBuildWithSelfRepair, startFounderBuildJob, getFounderBuildJobStatus } from '../services/founder-build-self-repair.js';
import { resolveFounderBuildBaseUrl, assertFounderBuildBaseUrl } from '../services/founder-build-success-gate.js';
import { refreshFounderBuildResultTruth } from '../services/founder-build-result-truth.js';
import { isFounderBuildProofPending } from '../services/founder-build-job-store.js';
import {
  createCommandControlJob,
  getCommandControlJob,
  listCommandControlJobs,
  cancelCommandControlJob,
  setCommandControlHalt,
  getCommandControlHaltState,
  updateCommandControlJobExecution,
  loadFounderBuildJobFromDb,
} from '../services/builderos-command-control-service.js';
import { executeCommandControlJob } from '../services/builderos-governed-loop-executor.js';
import {
  createFounderIntakeGate,
  runBpbIntakeGateForMission,
  formatInboxGateBlocker,
} from '../services/founder-intake-gate.js';
import {
  evaluatePointBNavigator,
  formatPointBStatusSummary,
} from '../services/point-b-navigator.js';
import {
  runLuminChairTurn,
  isExplicitExecuteCommand,
  isBuildRequest,
} from '../services/lumin-chair-orchestrator.js';
import { isIntakeBlueprintIntent } from '../services/lifeos-mission-pipeline-executor.js';
import { needsSystemKnowledge } from '../services/chair-system-knowledge.js';
import { parseLuminChairSystemAction, shouldSkipInputNormalize, tryLuminChairSystemAction } from '../services/lumin-chair-system-actions.js';
import { parseLifeOSDirectAction } from '../services/lifeos-direct-action.js';
import { stripChairDoPrefix } from '../services/chair-intent-signals.js';
import { createCognitiveCoreCapture } from '../services/cognitive-core-capture.js';
import { isFounderPersonalLifeIntent } from '../services/founder-life-admin-intent.js';
import { isExplicitDisplayOnlyRequest } from '../services/lumin-conversation-routing.js';
import { translateChairPersonality } from '../services/chair-personality-translate.js';
import { createBuilderOSControlPlaneService } from '../services/builderos-control-plane-service.js';
import {
  enforceBeforeBuilderDispatch,
  formatUnifiedGateBlockSummary,
} from '../services/founder-packet-v2-unified-gate.js';
import { loadPointBTarget } from '../services/point-b-target-lite.js';
import {
  confirmFounderUsability,
  scorePredictionsForMissionUsability,
} from '../services/founder-usability-confirm.js';
import {
  parseFounderUsabilityVerdict,
  loadFounderGatedMissions,
} from '../services/founder-usability-verdict.js';
import { runGovernedAutonomousShipOnce, getGovernedAutonomousShipStatus } from '../services/governed-autonomous-shipping-loop.js';
import {
  loadBuildQueue,
  claimPreExistingSatisfiedSteps,
  persistQueue,
  STEP_STATUS,
} from '../services/product-build-orchestrator.js';
import { commitQueueStatusToRepo } from '../services/never-stop-product-factory.js';

const FOUNDER_BUILD_JOB_TIMEOUT_MS = Number(process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS || '480000');

/** Deploy-truth canary — stamped on every founder-interface response so tip SHA lies are visible. */
export const FI_ROUTE_MARKER = 'fi-route-marker-v5';
const FI_ROUTE_FILE = fileURLToPath(import.meta.url);
let FI_DISK_HAS_NAV = false;
try {
  FI_DISK_HAS_NAV = fs.readFileSync(FI_ROUTE_FILE, 'utf8').includes("nav_canary: 'fi-nav-v1'");
} catch {
  FI_DISK_HAS_NAV = false;
}

/** Inline navigate map — do not depend on a possibly-stale system-actions import for shell open. */
const INLINE_NAV_PAGES = [
  { keys: ['lifere', 'life re', 'life-re'], page: 'lifeos-lifere.html', stack: 'lifere', action_type: 'open_lifere' },
  { keys: ['dashboard', 'home'], page: 'lifeos-dashboard.html', action_type: 'open_dashboard' },
  { keys: ['today'], page: 'lifeos-today.html', action_type: 'open_today' },
  { keys: ['mirror'], page: 'lifeos-mirror.html', action_type: 'open_mirror' },
  { keys: ['purpose'], page: 'lifeos-purpose.html', action_type: 'open_purpose' },
  { keys: ['food', 'food logger', 'nutrition'], page: 'lifeos-food.html', action_type: 'open_food' },
  { keys: ['habits', 'habit tracker'], page: 'lifeos-habits.html', action_type: 'open_habits' },
  { keys: ['cycle'], page: 'lifeos-cycle.html', action_type: 'open_cycle' },
  { keys: ['coach', 'therapy'], page: 'lifeos-coach.html', action_type: 'open_coach' },
  { keys: ['family'], page: 'lifeos-family.html', action_type: 'open_family' },
  { keys: ['household'], page: 'lifeos-household.html', action_type: 'open_household' },
  { keys: ['date night', 'datenight'], page: 'lifeos-date-night.html', action_type: 'open_date_night' },
  { keys: ['parent mode', 'meltdown'], page: 'lifeos-parent-mode.html', action_type: 'open_parent_mode' },
  { keys: ['twin directives', 'ui directives', 'twin'], page: 'lifeos-twin-directives.html', action_type: 'open_twin_directives' },
  { keys: ['member feedback', 'feedback'], page: 'lifeos-member-feedback.html', action_type: 'open_member_feedback' },
  { keys: ['victory vault', 'victories'], page: 'lifeos-victory-vault.html', action_type: 'open_victory' },
  { keys: ['ask your life', 'ask life'], page: 'lifeos-ask-your-life.html', action_type: 'open_ask_life' },
  { keys: ['decisions'], page: 'lifeos-decisions.html', action_type: 'open_decisions' },
  { keys: ['legacy'], page: 'lifeos-legacy.html', action_type: 'open_legacy' },
  { keys: ['ethics', 'privacy'], page: 'lifeos-ethics.html', action_type: 'open_ethics' },
  { keys: ['connect'], page: 'lifeos-connect.html', action_type: 'open_connect' },
  { keys: ['finance'], page: 'lifeos-finance.html', action_type: 'open_finance' },
  { keys: ['health'], page: 'lifeos-health.html', action_type: 'open_health' },
  { keys: ['chat', 'history'], page: 'lifeos-chat.html', action_type: 'open_chat' },
];

function parseShellNavigateInline(text = '') {
  const t = String(text || '').trim().toLowerCase().replace(/[?.!]+$/g, '');
  if (!t) return null;
  const verbs = ['open ', 'go to ', 'show ', 'launch ', 'switch to ', 'take me to ', 'navigate to '];
  let target = null;
  for (const verb of verbs) {
    if (t.startsWith(verb)) {
      target = t.slice(verb.length).replace(/^the\s+/, '').trim();
      break;
    }
  }
  if (!target) return null;
  for (const entry of INLINE_NAV_PAGES) {
    if (entry.keys.some((k) => target === k || target.includes(k) || k.includes(target))) {
      return {
        matched: true,
        action_type: entry.action_type || 'navigate',
        shell_action: {
          type: 'navigate',
          page: entry.page,
          ...(entry.stack ? { stack: entry.stack } : {}),
        },
      };
    }
  }
  return null;
}

function fiRouteStamp(extra = {}) {
  return {
    fi_route_marker: FI_ROUTE_MARKER,
    fi_disk_has_nav: FI_DISK_HAS_NAV,
    ...extra,
  };
}

/** Direct LifeOS BUILD_QUEUE ship via founder UI — not blueprint intake theater. */
function isLifeosQueueBuildIntent(text = '') {
  const t = String(text || '');
  // Match "LifeOS", "Life OS", "life-os".
  if (!/\blife[\s-]os\b|\blifeos\b/i.test(t)) return false;
  // Only reject real "create blueprint / start intake" asks — not "do not create intake".
  if (/\b(create|generate|make|draft)\s+(a\s+)?(new\s+)?blueprint\b/i.test(t)
    && !/\b(do not|don't|dont|never|not)\b.{0,24}\b(create|generate|make|draft)\b/i.test(t)) {
    return false;
  }
  if (/\b(start|kick\soff|begin)\s+(an?\s+)?(intake|blueprint\s+intake)\b/i.test(t)) return false;
  return /\b(build|ship|continue|finish|complete|resume)\b/i.test(t)
    && /\b(feature|features|queue|build_queue|blueprint|twin|all|remaining|blocked|stuck)\b/i.test(t);
}

function founderBuildJobAgeMs(job) {
  const raw = job?.created_at;
  if (!raw) return 0;
  const t = typeof raw === 'number' ? raw : new Date(raw).getTime();
  return Number.isFinite(t) ? Date.now() - t : 0;
}

export function resolveFounderCommandControlHandle(req) {
  return req?.auth_mode === 'command_key_fallback'
    ? 'adam'
    : (req?.lifeosUser?.handle || 'adam');
}

export function createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();
  const luminPersist = pool
    ? createLifeOSLumin({ pool, callAI: null, logger: { info: () => {}, error: () => {}, warn: () => {} } })
    : null;
  const founderIntakeGate = pool
    ? createFounderIntakeGate({ pool, logger: { info: () => {}, warn: () => {}, error: () => {} } })
    : null;
  const controlPlane = pool
    ? createBuilderOSControlPlaneService({ pool, logger: { info: () => {}, warn: () => {}, error: () => {} } })
    : null;
  const luminContext = pool ? createLuminContextLoader({ pool, callAI: callCouncilMember }) : null;
  const luminLearner = pool ? createLuminConversationLearner({ pool, callAI: callCouncilMember }) : null;

  const EXECUTE_ALLOWED_ROLES = new Set(['founder_admin', 'operator', 'admin']);

  async function persistFounderTurn(req, userMessage, replyText, opts = {}) {
    const reply = String(replyText || '').trim();
    if (!reply) return null;
    if (!luminPersist) return 'HISTORY_NOT_SAVED';
    try {
      let userId = null;
      const sub = req.lifeosUser?.sub;
      if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
        userId = parseInt(sub, 10);
      }
      if (!userId) {
        const handle = resolveFounderCommandControlHandle(req);
        userId = await resolveLifeOSUserId(pool, handle);
      }
      if (!userId) return 'HISTORY_NOT_SAVED';
      const thread = await luminPersist.getOrCreateDefaultThread(userId);
      const commandTruth = opts.command_truth || 'NO_COMMAND_RAN';
      await luminPersist.recordExchange(thread.id, userId, userMessage, reply, {
        command_truth: commandTruth,
      });
      if (pool) {
        try {
          const { createFounderMemoryStore } = await import('../services/founder-memory-store.js');
          const { inferProductIdsFromMessage } = await import('../services/founder-memory-product-resolver.js');
          const memoryStore = createFounderMemoryStore(pool);
          const sessionId = req.body?.session_id || `founder_thread_${thread.id}`;
          const productIds = inferProductIdsFromMessage(userMessage, req.body?.product_id || req.body?.ui_context?.product_id);
          const meta = { source: 'founder-interface', thread_id: thread.id };
          await memoryStore.append({
            sessionId,
            productIds,
            role: 'founder',
            content: userMessage,
            metadata: meta,
          });
          await memoryStore.append({
            sessionId,
            productIds,
            role: 'assistant',
            content: reply,
            metadata: meta,
          });
        } catch { /* canonical memory is best-effort */ }
      }
      if (luminLearner) {
        await luminLearner.recordTurnFeedback({
          userId,
          userMessage,
          luminReply: reply,
        }).catch(() => {});
      }
      return null;
    } catch {
      return 'HISTORY_NOT_SAVED';
    }
  }

  function lockFounderResponse(body, channel = 'founder_interface') {
    return enforceTruthLockdown(body, channel);
  }

  async function resolveBuildTaskForFounder(req, cleanedInput) {
    let task = cleanedInput;
    if (isRepairContinuationIntent(cleanedInput)) {
      const bodyPrior = typeof req.body?.prior_task === 'string' ? req.body.prior_task.trim() : '';
      if (bodyPrior) {
        task = `${bodyPrior}\n\n[system: founder requested continue repair — never-stop until PASS or new blocker]`;
      } else if (luminPersist && pool) {
        try {
          let userId = null;
          const sub = req.lifeosUser?.sub;
          if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
            userId = parseInt(sub, 10);
          }
          if (!userId) {
            const handle = resolveFounderCommandControlHandle(req);
            userId = await resolveLifeOSUserId(pool, handle);
          }
          if (userId) {
            const thread = await luminPersist.getOrCreateDefaultThread(userId);
            const messages = await luminPersist.getMessages(thread.id, { limit: 24 });
            const prior = extractPriorBuildTask(messages, cleanedInput);
            if (prior) {
              task = `${prior}\n\n[system: founder requested continue repair — never-stop until PASS or new blocker]`;
            }
          }
        } catch {
          /* fail-open — use current text */
        }
      }
    }
    return expandFounderBuildTask(task);
  }

  function wrapBridgeResultAsTruth(result, task) {
    const hasCommit = result.committed === true || Boolean(result.sha || result.commit_sha);
    return enforceExecutionTruth({
      ok: result.pass_fail === 'PASS' || result.ok === true,
      committed: hasCommit,
      target_file: result.target_file || result.changed_files?.[0] || null,
      sha: result.sha || result.commit_sha || null,
      first_blocker: result.first_blocker || result.error || result.reason || null,
      execution_path: 'terminal_bridge',
      task_meta: { output_bytes: 0 },
      ...result,
    }, { action: 'execute', task });
  }

  const NORMALIZE_TIMEOUT_MS = 8000;

  async function normalizeInputText(rawText) {
    if (typeof callCouncilMember !== 'function') return rawText;
    if (!rawText || rawText.trim().length < 3) return rawText;
    try {
      const aiCall = callCouncilMember(
        'gemini',
        `You are an input normalizer for a voice-first personal operating system called LifeOS.
The founder speaks or types commands — often with misspellings, voice-to-text errors, autocorrect mistakes, dropped words, or garbled phrasing.

Your job: figure out what they meant and rewrite it as a clean, clear English request.

Rules:
- Fix spelling, grammar, voice-to-text artifacts (e.g. "wanna" → "want to", "teh" → "the", "hwo" → "how")
- Preserve the original intent exactly — do not add, invent, or change what was asked
- If the input is already clean, return it unchanged
- Output ONLY the cleaned text. No explanation, no prefix, no quotes.

Input: ${rawText}`,
        { maxTokens: 300, taskType: 'chat', useCache: false }
      );
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('normalize_timeout')), NORMALIZE_TIMEOUT_MS));
      const response = await Promise.race([aiCall, timeout]);
      const cleaned = typeof response === 'string'
        ? response
        : response?.content || response?.text || null;
      return cleaned ? String(cleaned).trim() : rawText;
    } catch {
      return rawText;
    }
  }

  async function translateToPlainEnglish() {
    return null;
  }

  function inferTargetFileFromTask(task = '') {
    return resolveFounderBuildTarget(task);
  }

  function buildBuildFailureReceipt(task, taskJson, execJson) {
    const blocker =
      execJson?.first_blocker ||
      execJson?.detail ||
      execJson?.error ||
      taskJson?.first_blocker ||
      taskJson?.detail ||
      taskJson?.error ||
      taskJson?.reason ||
      'Builder failed with no error detail';
    let lesson = 'The build path ran but did not produce a committable change.';
    let fix = 'Retry with a smaller scope: name the exact file and the one change you want.';

    if (/target_file is required|target_file not in placement/i.test(blocker)) {
      lesson = 'Build reached execute without target_file — system should auto-infer UI surface and retry (never-stop).';
      const inferred = resolveFounderBuildTarget(task);
      fix = inferred
        ? `System will retry with target_file: ${inferred}. If you still see this, say "keep trying".`
        : 'Name target_file in the ask (e.g. public/overlay/lifeos-app.html) or say "keep trying" to resume.';
    } else if (/too short|truncated/i.test(blocker)) {
      lesson = 'Builder output was too short for the target file — commit was correctly refused to avoid corrupting live UI.';
      fix = 'Scope to a minimal patch (one CSS block, one function, one label) instead of rewriting a large HTML file.';
    } else if (/prose refusal|not code/i.test(blocker)) {
      lesson = 'Builder returned prose instead of code — usually means the target file was not injected into the prompt.';
      fix = 'Retry the same GAP-FILL prompt; founder-interface now auto-injects files[] when target_file is named.';
    } else if (/No runtime-available authorized model|No authorized model is currently allowed|_api_key_missing|github_token_missing|builderos_policy_blocked/i.test(blocker)) {
      lesson = 'Founder build reached BuilderOS, but no runtime-authorized coding lane was actually available for execution.';
      fix = 'Configure at least one allowed builder provider key for the active runtime lane, then retry the exact same request.';
    } else if (taskJson?.cache_hit) {
      lesson = 'Builder returned cached stale output instead of fresh code for this task.';
      fix = 'System now disables cache on build route; retry the same request.';
    } else if (/blueprint|gate|forbidden|SNT/i.test(blocker)) {
      lesson = 'A governance gate blocked the change before commit.';
      fix = 'Ask for status of the blocker, or narrow scope to a GAP-FILL patch with explicit target_file.';
    } else if (!taskJson?.target_file && inferTargetFileFromTask(task)) {
      lesson = 'Large overlay files need explicit patch scope — whole-file regeneration usually fails validation.';
      fix = `Request a bounded change to ${inferTargetFileFromTask(task)} only (specific element or CSS class).`;
    }

    return {
      pass_fail: 'FAIL',
      blocker,
      lesson,
      fix,
      gap_recommendation: execJson?.gap_recommendation || null,
    };
  }

  function formatExecutionSummary({ pass_fail, action, command_truth, sha, first_blocker, execution_receipt, human_summary, execution_path }) {
    const lines = [];
    const icon = pass_fail === 'PASS' ? '✅' : pass_fail === 'FAIL' ? '❌' : 'ℹ️';
    lines.push(`${icon} ${pass_fail || 'UNKNOWN'} · ${action || 'execute'}`);
    if (command_truth) lines.push(`Command: ${command_truth}`);
    if (execution_path) lines.push(`Path: ${execution_path}`);
    if (sha) lines.push(`Commit: ${String(sha).slice(0, 12)}`);
    const blocker = first_blocker || execution_receipt?.blocker;
    if (blocker) lines.push(`Blocker: ${blocker}`);
    if (execution_receipt?.lesson) lines.push(`Lesson: ${execution_receipt.lesson}`);
    if (execution_receipt?.fix) lines.push(`Fix: ${execution_receipt.fix}`);
    const gap = execution_receipt?.gap_recommendation;
    if (gap?.next_platform_fix) lines.push(`Next: ${gap.next_platform_fix}`);
    const note = String(human_summary || '').trim();
    if (note) {
      lines.push('');
      lines.push(note);
    }
    return lines.join('\n');
  }

  function isDisplayRequest(text) {
    return /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt|how many|what is|what are|list|count|tell me)\b/i.test(text);
  }

  async function loadLuminMemory({ userId = null, userHandle = null, messageText = null, productId = null } = {}) {
    let founderMemoryBlock = '';
    if (pool) {
      try {
        const { inferProductIdsFromMessage, injectProductMemoryIntoContext } = await import(
          '../services/founder-memory-product-resolver.js'
        );
        const productIds = inferProductIdsFromMessage(messageText, productId);
        const injected = await injectProductMemoryIntoContext({
          productId: productIds[0] || 'lifeos',
          pool,
          limit: 24,
        });
        founderMemoryBlock = String(injected?.memory_block || '').trim();
      } catch { /* fail-open — twin/context still loads */ }
    }

    if (luminContext && pool) {
      try {
        let resolvedUserId = userId;
        const resolvedHandle = String(userHandle || 'adam').toLowerCase();
        if (!resolvedUserId) {
          const { rows } = await pool.query(
            `SELECT id FROM lifeos_users WHERE user_handle = $1 AND active = TRUE LIMIT 1`,
            [resolvedHandle],
          ).catch(() => ({ rows: [] }));
          resolvedUserId = rows[0]?.id || null;
        }
        const ctx = await luminContext.buildPromptContext({
          userId: resolvedUserId,
          userHandle: resolvedHandle,
        });
        if (ctx) {
          const base = typeof ctx === 'string' ? ctx : String(ctx);
          return [founderMemoryBlock, base].filter(Boolean).join('\n\n');
        }
      } catch { /* fall through */ }
    }
    try {
      const { default: fsp } = await import('fs/promises');
      const { join } = await import('path');
      const raw = JSON.parse(await fsp.readFile(join(process.cwd(), 'data', 'memories.json'), 'utf-8'));
      const parts = [];

      // Doctrine/directive facts — the core context Lumin needs
      const doctrineFacts = (raw.facts || [])
        .filter(f => ['lumin_doctrine', 'lumin_doctrine_wisdom', 'founder_directive'].includes(f?.content?.type))
        .slice(0, 3)
        .map(f => String(f?.content?.content || '').slice(0, 900))
        .filter(Boolean);
      if (doctrineFacts.length) parts.push(doctrineFacts.join('\n---\n'));

      // Goals (concise)
      const goals = (raw.goals || []).filter(g => (g.confidence || 0) >= 0.7).slice(0, 4);
      if (goals.length) {
        const gt = goals.map(g => {
          const c = g.content;
          return typeof c === 'string' ? c.slice(0, 120) : (c?.title || JSON.stringify(c).slice(0, 120));
        }).join('; ');
        parts.push(`Goals: ${gt}`);
      }

      // Recent conversation history — last 3 exchanges
      const hist = (raw.conversation_history || []).slice(-3);
      if (hist.length) {
        const ht = hist.map(h => {
          const u = String(h.content?.user || h.content || '').slice(0, 100);
          const l = String(h.content?.lumin || '').slice(0, 150);
          return `Adam: ${u}\nLumin: ${l}`;
        }).join('\n\n');
        parts.push(`Recent exchanges:\n${ht}`);
      }

      const fallback = parts.filter(Boolean).join('\n\n');
      return [founderMemoryBlock, fallback].filter(Boolean).join('\n\n');
    } catch {
      return founderMemoryBlock || '';
    }
  }

  async function luminConverse(userMessage) {
    if (typeof callCouncilMember !== 'function') return null;
    try {
      const memoryContext = await loadLuminMemory({ messageText: userMessage });

      // Detect role request — load role-specific authority context
      const roleMatch = userMessage.match(/\b(chair|cfo|cto|sentry|wisdom|architect|builder)\b/i);
      const roleMap = {
        chair: 'strategic direction, mission alignment, governance, priority calls, and blocking bad decisions',
        cfo: 'revenue, cost, ROI gates, financial health, spend decisions, and funded-vs-unfunded tracking',
        cto: 'technical architecture, stack decisions, scalability, and engineering quality',
        sentry: 'quality control, anti-pattern detection, proof verification, and exposing fake-green signals',
        wisdom: 'pattern recognition across time, prediction scoring vs real-world outcomes, founder drift detection, and long-term learning from what was predicted vs what actually happened',
        architect: 'system design, file structure, service boundaries, and load-bearing technical trade-offs',
        builder: 'BuilderOS pipeline — blueprints, missions, governed execution, SNT/CFO gates, and commit receipts',
      };
      const roleKey = roleMatch?.[1]?.toLowerCase();
      const roleContext = roleKey ? `\nACTIVE ROLE — ${roleKey.toUpperCase()}: You are operating with the authority and constraints of ${roleKey.toUpperCase()}. This means your focus is on ${roleMap[roleKey] || roleKey}. Apply that role's logic, not a generic answer.` : '';

      const { getDoctrinePromptBlock } = await import('../services/lifeos-service-doctrine.js');
      const doctrineBlock = getDoctrinePromptBlock();

      const systemPrompt = `You are Lumin — the operating intelligence of Adam Hopkins' LifeOS/BuilderOS system.

${doctrineBlock}

WHAT YOU ARE:
You are NOT a chatbot. You are Lumin — Adam's personal operating system AND command/control center in one front door.
- Personal life: errands, coupons, timing, health, money, relationships, decisions — answer like a trusted chief of staff who knows him.
- Product/code: when he names surfaces (HTML, routes, LifeRE, deploy, builder) the system executes commits — you counsel until then.
- Never confuse the two: oil change ≠ LifeRE HTML. Never ask about target_file for life questions.

Founder Packet V2 governs EXECUTE paths (docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md) — hard enforcement on code/build only, not on conversation.

STRATEGIC INTELLIGENCE (product/strategy turns ONLY — skip on personal errands):
- Offer ideas and gaps when Adam asks about product, LifeRE, revenue, competitors, or build strategy
- On oil change, coupons, appointments, health, family: zero Point B / founder success test / 6mo simulation — just help

WHAT ADAM HAS BEEN BUILDING:
LifeOS is Adam's personal cockpit and command interface. BuilderOS is the engine — a governed AI execution platform with a council of AI models (Gemini, Anthropic, OpenAI), mission queue, blueprint gates, Sentry checks, and commit receipts. The whole system runs on Railway (Node.js), Neon PostgreSQL, and GitHub. The goal is a self-building, self-governing AI operating system that generates real revenue while protecting user dignity. Target: $500+/day validated revenue. North Star: speed to revenue without deception or theater.

HONESTY CONTRACT (non-negotiable):
- If a command ran: say COMMAND_RAN and show the receipt
- If no command ran: just answer in plain prose — no status codes in your text
- If uncertain: say "I'm not certain" — never present a guess as fact
- NEVER invent: drive times, nearby shops, your calendar, vehicle service history, or "I checked X" unless that data is in WHAT I KNOW FROM MEMORY or in verified search links provided in this turn
- If making a prediction about what Adam would decide: label it "Prediction:" and explain why
- Theater = deception. Never perform. Either do it or say you can't.

ADAM'S DIGITAL TWIN (what you know about him):
- Values results over process. "The scoreboard is did we get from A to B."
- Deep distrust of AI theater — has been burned many times
- Wants the shortest honest path, not governance ceremony for its own sake
- Real estate background; strong product instincts; ADHD tendencies (exec function)
- Wants systems that build themselves — "don't cut the cocoon"
- Communicates directly, often via voice (expects misspellings/slang to be understood)
- Will call out deception immediately and hard; responds to honesty and follow-through
${roleContext}
${memoryContext ? `\nWHAT I KNOW FROM MEMORY:\n${memoryContext}` : ''}

HOW TO RESPOND:
- Answer Adam's actual question directly in conversational prose — life first when it's a life question
- For errands (oil change, coupons): yes/no on timing, paste or cite real coupon URLs from search block — do not fake local knowledge
- Do not append Point B, founder usability, or strategic simulation blocks on personal errands
- Draw on memory only when present — don't dump fields, just talk like you know this person when you actually have data
- No preamble. No throat-clearing. Start with the answer.
- Be honest about what you know vs. don't know
- Code/build: when he clearly asks to change the product, the system runs builder — you explain outcomes honestly (PASS/FAIL + receipt)
- Point B missions: you CANNOT claim executed/triggered/complete without receipts
- Never claim a UI change shipped unless the system returned COMMITTED with a commit SHA
- Never say "successfully executed" or "build triggered" in conversation mode — that is theater
- DIRECT CONNECTION LAW: You are Lumin speaking directly to Adam. Do not claim you opened, navigated, scheduled, committed, or changed anything unless a command receipt proves it. Answer in plain prose — no counsel-only disclaimers, no "I'm not the chair."`;

      const response = await callCouncilMember('gemini', `${systemPrompt}\n\nAdam: ${userMessage}\n\nLumin:`, {
        maxOutputTokens: 2000,
        taskType: 'chat',
        useCache: false,
      });
      const text = typeof response === 'string'
        ? response
        : response?.content || response?.text || null;
      if (!text) return null;
      const reply = String(text).trim();

      // Save this exchange to conversation memory (non-blocking)
      storeMemory('conversation_history', {
        user: userMessage,
        lumin: reply,
        timestamp: new Date().toISOString(),
      }, {
        confidence: 0.8,
        aiOrigin: true,
        epistemic_label: 'THINK',
        command_truth: 'NO_COMMAND_RAN',
        taskType: 'lifeos.lumin.chat',
      }).catch(() => {});

      return reply;
    } catch {
      return null;
    }
  }

  async function routeToBuilder(task, commandKey, opts = {}) {
    const pointB = loadPointBTarget();
    const gate = await enforceBeforeBuilderDispatch({
      task,
      missionId: opts.missionId || pointB?.mission_id || pointB?.target?.mission_id,
      pool,
      callAI: callCouncilMember,
      confirmIntent: opts.confirmIntent === true,
      platformGapFill: opts.platform_gap_fill === true,
      platformGapFillReason: opts.platform_gap_fill_reason,
    });
    if (!gate.execute_cleared) {
      return enforceExecutionTruth({
        ok: false,
        committed: false,
        first_blocker: gate.violations?.[0] || gate.blocker,
        failure_code: 'BLOCKED_FOUNDER_PACKET_V2',
        execution_path: 'founder_css_patch',
        human_summary_technical: formatUnifiedGateBlockSummary(gate),
        fp_v2_gate: gate,
      }, { action: 'build', task });
    }
    const baseCheck = assertFounderBuildBaseUrl(resolveFounderBuildBaseUrl());
    if (!baseCheck.ok) {
      return enforceExecutionTruth({
        ok: false,
        committed: false,
        first_blocker: baseCheck.blocker,
        failure_code: baseCheck.code,
        execution_path: 'founder_css_patch',
      }, { action: 'build', task });
    }
    return runFounderBuildWithSelfRepair({
      task,
      commandKey,
      baseUrl: baseCheck.baseUrl,
      buildFailureReceipt: buildBuildFailureReceipt,
      enforceExecutionTruth,
      repoRoot: REPO_ROOT,
      callCouncilMember,
      pool,
    });
  }

  function getForwardedOperatorKey(req) {
    return req.headers['x-command-key']
      || req.headers['x-command-center-key']
      || req.headers['x-lifeos-key']
      || req.headers['x-api-key']
      || null;
  }

  function founderBuildResponsePayload(builderResult) {
    if (!builderResult || typeof builderResult !== 'object') return builderResult;
    const { generated_output, exec_meta, ...rest } = builderResult;
    const safe = { ...rest };
    if (exec_meta && typeof exec_meta === 'object') {
      const { output, ...execRest } = exec_meta;
      safe.exec_meta = execRest;
    }
    return safe;
  }

  function readCookie(req, name) {
    const raw = String(req.headers.cookie || '');
    if (!raw) return '';
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const [k, ...rest] = pair.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return '';
  }

  function getTokenFromRequest(req) {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
    const alt = String(req.headers['x-lifeos-token'] || '').trim();
    if (alt) return alt;
    return readCookie(req, 'lifeos_access_token');
  }

  function keyFallbackAllowed() {
    // x-command-key (COMMAND_CENTER_KEY) is the master founder key — always sufficient
    return true;
  }

  function requireFounderInterfaceAuth(req, res, next) {
    const authHeader = String(req.headers.authorization || '');
    const alt = String(req.headers['x-lifeos-token'] || '').trim();
    const cookieTok = readCookie(req, 'lifeos_access_token');
    const candidates = [];
    if (authHeader.startsWith('Bearer ')) candidates.push(authHeader.slice(7).trim());
    if (alt) candidates.push(alt);
    if (cookieTok) candidates.push(cookieTok);

    for (const token of candidates) {
      if (!token) continue;
      try {
        req.lifeosUser = verifyToken(token);
        req.auth_mode = 'account_jwt';
        return next();
      } catch { /* try next */ }
    }

    const fallbackAllowed = keyFallbackAllowed();
    if (fallbackAllowed && requireKey) {
      return requireKey(req, res, () => {
        req.lifeosUser = {
          sub: 'emergency-key',
          handle: 'emergency_key_operator',
          role: 'founder_admin',
          tier: 'core',
        };
        req.auth_mode = 'command_key_fallback';
        next();
      });
    }

    return res.status(401).json({
      ok: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      reason: 'AUTH_REQUIRED',
      error: 'Login required for Founder Interface',
      redirect: '/overlay/lifeos-login.html?next=%2Flifeos%3Fdirect_system%3D1',
    });
  }

  function requireExecuteRole(req, res, next) {
    const role = String(req.lifeosUser?.role || '').toLowerCase();
    if (!EXECUTE_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({
        ok: false,
        pass_fail: 'FAIL',
        command_truth: 'NO_COMMAND_RAN',
        reason: 'ROLE_FORBIDDEN_EXECUTE',
        error: `Role ${role || 'unknown'} cannot execute BuilderOS commands`,
      });
    }
    next();
  }

  function buildFounderIntakeCommand({ text, textFile, stage, missionId, force }) {
    const script = path.join(REPO_ROOT, 'scripts', 'run-founder-intake-direct.mjs');
    const args = [script];
    if (text) args.push('--text', String(text));
    if (textFile) args.push('--text-file', String(textFile));
    if (stage) args.push('--stage', String(stage));
    if (missionId) args.push('--mission-id', String(missionId));
    if (force === true) args.push('--force');
    return {
      command: process.execPath,
      args,
      pretty: `${process.execPath} ${args.map((a) => JSON.stringify(a)).join(' ')}`,
    };
  }

  function parseBridgeStdout(stdout) {
    const text = String(stdout || '').trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // best effort: parse final JSON object from noisy output
      const idx = text.lastIndexOf('\n{');
      if (idx >= 0) {
        try {
          return JSON.parse(text.slice(idx + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  function summarizeBridgeResult({ exitCode, parsed, commandRan }) {
    if (!commandRan) {
      return {
        status: 'FAIL',
        reason: 'NO_COMMAND_RAN',
        human_summary: 'No terminal command was executed.',
      };
    }
    if (!parsed) {
      return {
        status: 'FAIL',
        reason: 'NO_RECEIPT',
        human_summary: 'Command ran but no parseable receipt JSON was produced.',
      };
    }
    const ok = exitCode === 0 && parsed.ok === true;
    if (!ok) {
      return {
        status: 'FAIL',
        reason: parsed.first_blocker || 'COMMAND_FAILED',
        human_summary: parsed.first_blocker
          ? `BuilderOS failed at first blocker: ${parsed.first_blocker}`
          : 'BuilderOS command failed.',
      };
    }
    return {
      status: 'PASS',
      reason: null,
      human_summary: `BuilderOS ${parsed.stage || 'development'} path passed for ${parsed.mission_id}.`,
    };
  }

  async function buildDisplayBundle({ scope = 'overview', missionId = null }) {
    const jobs = pool ? await listCommandControlJobs(pool, { limit: 20 }) : [];
    const haltState = pool ? await getCommandControlHaltState(pool) : null;
    const pointB = await evaluatePointBNavigator({ callAI: callCouncilMember, includeWebResearch: false, skipAcceptance: true });
    const scoped = String(scope || 'overview').toLowerCase();
    const missionJobs = missionId
      ? jobs.filter((job) => String(job.instruction || '').includes(String(missionId)))
      : [];
    return {
      scope: scoped,
      mission_id: missionId || pointB.mission_id || null,
      halt_state: haltState,
      point_b: pointB,
      point_b_summary: formatPointBStatusSummary(pointB),
      recent_jobs: jobs,
      mission_jobs: missionJobs,
      queue_summary: {
        queued: jobs.filter((j) => j.status === 'queued').length,
        running: jobs.filter((j) => j.status === 'running').length,
        blocked: jobs.filter((j) => j.status === 'blocked').length,
        failed: jobs.filter((j) => j.status === 'failed').length,
        done: jobs.filter((j) => j.status === 'done').length,
      },
    };
  }

  function summarizeDisplayRequest(text = '') {
    const t = String(text || '').toLowerCase();
    if (/\b(queue|jobs|backlog|status)\b/.test(t)) return 'queue';
    if (/\b(blocker|fail|failed)\b/.test(t)) return 'blockers';
    if (/\breceipt|artifact|path\b/.test(t)) return 'receipts';
    return 'overview';
  }

  function hasHandoffStructure(text = '') {
    const t = String(text || '');
    const requiredMarkers = [
      /problem:/i,
      /desired outcome:/i,
      /scope boundary:/i,
      /success metric:/i,
      /failure metric:/i,
      /constraints:/i,
      /founder success test:/i,
    ];
    let found = 0;
    for (const marker of requiredMarkers) {
      if (marker.test(t)) found += 1;
    }
    return found >= 3;
  }

  function isLikelyExecuteIntent(text = '') {
    return /\b(add|change|update|modify|edit|fix|remove|create|implement|wire|route|redirect|patch|refactor|build|ship)\b/i
      .test(String(text || ''));
  }

  function normalizeFounderExecuteIntent(text = '') {
    const clean = String(text || '').trim();
    if (!clean) return '';
    if (hasHandoffStructure(clean)) return clean;
    if (!isLikelyExecuteIntent(clean)) return clean;
    return [
      'Problem:',
      clean,
      '',
      'Desired Outcome:',
      clean,
      '',
      'Scope Boundary:',
      'Only the minimum files required to complete this exact request.',
      '',
      'Constraints:',
      '- No theater, no simulation, no fake success',
      '- Keep behavior fail-closed and reversible where possible',
      '',
      'Success Metric:',
      'Requested change is visible/real in the live target surface or endpoint.',
      '',
      'Failure Metric:',
      'No real change, or missing execution evidence/receipts.',
      '',
      'Unacceptable Result:',
      'Claiming completion without runtime-verifiable evidence.',
      '',
      'Founder Success Test:',
      'Founder can verify the requested change directly in the app/runtime.',
      '',
      'Acceptance Command:',
      'Return command_truth, pass_fail, exit_code, commit_sha, changed_files, receipt_paths, first_blocker.',
    ].join('\n');
  }


  async function runTerminalBridgeIntake({ text, textFile, stage, missionId, force }) {
    const pointB = loadPointBTarget();
    const gate = await enforceBeforeBuilderDispatch({
      task: text || textFile || '',
      missionId: missionId || pointB?.mission_id || pointB?.target?.mission_id,
      pool,
      callAI: callCouncilMember,
      confirmIntent: force === true,
    });
    if (!gate.execute_cleared) {
      return {
        ok: false,
        pass_fail: 'FAIL',
        exit_code: 1,
        first_blocker: gate.violations?.[0] || gate.blocker,
        failure_code: 'BLOCKED_FOUNDER_PACKET_V2',
        human_summary: formatUnifiedGateBlockSummary(gate),
        fp_v2_gate: gate,
        command_executed: null,
      };
    }
    const cmd = buildFounderIntakeCommand({
      text: text || null,
      textFile: textFile || null,
      stage,
      missionId,
      force,
    });

    const startedAt = Date.now();
    const child = spawn(cmd.command, cmd.args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let commandRan = true;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      commandRan = false;
      stderr += `\n${err.message}`;
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', (code) => resolve(Number.isInteger(code) ? code : 1));
    });
    const parsed = parseBridgeStdout(stdout);
    const summary = summarizeBridgeResult({ exitCode, parsed, commandRan });
    const receiptPaths = [];
    const artifactPaths = [];
    if (parsed?.entrypoint_receipt_path) receiptPaths.push(parsed.entrypoint_receipt_path);
    if (parsed?.pre_handoff_report_path) receiptPaths.push(parsed.pre_handoff_report_path);
    if (parsed?.chair_handoff_receipt_path) receiptPaths.push(parsed.chair_handoff_receipt_path);
    if (parsed?.founder_packet_path) artifactPaths.push(parsed.founder_packet_path);
    if (parsed?.intent_baseline_path) artifactPaths.push(parsed.intent_baseline_path);

    return {
      ok: summary.status === 'PASS',
      status: summary.status,
      reason: summary.reason,
      command_ran: commandRan,
      command_truth: commandRan ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
      command_executed: cmd.pretty,
      exit_code: exitCode,
      duration_ms: Date.now() - startedAt,
      pass_fail: summary.status,
      first_blocker: parsed?.first_blocker || summary.reason || null,
      mission_id: parsed?.mission_id || null,
      mission_folder: parsed?.mission_folder || null,
      receipt_paths: receiptPaths,
      artifact_paths: artifactPaths,
      receipt_truth: receiptPaths.length > 0 ? 'RECEIPT_PRESENT' : 'NO_RECEIPT',
      human_summary: summary.human_summary,
      stdout,
      stderr,
      parsed_output: parsed,
    };
  }

  router.post('/jobs', requireKey, async (req, res, next) => {
    try {
      const job = await createCommandControlJob(pool, req.body || {});
      res.status(201).json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs', requireKey, async (req, res, next) => {
    try {
      const jobs = await listCommandControlJobs(pool, {
        limit: req.query.limit,
        status: req.query.status,
      });
      res.json({ ok: true, jobs });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs/:id', requireKey, async (req, res, next) => {
    try {
      const job = await getCommandControlJob(pool, req.params.id);
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/jobs/:id/cancel', requireKey, async (req, res, next) => {
    try {
      const job = await cancelCommandControlJob(pool, req.params.id, req.body || {});
      if (!job) return res.status(409).json({ ok: false, error: 'job_not_cancellable' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/jobs/:id/execute', requireKey, async (req, res, next) => {
    try {
      const jobId = req.params.id;
      const existing = await getCommandControlJob(pool, jobId);
      if (!existing) return res.status(404).json({ ok: false, error: 'job_not_found' });
      if (existing.status !== 'queued') {
        return res.status(409).json({ ok: false, error: 'job_not_executable', job_status: existing.status });
      }

      // Return immediately — Railway/proxy 502s when execute holds connection through full /build.
      res.status(202).json({
        ok: true,
        accepted: true,
        job_id: jobId,
        poll_url: `/api/v1/lifeos/builderos/command-control/jobs/${jobId}`,
      });

      setImmediate(async () => {
        try {
          await executeCommandControlJob(pool, jobId, {
            baseUrl: req.body?.base_url,
            commandKey: getForwardedOperatorKey(req),
          });
        } catch (error) {
          console.error('[command-control] async execute failed for job', jobId, error?.message);
          try {
            await updateCommandControlJobExecution(pool, jobId, {
              status: 'failed',
              blocker: error?.message || 'EXECUTE_ASYNC_CRASH',
            });
          } catch {
            // best-effort
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/halt', requireKey, async (req, res, next) => {
    try {
      const haltState = await setCommandControlHalt(pool, req.body || {});
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  router.get('/halt', requireKey, async (_req, res, next) => {
    try {
      const haltState = await getCommandControlHaltState(pool);
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  router.post('/terminal-bridge/intake', requireFounderInterfaceAuth, requireExecuteRole, async (req, res, next) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const textFile = typeof req.body?.text_file === 'string' ? req.body.text_file.trim() : '';
      const stage = String(req.body?.stage || 'system').toLowerCase();
      const missionId = req.body?.mission_id ? String(req.body.mission_id) : null;
      const force = req.body?.force === true;

      if (!text && !textFile) {
        return res.status(400).json({
          ok: false,
          status: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'text or text_file is required',
        });
      }
      if (!['development', 'system'].includes(stage)) {
        return res.status(400).json({
          ok: false,
          status: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'stage must be development or system',
        });
      }

      const result = await runTerminalBridgeIntake({
        text,
        textFile,
        stage,
        missionId,
        force,
      });
      res.status(200).json({
        auth_mode: req.auth_mode || 'unknown',
        user_role: req.lifeosUser?.role || null,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/founder-interface/build-job/:jobId', requireFounderInterfaceAuth, async (req, res) => {
    let job = getFounderBuildJobStatus(req.params.jobId);
    if (!job && pool) {
      try {
        job = await loadFounderBuildJobFromDb(pool, req.params.jobId);
      } catch (err) {
        console.warn('[founder-interface/build-job] db load failed:', err.message);
      }
    }
    if (!job) {
      return res.status(404).json({ ok: false, pass_fail: 'FAIL', error: 'Build job not found' });
    }
    if (job.status === 'running' && founderBuildJobAgeMs(job) > FOUNDER_BUILD_JOB_TIMEOUT_MS + 60_000) {
      return res.status(200).json({
        ok: false,
        job_id: job.id,
        status: 'failed',
        pass_fail: 'FAIL',
        first_blocker: 'Build job exceeded maximum runtime without terminal result.',
        failure_code: 'FOUNDER_BUILD_JOB_STALE_RUNNING',
        command_truth: 'BUILD_ATTEMPTED',
      });
    }
    if (job.status === 'running') {
      return res.status(202).json({
        ok: true,
        job_id: job.id,
        status: 'running',
        pass_fail: 'RUNNING',
        command_truth: 'BUILD_ATTEMPTED',
        steps: Array.isArray(job.steps) ? job.steps : [],
        started_at: job.created_at || null,
      });
    }
    if (job.result?.pass_fail === 'PASS' && job.result?.committed === true) {
      const operatorKey = getForwardedOperatorKey(req)
        || process.env.COMMAND_CENTER_KEY
        || process.env.LIFEOS_KEY
        || process.env.API_KEY
        || '';
      const refreshed = await refreshFounderBuildResultTruth(job.result, {
        task: job.task,
        baseUrl: resolveFounderBuildBaseUrl(),
        commandKey: operatorKey,
      }).catch(() => job.result);
      if (refreshed && refreshed !== job.result) {
        const proofStillPending = isFounderBuildProofPending(refreshed);
        job = {
          ...job,
          status: proofStillPending
            ? 'waiting_for_proof'
            : refreshed.pass_fail === 'PASS'
              ? 'completed'
              : 'failed',
          result: refreshed,
        };
        if (pool && job.id) {
          await updateCommandControlJobExecution(pool, job.id, {
            status: job.status === 'completed' ? 'completed' : job.status === 'waiting_for_proof' ? 'committed' : 'failed',
            blocker: refreshed.first_blocker || refreshed.blocker || null,
            result_json: {
              founder_result: refreshed,
              pass_fail: refreshed.pass_fail,
              committed: refreshed.committed === true,
              target_file: refreshed.target_file || null,
              sha: refreshed.sha || null,
            },
          }).catch(() => {});
        }
      }
    }
    if (isFounderBuildProofPending(job.result)) {
      return res.status(202).json({
        ok: true,
        job_id: job.id,
        status: job.status === 'completed' ? 'waiting_for_proof' : (job.status || 'waiting_for_proof'),
        command_truth: job.result.command_truth || 'COMMITTED',
        ...(job.result || {}),
        pass_fail: 'RUNNING',
        human_summary: job.result.human_summary || formatExecutionTruthReply(job.result),
      });
    }
    let control_plane_done = null;
    if (controlPlane && job.id) {
      try {
        control_plane_done = await controlPlane.canMarkBuildDone({ task_id: job.id, allow_exception: true });
      } catch (err) {
        control_plane_done = { allowed: false, reason: err.message };
      }
    }
    const pass = job.result?.pass_fail === 'PASS';
    const doneAllowed = control_plane_done?.allowed !== false;
    const resultPayload = job.result || {};
    return res.status(200).json({
      ...resultPayload,
      job_id: job.id,
      status: job.status,
      control_plane_done: control_plane_done,
      ok: pass && doneAllowed,
      human_summary: job.result
        ? (job.result.human_summary || formatExecutionTruthReply(job.result))
        : null,
    });
  });

  router.get('/point-b/status', requireFounderInterfaceAuth, async (req, res) => {
    try {
      const pointB = await evaluatePointBNavigator({
        callAI: callCouncilMember,
        includeWebResearch: req.query.research === '1',
        skipAcceptance: true,
      });
      return res.status(200).json({
        ok: true,
        point_b: pointB,
        human_summary: formatPointBStatusSummary(pointB),
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/founder-interface/confirm-usability', requireFounderInterfaceAuth, async (req, res) => {
    try {
      const role = String(req.lifeosUser?.role || '').toLowerCase();
      if (!EXECUTE_ALLOWED_ROLES.has(role)) {
        return res.status(403).json({
          ok: false,
          error: 'ROLE_FORBIDDEN',
          reason: 'Only founder/operator roles may confirm usability',
        });
      }
      const missionId = req.body?.mission_id ? String(req.body.mission_id) : null;
      const pass = req.body?.pass === true;
      const quote = typeof req.body?.quote === 'string' ? req.body.quote.trim() : '';
      const result = confirmFounderUsability({
        missionId,
        pass,
        quote,
        actor: req.lifeosUser?.email || req.lifeosUser?.id || role,
      });
      if (!result.ok) {
        return res.status(422).json(result);
      }
      const scored = await scorePredictionsForMissionUsability(missionId, { pass, quote });
      return res.status(200).json({
        ...result,
        prediction_scoring: scored,
        human_summary: pass
          ? `Founder usability PASS recorded for ${missionId}. Point B may be reached if all gates clear.`
          : `Founder usability FAIL recorded for ${missionId}. Alpha claim blocked until you pass.`,
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/founder-interface/message', requireFounderInterfaceAuth, async (req, res, next) => {
    const _t0 = Date.now();
    const _log = (label) => console.log(`[FI-MSG] ${label} +${Date.now() - _t0}ms mem=${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
    _log('handler_start');
    const HANDLER_DEADLINE_MS = 92000;
    const handlerDeadline = setTimeout(() => {
      _log('handler_deadline_fired');
      if (!res.headersSent) {
        res.status(200).json({
          ok: false,
          interface: 'Lumin',
          action: 'chair',
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'NO_COMMAND_RAN',
          timed_out: true,
          human_summary: 'The system is taking too long to respond — an AI provider may be slow. Nothing was committed. Please try again.',
        });
      }
    }, HANDLER_DEADLINE_MS);
    try {
      const bodyText =
        typeof req.body?.text === 'string' && req.body.text.trim()
          ? req.body.text
          : (typeof req.body?.message === 'string' ? req.body.message : '');
      const originalText = typeof bodyText === 'string' ? bodyText.trim() : '';
      const stage = String(req.body?.stage || 'system').toLowerCase();
      const missionId = req.body?.mission_id ? String(req.body.mission_id) : null;
      const force = req.body?.force === true;
      const dictateThenSend = req.body?.dictate_then_send === true;
      const conversationalMode = req.body?.conversational_mode !== false;
      const sourceMode = String(req.body?.source_mode || 'text').toLowerCase();
      const action = String(req.body?.action || 'auto').toLowerCase();

      if (!originalText && !req.body?.text_file) {
        return res.status(400).json({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          reason: 'NO_COMMAND_RAN',
          error: 'text or text_file is required',
        });
      }

      // HTTP-boundary act: navigate + LifeOS writes + redeploy/alpha BEFORE counsel.
      if (originalText && action !== 'display') {
        const shellNav = parseShellNavigateInline(originalText)
          || (() => {
            const parsed = parseLuminChairSystemAction(originalText);
            return parsed?.matched && parsed.shell_action ? parsed : null;
          })();
        if (shellNav?.matched && shellNav.shell_action) {
          const human = `Opening ${shellNav.shell_action.page} now.`;
          const persistWarning = req.body?.alpha_probe === true
            ? 'ALPHA_PROBE_SKIP_PERSIST'
            : await persistFounderTurn(req, originalText, human, { command_truth: 'COMMAND_RAN' });
          clearTimeout(handlerDeadline);
          _log(`route_nav_fastpath type=${shellNav.action_type} page=${shellNav.shell_action.page}`);
          res.setHeader('Cache-Control', 'private, no-store, max-age=0');
          return res.status(200).json(lockFounderResponse({
            ok: true,
            interface: 'Lumin',
            lumin_chair: true,
            lumin: true,
            direct_connection: true,
            action: shellNav.action_type || 'system_action',
            chair_channel: 'system_action',
            command_truth: 'COMMAND_RAN',
            pass_fail: 'PASS',
            execution_kind: 'SYSTEM_EXECUTE',
            shell_action: shellNav.shell_action,
            human_summary: human,
            done_synopsis: `Navigated to ${shellNav.shell_action.page}`,
            route_nav_fastpath: true,
            nav_canary: 'fi-nav-v1',
            ...(persistWarning ? { persist_warning: persistWarning } : {}),
            ...fiRouteStamp(),
          }, 'system_action'));
        }

        const sysParsed = parseLuminChairSystemAction(originalText);
        const lifeParsed = parseLifeOSDirectAction(originalText);
        if ((sysParsed.matched && !sysParsed.shell_action) || lifeParsed.matched) {
          const boundaryKey = getForwardedOperatorKey(req)
            || process.env.COMMAND_CENTER_KEY
            || process.env.LIFEOS_KEY
            || process.env.API_KEY;
          try {
            const actResult = await tryLuminChairSystemAction(originalText, {
              pool,
              logger: console,
              operatorKey: boundaryKey,
              founderBuildBaseUrl: resolveFounderBuildBaseUrl(),
              userId: req.lifeosUser?.sub || null,
            });
            if (actResult?.matched) {
              const human = actResult.human_summary || actResult.error || 'System action finished.';
              const actTruth = actResult.command_truth
                || (actResult.executed ? 'COMMAND_RAN' : 'NO_COMMAND_RAN');
              const persistWarning = req.body?.alpha_probe === true
                ? 'ALPHA_PROBE_SKIP_PERSIST'
                : await persistFounderTurn(req, originalText, human, { command_truth: actTruth });
              clearTimeout(handlerDeadline);
              _log(`route_act_fastpath type=${actResult.action_type} ok=${actResult.ok}`);
              res.setHeader('Cache-Control', 'private, no-store, max-age=0');
              return res.status(200).json(lockFounderResponse({
                ok: actResult.ok === true,
                interface: 'Lumin',
                lumin_chair: true,
                lumin: true,
                direct_connection: true,
                action: actResult.action_type || 'system_action',
                chair_channel: 'system_action',
                command_truth: actResult.command_truth
                  || (actResult.executed ? 'COMMAND_RAN' : 'NO_COMMAND_RAN'),
                pass_fail: actResult.ok === true ? 'PASS' : 'FAIL',
                execution_kind: 'SYSTEM_EXECUTE',
                shell_action: actResult.shell_action || null,
                execution_receipt: actResult.receipt || null,
                human_summary: human,
                done_synopsis: actResult.done_synopsis || actResult.human_summary || null,
                route_act_fastpath: true,
                ...(persistWarning ? { persist_warning: persistWarning } : {}),
                ...fiRouteStamp(),
              }, 'system_action'));
            }
          } catch (actErr) {
            _log(`route_act_fastpath_error=${actErr.message}`);
          }
        }
      }

      // Founder usability verdict from plain chat (Wave 0 item 3).
      // Soft status/continuation probes must NEVER record FOUNDER_USABILITY_PASS.
      // parseFounderUsabilityVerdict is fail-closed; COMMAND_RAN only if confirm wrote.
      if (originalText) {
        try {
          const gated = loadFounderGatedMissions();
          if (gated.length) {
            const verdict = parseFounderUsabilityVerdict(originalText);
            if (verdict) {
              const target = (missionId && gated.find((m) => m.mission_id === missionId)) || gated[0];
              if (verdict.pass && originalText.trim().length < 12) {
                clearTimeout(handlerDeadline);
                return res.status(200).json({
                  ok: true,
                  interface: 'Lumin',
                  action: 'chair',
                  chair_direct_agent: true,
                  command_truth: 'NO_COMMAND_RAN',
                  pass_fail: 'NO_COMMAND_RAN',
                  awaiting_founder_confirmation: target.mission_id,
                  human_summary: `Want to sign off ${target.mission_id} as working? Tell me one line about what you tried (e.g. "signed up and logged in, works great") — I record your words as the proof, so I need a full sentence, not just "works".`,
                });
              }
              const result = confirmFounderUsability({
                missionId: target.mission_id,
                pass: verdict.pass,
                quote: originalText.trim(),
                actor: req.lifeosUser?.email || req.lifeosUser?.id || 'founder',
              });
              const recorded = result.ok === true;
              if (recorded) {
                try {
                  await scorePredictionsForMissionUsability(target.mission_id, {
                    pass: verdict.pass,
                    quote: originalText.trim(),
                  });
                } catch { /* prediction scoring is best-effort */ }
              }
              clearTimeout(handlerDeadline);
              return res.status(200).json({
                ...result,
                interface: 'Lumin',
                action: 'chair',
                chair_direct_agent: true,
                founder_usability_recorded: recorded,
                command_truth: recorded ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
                pass_fail: recorded ? (verdict.pass ? 'PASS' : 'FAIL') : 'FAIL',
                human_summary: recorded
                  ? (verdict.pass
                    ? `Recorded your sign-off on ${target.mission_id} — that's the founder verdict only you can give, so Point B is now clear on that gate. I logged your exact words as the proof.`
                    : `Recorded that ${target.mission_id} is NOT working for you yet. It stays blocked and goes back for a fix — tell me what was wrong and I'll route it.`)
                  : (result.error || 'Could not record the verdict.'),
              });
            }
          }
        } catch (verdictErr) {
          _log(`usability_verdict_error=${verdictErr.message}`);
        }
      }

      // LifeOS feature build via governed BUILD_QUEUE (founder UI = conductor).
      // Never route this to intake_blueprint theater.
      if (originalText && isLifeosQueueBuildIntent(originalText)) {
        _log('lifeos_queue_build_intent');
        try {
          const queue = loadBuildQueue('lifeos');
          const claimed = queue ? await claimPreExistingSatisfiedSteps(queue) : [];
          if (claimed.length && queue) {
            persistQueue(queue);
            // Container-local persist alone evaporates on redeploy — commit status.
            try {
              await commitQueueStatusToRepo(queue, `pre_existing:${claimed.join(',')}`);
            } catch (commitErr) {
              _log(`lifeos_queue_claim_commit_error=${commitErr.message}`);
            }
          }
          const tick = await runGovernedAutonomousShipOnce({ logger: console, maxStepsPerProduct: 2 });
          const status = getGovernedAutonomousShipStatus()?.governed_autonomous_ship || {};
          const q2 = loadBuildQueue('lifeos');
          const by = {};
          for (const s of q2?.steps || []) by[s.status] = (by[s.status] || 0) + 1;
          const open = (q2?.steps || [])
            .filter((s) => s.status !== STEP_STATUS.DONE && s.status !== 'skipped')
            .slice(0, 8)
            .map((s) => `${s.id}:${s.status}:${String(s.last_error || '').slice(0, 80)}`);
          clearTimeout(handlerDeadline);
          return res.status(200).json({
            ok: true,
            interface: 'Lumin',
            action: 'lifeos_queue_ship',
            chair_direct_agent: true,
            command_truth: 'COMMAND_RAN',
            pass_fail: tick?.ok ? 'PASS' : 'FAIL',
            execution_kind: 'command',
            lifeos_queue: { counts: by, pre_existing_claimed: claimed, open },
            governed_tick: {
              ok: tick?.ok,
              shipped: tick?.shipped,
              reason: tick?.reason || tick?.error,
              products: tick?.products,
            },
            human_summary: [
              'Directed LifeOS through the governed BUILD_QUEUE (not blueprint intake).',
              claimed.length ? `Closed ${claimed.length} already-built step(s): ${claimed.join(', ')}.` : '',
              `This tick shipped ${tick?.shipped ?? 0} step(s).`,
              tick?.reason ? `Planner note: ${tick.reason}.` : '',
              `Queue now: ${JSON.stringify(by)}.`,
              open.length ? `Still open: ${open.join(' | ')}` : 'No open LifeOS steps.',
              `Governed loop totalRuns=${status.totalRuns ?? '?'} lastShipped=${status.lastShipped ?? '?'}.`,
            ].filter(Boolean).join(' '),
          });
        } catch (lifeosErr) {
          _log(`lifeos_queue_build_error=${lifeosErr.message}`);
          clearTimeout(handlerDeadline);
          return res.status(200).json({
            ok: false,
            interface: 'Lumin',
            action: 'lifeos_queue_ship',
            command_truth: 'COMMAND_RAN',
            pass_fail: 'FAIL',
            human_summary: `Tried to ship LifeOS BUILD_QUEUE via governed loop; failed: ${lifeosErr.message}`,
          });
        }
      }

      // Normalize input first: fix misspellings, voice-to-text errors, garbled phrasing
      const buildIntentEarly = isBuildRequest(originalText) || isRepairContinuationIntent(originalText) || isFounderShipOrUsabilityIntent(originalText);
      const skipNormalize = buildIntentEarly
        || shouldSkipInputNormalize(originalText, action)
        || isFounderPersonalLifeIntent(originalText)
        || req.body?.alpha_probe === true
        || needsSystemKnowledge(originalText)
        || isIntakeBlueprintIntent(originalText);
      _log(`skipNormalize=${skipNormalize}`);
      const cleanedInput = skipNormalize
        ? originalText.trim()
        : await normalizeInputText(originalText);
      _log('cleanedInput_done');
      const inputWasCleaned = cleanedInput !== originalText;

      const inferredDisplayScope = summarizeDisplayRequest(cleanedInput);
      const explicitExecute = action === 'execute' || isExplicitExecuteCommand(cleanedInput);
      const executeIntent = isLikelyExecuteIntent(cleanedInput) || explicitExecute;
      const doPrefix = stripChairDoPrefix(originalText);
      const shouldDisplayOnly = !explicitExecute
        && !doPrefix.forcedExecute
        && !buildIntentEarly
        && action !== 'build'
        && isExplicitDisplayOnlyRequest(cleanedInput, action);
      const normalizedText = shouldDisplayOnly ? cleanedInput : normalizeFounderExecuteIntent(cleanedInput);
      const intakeNormalized = inputWasCleaned || normalizedText !== cleanedInput;

      if (!shouldDisplayOnly) {
        const role = String(req.lifeosUser?.role || '').toLowerCase();
        if (!EXECUTE_ALLOWED_ROLES.has(role)) {
          return res.status(403).json({
            ok: false,
            interface: 'LifeOS Founder Interface',
            action: 'execute',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'FAIL',
            reason: 'ROLE_FORBIDDEN_EXECUTE',
            error: `Role ${role || 'unknown'} cannot execute BuilderOS commands`,
            auth_mode: req.auth_mode || 'unknown',
            user_role: req.lifeosUser?.role || null,
          });
        }
      }

      _log('pre_inboxGate');
      let inboxGate = null;
      if (!shouldDisplayOnly && founderIntakeGate) {
        inboxGate = await founderIntakeGate.captureAndGate(req, {
          text: cleanedInput,
          sessionId: req.body?.session_id || null,
          forceApprove: force || explicitExecute,
          autoApproveRoles: EXECUTE_ALLOWED_ROLES,
        });
        _log('post_inboxGate');
        if (inboxGate?.private) {
          const privateReply = 'Private — not saved. Session only.';
          await persistFounderTurn(req, cleanedInput, privateReply);
          return res.status(200).json(lockFounderResponse({
            ok: true,
            interface: 'LifeOS Founder Interface',
            action: 'private',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'NO_COMMAND_RAN',
            human_summary: privateReply,
            classification: inboxGate.classification,
            auth_mode: req.auth_mode || 'unknown',
          }, 'private'));
        }
        const inboxBlocker = formatInboxGateBlocker(inboxGate);
        if (inboxBlocker) {
          const persistWarning = await persistFounderTurn(req, cleanedInput, inboxBlocker);
          return res.status(200).json(lockFounderResponse({
            ok: true,
            interface: 'LifeOS Founder Interface',
            action: 'staged',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'NO_COMMAND_RAN',
            reason: 'ACTION_INBOX_STAGED',
            inbox_item_id: inboxGate.inbox_item_id,
            classification: inboxGate.classification,
            human_summary: inboxBlocker,
            auth_mode: req.auth_mode || 'unknown',
            ...(persistWarning ? { persist_warning: persistWarning } : {}),
          }, 'staged'));
        }
      }

      const useTerminalForBuild = inboxGate?.requires_terminal === true;
      const operatorKey = getForwardedOperatorKey(req)
        || process.env.COMMAND_CENTER_KEY
        || process.env.LIFEOS_KEY
        || process.env.API_KEY;
      const userId = req.lifeosUser?.sub || null;
      const userHandle = resolveFounderCommandControlHandle(req);

      _log('pre_chairTurn');
      const chairTurnPromise = runLuminChairTurn({
        req,
        originalText,
        cleanedInput,
        normalizedText,
        textFile: req.body?.text_file || null,
        stage,
        missionId,
        force,
        shouldDisplayOnly,
        explicitExecute,
        executeIntent,
        useTerminalForBuild,
        inferredDisplayScope,
        displayScope: req.body?.display_scope,
        sourceMode,
        dictateThenSend,
        conversationalMode,
        intakeNormalized,
        inboxGate,
        auth_mode: req.auth_mode || 'unknown',
        user_role: req.lifeosUser?.role || null,
        useAsync: req.body?.async !== false && process.env.FOUNDER_BUILD_ASYNC !== '0',
        explicitAction: action,
        confirmIntent: req.body?.confirm_intent === true || force || isFounderConfirmIntent(cleanedInput) || stripChairDoPrefix(originalText).forcedExecute,
        userId,
        userHandle,
        conversationHistory: Array.isArray(req.body?.conversation_history) ? req.body.conversation_history : [],
        uiContext: req.body?.ui_context && typeof req.body.ui_context === 'object' ? req.body.ui_context : null,
        alphaProbe: req.body?.alpha_probe === true,
      }, {
        buildDisplayBundle,
        translateToPlainEnglish,
        runBpbIntakeGateForMission,
        runTerminalBridgeIntake,
        wrapBridgeResultAsTruth,
        formatExecutionTruthReply,
        luminConverse,
        loadChairMemoryContext: loadLuminMemory,
        translateChairPersonality,
        sanitizeConversationReply,
        routeToBuilder,
        founderBuildResponsePayload,
        startFounderBuildJob,
        resolveBuildTaskForFounder,
        buildBuildFailureReceipt,
        enforceExecutionTruth,
        founderBuildBaseUrl: resolveFounderBuildBaseUrl(),
        repoRoot: REPO_ROOT,
        operatorKey,
        callCouncilMember,
        pool,
        luminPersist,
        resolveUserId: async (handle) => {
          if (!pool || !handle) return null;
          return resolveLifeOSUserId(pool, handle);
        },
      });

      const CHAIR_TURN_BUDGET_MS = Number(process.env.CHAIR_TURN_BUDGET_MS || '90000');
      let chairTurnTimer;
      const chairTurnTimeout = new Promise((resolve) => {
        chairTurnTimer = setTimeout(() => resolve({
          statusCode: 200,
          body: {
            ok: true,
            interface: 'Lumin',
            action: 'chair',
            chair_channel: 'chair',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'NO_COMMAND_RAN',
            timed_out: true,
            human_summary: "That turn took longer than expected, so I stopped it to keep the chat responsive — nothing was committed. Please try again; if it keeps timing out, an AI provider is slow right now.",
          },
        }), CHAIR_TURN_BUDGET_MS);
      });
      chairTurnPromise.catch(() => {});
      let chairResult;
      try {
        chairResult = await Promise.race([chairTurnPromise, chairTurnTimeout]);
      } catch (chairErr) {
        clearTimeout(chairTurnTimer);
        chairResult = {
          statusCode: 200,
          body: {
            ok: false,
            interface: 'Lumin',
            action: 'chair',
            chair_channel: 'chair',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'FAIL',
            timed_out: true,
            human_summary: `Chair turn failed: ${String(chairErr?.message || chairErr).slice(0, 200)}. Try again.`,
          },
        };
      }
      clearTimeout(chairTurnTimer);

      const persistWarning = req.body?.alpha_probe === true
        ? 'ALPHA_PROBE_SKIP_PERSIST'
        : await persistFounderTurn(req, cleanedInput, chairResult.body.human_summary, {
          command_truth: chairResult.body.command_truth || 'NO_COMMAND_RAN',
        });
      clearTimeout(handlerDeadline);

      // ── Cognitive Core: auto-capture the founder's real ship/build DECISION ──
      // Every real build turn becomes a journaled decision carrying a falsifiable
      // prediction at a confidence inferred from Adam's OWN words (never the builder's).
      // Fire-and-forget: this must never affect the reply or add latency. The async
      // sweep (same process → same in-memory job store) resolves prior builds whose
      // jobs have since finished, deterministically keyed by job_id (no mis-attribution).
      try {
        const cb = chairResult?.body || {};
        const isBuildTurn = /^(build|execute)$/i.test(String(cb.action || ''))
          || ['build_async', 'build_terminal', 'execute', 'blueprint_execute'].includes(String(cb.chair_channel || ''))
          || /BUILD_ATTEMPTED|BUILD_/i.test(String(cb.command_truth || ''))
          || cb.job_id != null;
        if (isBuildTurn && pool && process.env.COGNITIVE_CORE_CAPTURE !== '0') {
          const capUserId = String(userId || userHandle || '1');
          const capText = originalText || cleanedInput || '';
          const capThread = req.body?.thread_id || req.body?.conversation_id || null;
          const capStakes = (req.body?.ui_context && req.body.ui_context.stakes) || 'medium';
          Promise.resolve().then(async () => {
            const capture = createCognitiveCoreCapture({ pool, logger: console });
            const rec = await capture.captureBuildDecision({
              userId: capUserId,
              text: capText,
              threadId: capThread,
              stakes: capStakes,
              jobId: cb.job_id || null,
              commitSha: cb.commit_sha || null,
              channel: cb.chair_channel || cb.action || null,
            });
            if (rec?.ok && rec.decision_id && !rec.deduped
              && cb.commit_sha && /^(PASS|FAIL)$/.test(String(cb.pass_fail || '').toUpperCase())) {
              await capture.resolveCaptured({
                userId: capUserId,
                decisionId: rec.decision_id,
                commitSha: cb.commit_sha,
                passFail: String(cb.pass_fail).toUpperCase(),
              });
            }
            await capture.sweepOpenBuildDecisions({ userId: capUserId }).catch(() => {});
          }).catch((e) => console.warn('[cognitive-core-capture] boundary capture failed:', e?.message));
        }
      } catch (_) { /* capture must never break the reply */ }

      if (res.headersSent) return;
      const locked = lockFounderResponse(chairResult.body, chairResult.body.chair_channel || 'founder_interface');
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.status(chairResult.statusCode).json({
        ...locked,
        ...fiRouteStamp(),
        ...(persistWarning ? { persist_warning: persistWarning } : {}),
      });
    } catch (error) {
      clearTimeout(handlerDeadline);
      next(error);
    }
  });

  router.get('/founder-interface/source-proof', requireFounderInterfaceAuth, (_req, res) => {
    const probeText = ['open', 'food'].join(' ');
    let diskSnippet = null;
    let parseProbe = null;
    try {
      const src = fs.readFileSync(FI_ROUTE_FILE, 'utf8');
      diskSnippet = {
        bytes: src.length,
        has_nav_canary: src.includes("nav_canary: 'fi-nav-v1'"),
        has_inline_nav: src.includes('parseShellNavigateInline'),
        has_marker: src.includes(FI_ROUTE_MARKER),
        has_food_page_literal: src.includes('lifeos-food.html'),
      };
      const inline = parseShellNavigateInline(probeText);
      const imported = parseLuminChairSystemAction(probeText);
      const foodEntry = INLINE_NAV_PAGES.find((e) => e.page === 'lifeos-food.html') || null;
      parseProbe = {
        probeText,
        inline,
        imported,
        inline_pages: INLINE_NAV_PAGES.length,
        food_entry: foodEntry,
        regex_match: probeText.match(/\b(?:open|go to|show|launch|switch to|take me to|navigate to)\s+(?:the\s+)?(.+?)\s$/i)?.[1] || null,
      };
    } catch (err) {
      diskSnippet = { error: err.message };
      parseProbe = { error: err.message };
    }
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.status(200).json({
      ok: true,
      ...fiRouteStamp(),
      deploy_commit_sha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
      disk: diskSnippet,
      parse_probe: parseProbe,
    });
  });

  return router;
}