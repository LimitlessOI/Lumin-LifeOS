/**
 * Voice Rail v1 — LifeOS communication layer (sessions, intents, staging).
 * Operator policy: no canned/template operator-facing replies — council or fail-closed.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_PACKET.md
 */
import fs from 'fs/promises';
import path from 'path';
import {
  buildDepartmentSystemPrompt,
  listVoiceRailDepartmentsPublic,
  normalizeVoiceRailDepartment,
} from '../config/voice-rail-departments.js';
import { resolveFounderVoiceRailRouting } from '../config/voice-rail-founder-routing.js';
import {
  FOUNDER_CONTINUOUS_SESSION_TAG,
  listVoiceRailProviderPicks,
  normalizeProviderMemberKey,
} from '../config/voice-rail-providers.js';
import memorySystem from '../core/memory-system.js';
import {
  attachmentsForStorage,
  describeVoiceRailImages,
  normalizeVoiceRailAttachments,
} from './voice-rail-attachments.js';
import { buildSystemContext } from './knowledge-context.js';
import { retrieveCapsules } from './memory-retrieval.js';
import {
  detectShallowCouncilReply,
  filterCapsulesForDepartment,
  getSessionRoutingState,
  persistFounderPreferenceSignal,
  saveSessionRoutingState,
  detectEscalationAsk,
} from './voice-rail-founder-memory.js';
import { fetchVoiceRailUsageReceipt } from './voice-rail-usage-receipt.js';
import {
  buildExecutionTruthPromptBlock,
  VOICE_RAIL_EXECUTION_MANIFEST,
  enforceExecutionTruth,
  buildVoiceRailExecutionManifest,
} from './voice-rail-execution-truth.js';
import {
  executeVoiceRailFounderCommand,
  formatCommandSystemReply,
  isVoiceRailCommandExecuteEnabled,
  shouldRouteFounderToSystem,
} from './voice-rail-command-executor.js';

import {
  handleSystemDirectMessage,
  buildSystemDirectReplySource,
} from './voice-rail-system-direct.js';
import {
  runFounderSystemToolPass,
  buildLifeOSOperatorSystemPrompt,
  buildLifeOSOperatorReplySource,
} from './voice-rail-system-operator.js';

const MODES = new Set(['lifeos', 'system', 'conversation', 'command', 'brainstorm', 'private']);
const INTENTS = new Set([
  'command',
  'brainstorm',
  'commitment',
  'governance_correction',
  'emotional',
  'venting',
  'general_conversation',
]);

const PRIVATE_MODE_NOTICE =
  'Off-record: not saved. No council reply in Private mode — switch to Conversation to talk to LifeOS.';

export function classifyIntent(text, mode = 'conversation') {
  const raw = String(text || '').trim();
  const t = raw.toLowerCase();
  if (!t) return 'general_conversation';

  if (/!{2,}/.test(raw) || /\b[A-Z]{4,}\b/.test(raw)) {
    return 'emotional';
  }

  if (/\b(policy|routing|wrong system|should not|governance|ssot|drift)\b/.test(t)) {
    return 'governance_correction';
  }
  if (/\b(frustrated|angry|stressed|overwhelmed|vent|upset|furious|pissed|annoyed|irritated|livid|sad|depressed|anxious|excited|thrilled|happy|worried|scared|tired|exhausted)\b/.test(t)) {
    return 'emotional';
  }
  if (/\b(i will|i'll|i promise|commit to|by friday|by tomorrow|follow through)\b/.test(t)) {
    return 'commitment';
  }
  if (mode === 'brainstorm' || /\b(what if|brainstorm|ideas? for|could we explore)\b/.test(t)) {
    return 'brainstorm';
  }
  if (
    mode === 'command'
    || /\b(please run|please build|please fix|deploy|execute|do this now|make the system)\b/.test(t)
  ) {
    return 'command';
  }
  if (
    /\b(send (this )?to|route (this )?to|forward to|hand (this )?off to)\b/.test(t)
    && /\b(bpb|blueprint|cdr|builderos|builder)\b/.test(t)
  ) {
    return 'command';
  }
  return 'general_conversation';
}

function normalizeIntent(intent) {
  const i = String(intent || '').toLowerCase();
  if (i === 'venting') return 'emotional';
  return INTENTS.has(i) ? i : 'general_conversation';
}

function sessionAlreadyExplainedIdentity(priorMessages, deptId) {
  const dept = normalizeVoiceRailDepartment(deptId);
  return (priorMessages || []).some(
    (m) =>
      m.role === 'assistant'
      && (m.department === dept || /\b(council chair|ChC|department|voice rail)\b/i.test(m.content)),
  );
}

function normalizeForCompare(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isNearDuplicateReply(a, b) {
  if (!a || !b) return false;
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  const chunk = Math.min(120, na.length, nb.length);
  if (chunk < 40) return false;
  return na.slice(0, chunk) === nb.slice(0, chunk);
}

function isIdentityOrRoleQuestion(text) {
  return /\b(who are you|what(?:'s| is) your role|identify yourself|role within|who am i|who i am|position within|within (?:the )?system|within lumen|within lifeos)\b/i.test(
    String(text || ''),
  );
}

function isSystemOrMemoryQuestion(text) {
  return /\b(system|health|project|mission|builder|deploy|memory|remember|worked on|what did we|continuity|voice rail|council|railway)\b/i.test(
    String(text || ''),
  );
}

function isStructuredVoiceRailReply(text) {
  const raw = String(text || '');
  return (
    /\bcommand_execution_receipt\b/i.test(raw)
    || /\bEXEC RECEIPT\b/i.test(raw)
    || /\bVERDICT:\s*(PASS|FAIL)/i.test(raw)
    || /\bTHEATER CHECK\b/i.test(raw)
    || /^\s*\d+[.)]\s/m.test(raw)
    || (/\bjob_id\b/i.test(raw) && /\b(builder_failed|commit_sha|root_cause)\b/i.test(raw))
  );
}

function isStructuredUserQuestion(text) {
  const q = String(text || '');
  return (
    isSystemOrMemoryQuestion(q)
    || /\b(CONNECTED|THEATER CHECK|VERDICT|command_execution|job_id|builder_failed|root cause)\b/i.test(q)
    || /\b\d+[.)]\s/.test(q)
  );
}

export function sanitizeVoiceRailReply(text, priorAssistants, operatorName, userQuestion) {
  const name = operatorName || 'Adam';
  let raw = String(text || '').trim();
  raw = raw.replace(/^ANSWER:\s*/gim, '');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const kept = lines.filter((line) => {
    if (/^ANSWER:/i.test(line)) return false;
    if (/^Same as above/i.test(line)) return false;
    if (/^You asked about/i.test(line)) return false;
    if (/^You'?re verified as/i.test(line)) return false;
    if (/^I'm here to (help|provide|assist)/i.test(line)) return false;
    if (/don't have a role within/i.test(line)) return false;
    if (/conversational gateway/i.test(line)) return false;
    if (/^I'?m (a )?Voice Rail/i.test(line)) return false;
    if (/^I'?m Lumin on Voice Rail/i.test(line)) return false;
    if (/don'?t retain memory|each session starts fresh|no record of prior|I have no memory across/i.test(line)) {
      return false;
    }
    return true;
  });
  const structured = isStructuredVoiceRailReply(raw) || isStructuredUserQuestion(userQuestion);
  let out = structured ? kept.join('\n').trim() : kept.join(' ').replace(/\s+/g, ' ').trim();
  out = out.replace(/\bLumen\b/g, 'LifeOS');
  if (!structured) {
    const maxLen = isSystemOrMemoryQuestion(userQuestion) ? 1400 : 720;
    if (out.length > maxLen) {
      const sentences = out.match(/[^.!?]+[.!?]+/g) || [out];
      out = sentences.slice(0, isSystemOrMemoryQuestion(userQuestion) ? 6 : 3).join(' ').trim();
    }
  } else if (out.length > 6000) {
    out = `${out.slice(0, 5800).trim()}\n\n[truncated — use EXEC RECEIPT / Poll for machine truth]`;
  }
  const priors = (priorAssistants || []).filter((m) => m.role === 'assistant').map((m) => m.content);
  if (!structured) {
    for (const prev of priors.slice(-2)) {
      if (isNearDuplicateReply(out, prev)) {
        return `${name}, I already said that — what do you want to tackle next?`;
      }
    }
  }
  return out || `${name}, council returned nothing usable — try again; if it repeats, check Railway logs for council_unavailable.`;
}

async function readMissionQueueHead() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'builderos-reboot', 'BP_PRIORITY.json'), 'utf8');
    const q = JSON.parse(raw);
    const list = q.items || [];
    const items = [];
    for (const m of [...list].sort((a, b) => (a.rank || 0) - (b.rank || 0)).slice(0, 6)) {
      const row = {
        rank: m.rank,
        mission_id: m.mission_id,
        verdict: m.verdict || m.receipt_verdict || null,
        blueprint_path: m.blueprint_path || null,
        next_step: null,
      };
      if (m.blueprint_path) {
        try {
          const bpRaw = await fs.readFile(path.join(process.cwd(), m.blueprint_path), 'utf8');
          const bp = JSON.parse(bpRaw);
          const pending = (bp.steps || []).find((s) => s.status !== 'complete');
          if (pending) {
            row.next_step = {
              step_id: pending.step_id,
              title: pending.title,
              target_file: pending.target_file || null,
              action_type: pending.action_type || null,
            };
          }
        } catch {
          row.next_step = { error: 'blueprint_unreadable' };
        }
      }
      items.push(row);
    }
    return items;
  } catch {
    return [];
  }
}

async function readContinuityTail() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), 'docs', 'CONTINUITY_LOG.md'), 'utf8');
    return text.slice(-4000);
  } catch {
    return null;
  }
}

async function readLifeOSProductBrief() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), 'docs', 'projects', 'AMENDMENT_21_LIFEOS_CORE.md'), 'utf8');
    return text.slice(0, 4500);
  } catch {
    return null;
  }
}

/** Founder-visible honesty receipt — what LifeOS data actually loaded for this turn. */
export function summarizeVoiceRailContextHealth(contextData) {
  const ctx = contextData || {};
  const counts = {
    voice_rail_history: Array.isArray(ctx.voice_rail_history) ? ctx.voice_rail_history.length : 0,
    verified_memories: Array.isArray(ctx.verified_memories) ? ctx.verified_memories.length : 0,
    goals: Array.isArray(ctx.goals) ? ctx.goals.length : 0,
    staged_commands: Array.isArray(ctx.staged_commands) ? ctx.staged_commands.length : 0,
    mission_queue_head: Array.isArray(ctx.mission_queue_head) ? ctx.mission_queue_head.length : 0,
    recent_commitments: Array.isArray(ctx.recent_commitments) ? ctx.recent_commitments.length : 0,
    has_lifeos_snapshot: Boolean(
      ctx.lifeos_snapshot && typeof ctx.lifeos_snapshot === 'object' && Object.keys(ctx.lifeos_snapshot).length,
    ),
    has_continuity_log: Boolean(String(ctx.continuity_log_tail || '').trim().length > 80),
    has_product_brief: Boolean(String(ctx.lifeos_product_brief || '').trim().length > 80),
    memory_capsules: Array.isArray(ctx.memory_capsules) ? ctx.memory_capsules.length : 0,
    has_communication_profile: Boolean(String(ctx.founder_communication_profile || '').trim().length > 40),
    sot_knowledge_chars: Number(ctx.sot_knowledge_chars) || 0,
    deploy_commit_sha: ctx.deploy_commit_sha || null,
  };

  const signals = [
    counts.voice_rail_history > 0,
    counts.verified_memories > 0,
    counts.has_lifeos_snapshot,
    counts.has_continuity_log,
    counts.mission_queue_head > 0,
    counts.has_product_brief,
    counts.memory_capsules > 0,
    counts.has_communication_profile,
    counts.sot_knowledge_chars > 200,
  ].filter(Boolean).length;

  let level = 'empty';
  if (signals >= 4) level = 'connected';
  else if (signals >= 2) level = 'partial';
  else if (signals >= 1) level = 'thin';

  const honestyNoteByLevel = {
    empty:
      'No LifeOS data loaded this turn — this is dept prompt + raw model only. Say so if asked about system state.',
    thin: 'Thin LifeOS context — only partial DB/files loaded. Cite payload only; name what is missing.',
    partial: 'Partial LifeOS context — use payload below; do not invent beyond it.',
    connected: 'LifeOS context loaded (history, memories, continuity, missions, SOT).',
  };

  return {
    level,
    connected: level === 'connected' || level === 'partial',
    sufficient_for_founder_reply: null, // filled by caller after SOT inject
    counts,
    loaded_at: ctx.loaded_at || null,
    honesty_note: honestyNoteByLevel[level],
  };
}

/** Default ON — set VOICE_RAIL_FAIL_CLOSED=0 only for local debugging. */
export function isVoiceRailFailClosedEnabled() {
  const v = String(process.env.VOICE_RAIL_FAIL_CLOSED ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

/** Minimum bar — partial/static-only context = FAIL (founder comms). */
export function isVoiceRailContextSufficientForFounderReply(contextHealth) {
  if (!contextHealth?.counts) return false;
  const { level, counts } = contextHealth;
  if (level !== 'connected') return false;
  if (!counts.sot_knowledge_chars || counts.sot_knowledge_chars < 200) return false;
  const hasLive =
    (counts.verified_memories || 0) > 0
    || (counts.memory_capsules || 0) > 0
    || counts.has_lifeos_snapshot
    || (counts.voice_rail_history || 0) > 2;
  if (!hasLive) return false;
  return true;
}

function contextNotConnectedError(routing, contextHealth) {
  const err = new Error('lifeos_context_not_connected');
  err.status = 503;
  err.code = 'LIFEOS_CONTEXT_NOT_CONNECTED';
  err.detail = {
    reason:
      'LifeOS context did not load to the minimum bar — reply blocked (fail-closed). Not a model reply; fix connection.',
    context_health: contextHealth,
    policy: 'fail_closed_founder_comms',
    fail_closed: isVoiceRailFailClosedEnabled(),
    council_member: routing?.resolvedKey || routing?.memberKey,
    model_id: routing?.modelId,
    provider: routing?.provider,
    department: routing?.department,
    counts: contextHealth?.counts || null,
  };
  return err;
}

/** Operator-facing context: DB + memories + capsules + comm profile + cross-session voice rail. */
export async function buildVoiceRailOperatorContext({
  pool,
  userId,
  lumin,
  communicationProfile,
  departmentId = 'ChC',
  logger,
}) {
  const ctx = { loaded_at: new Date().toISOString() };
  const tasks = [];

  if (lumin?.buildContextSnapshot) {
    tasks.push(
      lumin.buildContextSnapshot(userId, { mode: 'planning' }).then((s) => {
        ctx.lifeos_snapshot = s;
      }).catch((e) => {
        logger?.warn?.({ err: e.message }, 'voice-rail lifeos snapshot failed');
      }),
    );
  }

  tasks.push(
    pool.query(
      `SELECT m.role, LEFT(m.content, 2000) AS content, m.department, m.created_at
         FROM voice_rail_messages m
         JOIN voice_rail_sessions s ON s.id = m.session_id
        WHERE s.user_id = $1 AND m.is_interim = FALSE
        ORDER BY m.created_at DESC
        LIMIT 30`,
      [userId],
    ).then((r) => {
      ctx.voice_rail_history = (r.rows || []).reverse();
    }).catch((e) => {
      logger?.warn?.({ err: e.message }, 'voice-rail history load failed');
      ctx.voice_rail_history = [];
    }),

    pool.query(
      `SELECT utterance, status, created_at
         FROM voice_rail_staged_commands
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
      [userId],
    ).then((r) => {
      ctx.staged_commands = r.rows || [];
    }).catch(() => {
      ctx.staged_commands = [];
    }),

    memorySystem.retrieveMemories('facts', { minConfidence: 0.7, limit: 20 }).then((rows) => {
      ctx.verified_memories = (rows || []).map((m) => ({
        content: m.content,
        confidence: m.confidence,
        type: m.type,
      }));
    }).catch(() => {
      ctx.verified_memories = [];
    }),

    memorySystem.retrieveMemories('goals', { minConfidence: 0.7, limit: 10 }).then((rows) => {
      ctx.goals = (rows || []).map((m) => m.content);
    }).catch(() => {
      ctx.goals = [];
    }),

    readMissionQueueHead().then((m) => {
      ctx.mission_queue_head = m;
    }),

    readContinuityTail().then((t) => {
      ctx.continuity_log_tail = t;
    }),

    readLifeOSProductBrief().then((t) => {
      ctx.lifeos_product_brief = t;
    }),
  );

  if (communicationProfile?.getProfileForPrompt) {
    tasks.push(
      communicationProfile.getProfileForPrompt(userId).then((p) => {
        ctx.founder_communication_profile = p || null;
      }).catch((e) => {
        logger?.warn?.({ err: e.message }, 'voice-rail communication profile failed');
        ctx.founder_communication_profile = null;
      }),
    );
  }

  tasks.push(
    retrieveCapsules(
      'LifeOS founder voice rail operator context',
      'context_lane',
      'voice_rail_founder',
      'founder_comms_wearing_dept_hat',
      'context_only',
      pool,
    ).then((r) => {
      ctx.memory_capsules = (r.results || []).slice(0, 15).map((c) => ({
        capsule_id: c.capsule_id,
        title: c.title,
        truth_class: c.truth_class,
        trust_level: c.trust_level,
        task_scope: c.task_scope,
      }));
      ctx.memory_capsule_provenance = r.provenance?.length || 0;
    }).catch((e) => {
      logger?.warn?.({ err: e.message }, 'voice-rail memory capsule retrieve failed');
      ctx.memory_capsules = [];
    }),
  );

  tasks.push(
    pool.query(
      `SELECT title, status, due_at, updated_at
         FROM commitments
        WHERE user_id = $1
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 12`,
      [userId],
    ).then((r) => {
      ctx.recent_commitments = r.rows || [];
    }).catch(() => {
      ctx.recent_commitments = [];
    }),
  );

  await Promise.allSettled(tasks);
  if (ctx.memory_capsules?.length) {
    ctx.memory_capsules_all = ctx.memory_capsules.length;
    ctx.memory_capsules = filterCapsulesForDepartment(ctx.memory_capsules, departmentId);
  }
  ctx.department_hat = normalizeVoiceRailDepartment(departmentId);
  ctx.deploy_commit_sha =
    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || process.env.DEPLOY_COMMIT_SHA || null;
  return ctx;
}

function councilUnavailableError(routing, reason) {
  const err = new Error('council_unavailable');
  err.status = 503;
  err.code = 'COUNCIL_UNAVAILABLE';
  err.detail = {
    reason,
    council_member: routing?.resolvedKey || routing?.memberKey,
    model_id: routing?.modelId,
    provider: routing?.provider,
    department: routing?.department,
    policy: 'no_canned_or_template_operator_replies',
  };
  return err;
}

function formatCouncilReply(raw) {
  const text = typeof raw === 'string' ? raw : (raw?.content || raw?.text || '');
  return String(text || '').trim().replace(/\n{3,}/g, '\n\n').slice(0, 8000);
}

async function generateCouncilReply({
  pool,
  callCouncilMember,
  lumin,
  communicationProfile,
  userId,
  sessionId,
  listMessagesFn,
  content,
  mode,
  intent,
  department,
  routing,
  councilMemberOverride,
  councilMembers,
  councilAliasMap,
  tierBoost = 0,
  operator,
  commandExecutionReceipt = null,
  operatorMode = false,
  toolPass = null,
  logger,
}) {
  if (!callCouncilMember) {
    throw councilUnavailableError(routing, 'callCouncilMember not configured');
  }

  const deptId = operatorMode
    ? 'LifeOS'
    : normalizeVoiceRailDepartment(department || routing?.department);
  const intentNorm = intent || 'general_conversation';

  let contextData = {};
  try {
    contextData = await buildVoiceRailOperatorContext({
      pool,
      userId,
      lumin,
      communicationProfile,
      departmentId: deptId,
      logger,
    });
  } catch (ctxErr) {
    logger?.warn?.({ err: ctxErr.message }, 'voice-rail operator context failed');
  }

  if (commandExecutionReceipt) {
    contextData.command_execution_receipt = commandExecutionReceipt;
  }
  if (toolPass) {
    contextData.system_tool_results = toolPass.tool_summary;
    contextData.system_tool_action = toolPass.action;
  }

  const history = await listMessagesFn(sessionId, userId);
  const prior = (history || []).slice(0, -1).slice(-10);
  const operatorName = operator?.display_name || 'Adam';
  const threadText = prior
    .map((m) => {
      const label =
        m.role === 'user'
          ? operatorName
          : operatorMode
            ? 'LifeOS'
            : normalizeVoiceRailDepartment(m.department || deptId);
      return `${label}: ${m.content}`;
    })
    .join('\n\n');

  let repeatHint = '';
  if (isIdentityOrRoleQuestion(content) && sessionAlreadyExplainedIdentity(prior, deptId)) {
    repeatHint =
      '\n\nOne sentence only — identity already established. Do NOT restate who the founder is.\n';
  }

  let sotSection = '';
  try {
    sotSection = await buildSystemContext(content, { taskType: 'voice_rail_department', maxIdeas: 3 });
    if (sotSection) contextData.sot_knowledge_chars = sotSection.length;
  } catch (sotErr) {
    logger?.warn?.({ err: sotErr.message }, 'voice-rail SOT knowledge inject failed');
  }

  const contextHealth = summarizeVoiceRailContextHealth(contextData);
  contextHealth.sufficient_for_founder_reply = isVoiceRailContextSufficientForFounderReply(contextHealth);

  if (isVoiceRailFailClosedEnabled() && !contextHealth.sufficient_for_founder_reply) {
    logger?.warn?.(
      { level: contextHealth.level, counts: contextHealth.counts },
      'voice-rail fail-closed — context not connected',
    );
    throw contextNotConnectedError(routing, contextHealth);
  }

  const systemBase = operatorMode
    ? buildLifeOSOperatorSystemPrompt({
        operator,
        contextData,
        toolPass,
        executionTruthBlock: buildExecutionTruthPromptBlock(operatorName),
      })
    : buildDepartmentSystemPrompt(deptId, routing, mode, contextData, operator);
  const system = sotSection
    ? `${systemBase}\n\n[LifeOS SOT / knowledge — authoritative; cite when relevant]\n${sotSection}`
    : systemBase;
  const emotionHint =
    classifyIntent(content, mode) === 'emotional'
      ? '\n\nOperator tone reads emotional — acknowledge mood briefly, stay grounded, no platitudes.\n'
      : '';
  const userTurn = threadText
    ? `--- Prior messages ---\n${threadText}\n\n--- Current ---\n${operatorName}: ${content}${repeatHint}${emotionHint}`
    : `${operatorName}: ${content}${repeatHint}${emotionHint}`;

  async function callOnce(activeRouting) {
    const callStartedAt = new Date();
    let councilRaw;
    try {
      councilRaw = await callCouncilMember(activeRouting.resolvedKey || activeRouting.memberKey, userTurn, {
        taskType: operatorMode ? 'lifeos_operator' : 'voice_rail_department',
        systemPromptOverride: system,
        skipKnowledge: true,
        useCache: false,
        critical: true,
        founderComms: true,
        allowModelDowngrade: false,
        maxOutputTokens: parseInt(process.env.VOICE_RAIL_FOUNDER_MAX_OUTPUT || '8192', 10),
        model: activeRouting.modelId,
      });
    } catch (apiErr) {
      const msg = apiErr?.message || String(apiErr);
      logger?.warn?.({ err: msg, member: activeRouting.memberKey }, 'voice-rail council API failed');
      throw councilUnavailableError(activeRouting, msg);
    }

    let councilText = sanitizeVoiceRailReply(
      formatCouncilReply(councilRaw),
      prior,
      operatorName,
      content,
    );
    const truth = enforceExecutionTruth(councilText, content, operatorName);
    if (truth.replaced) {
      logger?.warn?.({ violations: truth.violations }, 'voice-rail execution lie blocked — replaced with truth');
      councilText = truth.text;
    }
    if (!councilText || /^Adam, council returned nothing/i.test(councilText)) {
      throw councilUnavailableError(activeRouting, 'council returned empty or unusable response after sanitize');
    }

    const usageReceipt = await fetchVoiceRailUsageReceipt(pool, { since: callStartedAt });
    return {
      text: councilText,
      routing: activeRouting,
      usageReceipt,
      callStartedAt,
      execution_truth: {
        manifest: buildVoiceRailExecutionManifest(),
        lie_blocked: Boolean(truth.replaced),
        violations: truth.violations || [],
      },
    };
  }

  let activeRouting = routing;
  let result = await callOnce(activeRouting);

  if (detectShallowCouncilReply(result.text, content) && councilMembers) {
    const boostedTier = Math.min(Math.max(Number(tierBoost) || 0, 0) + 1, 3);
    const escalatedRouting = resolveFounderVoiceRailRouting({
      deptId,
      councilMemberOverride: councilMemberOverride || routing.memberKey,
      councilMembers,
      councilAliasMap,
      content,
      mode,
      intent: intentNorm,
      tierBoost: boostedTier,
      forceMinTier: 2,
    });
    const shouldRetry =
      escalatedRouting.memberKey !== activeRouting.memberKey ||
      (escalatedRouting.routing_meta?.tier ?? 0) > (activeRouting.routing_meta?.tier ?? 0);
    if (shouldRetry) {
      logger?.info?.(
        { from: activeRouting.memberKey, to: escalatedRouting.memberKey },
        'voice-rail shallow reply — escalating tier',
      );
      result = await callOnce(escalatedRouting);
      result.escalated = true;
      result.escalation_reason = 'shallow_reply_retry';
    }
  }

  return {
    text: result.text,
    contextHealth,
    routing: result.routing,
    usageReceipt: result.usageReceipt,
    escalated: Boolean(result.escalated),
    escalation_reason: result.escalation_reason || null,
    execution_truth: result.execution_truth || null,
  };
}

export { listVoiceRailDepartmentsPublic, normalizeVoiceRailDepartment };

export function createVoiceRailV1({
  pool,
  commitmentTracker,
  callCouncilMember,
  councilMembers,
  councilAliasMap,
  lumin,
  communicationProfile,
  logger,
}) {
  async function resolveUserId(userRef) {
    const { rows } = await pool.query(
      `SELECT id FROM lifeos_users WHERE user_handle = $1 OR display_name ILIKE $1 LIMIT 1`,
      [String(userRef || 'adam').toLowerCase()],
    );
    return rows[0]?.id || null;
  }

  async function resolveOperatorProfile(userId) {
    const { rows } = await pool.query(
      `SELECT id, user_handle, display_name, tier FROM lifeos_users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    return rows[0] || { user_handle: 'adam', display_name: 'Adam' };
  }

  async function getOrCreateSession({
    userId,
    mode = 'conversation',
    tag = null,
    sessionId = null,
    continuous = false,
  }) {
    const m = MODES.has(mode) ? mode : 'conversation';
    const founderTag = continuous ? FOUNDER_CONTINUOUS_SESSION_TAG : tag;
    if (sessionId) {
      const { rows } = await pool.query(
        `SELECT * FROM voice_rail_sessions WHERE id = $1 AND user_id = $2`,
        [sessionId, userId],
      );
      if (rows[0]) return rows[0];
    }
    if (continuous) {
      const { rows } = await pool.query(
        `SELECT * FROM voice_rail_sessions
          WHERE user_id = $1 AND tag = $2
          ORDER BY updated_at DESC
          LIMIT 1`,
        [userId, FOUNDER_CONTINUOUS_SESSION_TAG],
      );
      if (rows[0]) return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO voice_rail_sessions (user_id, mode, tag) VALUES ($1, $2, $3) RETURNING *`,
      [userId, m, founderTag || null],
    );
    return rows[0];
  }

  async function listFounderHistoryPage(userId, { before = null, limit = 40 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
    const params = [userId, lim];
    let cursorSql = '';
    if (before) {
      params.push(before);
      cursorSql = `AND m.created_at < $3`;
    }
    const { rows } = await pool.query(
      `SELECT m.id, m.role, m.content, m.intent, m.department, m.attachments, m.created_at, s.id AS session_id
         FROM voice_rail_messages m
         JOIN voice_rail_sessions s ON s.id = m.session_id
        WHERE s.user_id = $1 AND m.is_interim = FALSE ${cursorSql}
        ORDER BY m.created_at DESC
        LIMIT $2`,
      before ? [userId, lim, before] : [userId, lim],
    );
    return rows.reverse();
  }

  async function searchFounderHistory(userId, query, { limit = 40 } = {}) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];
    const lim = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 80);
    const { rows } = await pool.query(
      `SELECT m.id, m.role, m.content, m.intent, m.department, m.attachments, m.created_at, s.id AS session_id
         FROM voice_rail_messages m
         JOIN voice_rail_sessions s ON s.id = m.session_id
        WHERE s.user_id = $1 AND m.is_interim = FALSE AND m.content ILIKE $2
        ORDER BY m.created_at DESC
        LIMIT $3`,
      [userId, `%${q.replace(/[%_\\]/g, '\\$&')}%`, lim],
    );
    return rows.reverse();
  }

  function resolveRouting(deptId, councilMemberOverride, turn = {}) {
    const overrideKey = normalizeProviderMemberKey(
      councilMemberOverride,
      councilMembers,
      councilAliasMap,
    );
    return resolveFounderVoiceRailRouting({
      deptId,
      councilMemberOverride: overrideKey,
      councilMembers,
      councilAliasMap,
      content: turn.content || '',
      mode: turn.mode || 'conversation',
      intent: turn.intent || 'general_conversation',
      tierBoost: turn.tierBoost || 0,
      forceMinTier: turn.forceMinTier ?? null,
    });
  }

  async function listMessages(sessionId, userId) {
    const { rows: sessions } = await pool.query(
      `SELECT id FROM voice_rail_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    if (!sessions[0]) return null;
    const { rows } = await pool.query(
      `SELECT id, role, content, intent, department, attachments, is_interim, created_at
         FROM voice_rail_messages
        WHERE session_id = $1 AND is_interim = FALSE
        ORDER BY created_at ASC`,
      [sessionId],
    );
    return rows;
  }

  async function stageCommand({ userId, sessionId, utterance, intent }) {
    const { rows } = await pool.query(
      `INSERT INTO voice_rail_staged_commands (session_id, user_id, utterance, intent, status, executed)
       VALUES ($1, $2, $3, $4, 'staged', FALSE)
       RETURNING *`,
      [sessionId || null, userId, utterance, intent],
    );
    return rows[0];
  }

  async function listStagedCommands(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM voice_rail_staged_commands
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
      [userId],
    );
    return rows;
  }

  async function submitMessage({
    userId,
    sessionId,
    mode = 'conversation',
    tag = null,
    department = 'ChC',
    councilMember = null,
    councilMemberKeys = null,
    text,
    attachments: rawAttachments = null,
    private: isPrivate = false,
    simulateOnly = false,
    continuous = true,
    commandKey = null,
    baseUrl = null,
  }) {
    const content = String(text || '').trim();
    const deptId = normalizeVoiceRailDepartment(department);
    const attachments = normalizeVoiceRailAttachments(rawAttachments);
    if (!content && !attachments.length) {
      const err = new Error('empty_message');
      err.status = 400;
      throw err;
    }

    let councilContent = content;
    let storedAttachments = [];
    if (attachments.length) {
      const vision = await describeVoiceRailImages(attachments, { logger });
      if (vision.blocks?.length) {
        councilContent = [vision.blocks.join('\n\n'), content].filter(Boolean).join('\n\n');
      }
      storedAttachments = attachmentsForStorage(attachments);
    }

    const intent = normalizeIntent(classifyIntent(councilContent || content, mode));

    if (isPrivate || mode === 'private') {
      return {
        private: true,
        persisted: false,
        intent,
        user_message: { role: 'user', content, intent },
        assistant_message: {
          role: 'system',
          content: PRIVATE_MODE_NOTICE,
          intent: 'private_notice',
        },
        reply_source: { path: 'none', note: 'Private mode — no council call; operational notice only.' },
        staged_command: null,
        commitment_extract: null,
      };
    }

    const session = await getOrCreateSession({
      userId,
      mode,
      tag,
      sessionId,
      continuous: continuous !== false,
    });
    await pool.query(
      `INSERT INTO voice_rail_messages (session_id, role, content, intent, attachments, is_interim)
       VALUES ($1, 'user', $2, $3, $4::jsonb, FALSE)`,
      [session.id, content || '(attachment)', intent, JSON.stringify(storedAttachments)],
    );

    /** LifeOS operator — natural conversation; system APIs run first; voice speaks from receipts. */
    if (mode === 'lifeos' && !simulateOnly) {
      const operator = await resolveOperatorProfile(userId);
      const toolPass = await runFounderSystemToolPass({
        pool,
        userId,
        utterance: content,
        mode,
        intent,
        department: deptId,
        baseUrl,
        commandKey,
        connectionProbe: () => probeFounderContext(userId),
        stageCommand,
        sessionId: session.id,
        logger,
      });
      const routing = resolveRouting('ChC', councilMember, {
        content: councilContent,
        mode,
        intent,
      });
      const panelResult = await generateCouncilReply({
        pool,
        callCouncilMember,
        lumin,
        communicationProfile,
        userId,
        sessionId: session.id,
        listMessagesFn: listMessages,
        content: councilContent,
        mode,
        intent,
        department: 'LifeOS',
        routing,
        councilMemberOverride: councilMember,
        councilMembers,
        councilAliasMap,
        operator,
        commandExecutionReceipt: toolPass.command_execution,
        operatorMode: true,
        toolPass,
        logger,
      });
      const replySource = {
        ...buildLifeOSOperatorReplySource(
          panelResult.routing,
          toolPass,
          panelResult.usageReceipt,
        ),
        context_health: panelResult.contextHealth,
        execution_truth: panelResult.execution_truth,
        escalated: panelResult.escalated || false,
        api_trace: toolPass.api_trace || null,
      };
      const { rows: assistantRows } = await pool.query(
        `INSERT INTO voice_rail_messages (session_id, role, content, intent, department, is_interim)
         VALUES ($1, 'assistant', $2, $3, $4, FALSE)
         RETURNING id, role, content, intent, department, created_at`,
        [session.id, panelResult.text, intent, 'LifeOS'],
      );
      await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);
      return {
        private: false,
        persisted: true,
        system_operator: true,
        session_id: session.id,
        mode: 'lifeos',
        tag: session.tag,
        department: 'LifeOS',
        intent,
        user_message: { role: 'user', content, intent },
        assistant_message: assistantRows[0],
        reply_source: replySource,
        context_health: panelResult.contextHealth,
        staged_command: toolPass.staged_command,
        command_execution: toolPass.command_execution,
        tool_action: toolPass.action,
        commitment_extract: null,
      };
    }

    /** Raw API receipts only (advanced / debug) — no conversational voice. */
    if (mode === 'system' && !simulateOnly) {
      const direct = await handleSystemDirectMessage({
        pool,
        userId,
        sessionId: session.id,
        utterance: content,
        baseUrl,
        commandKey,
        connectionProbe: () => probeFounderContext(userId),
        stageCommand,
        logger,
      });
      const replySource = {
        ...buildSystemDirectReplySource(direct.command_execution),
        api_trace: direct.api_trace || null,
      };
      const { rows: assistantRows } = await pool.query(
        `INSERT INTO voice_rail_messages (session_id, role, content, intent, department, is_interim)
         VALUES ($1, 'assistant', $2, $3, $4, FALSE)
         RETURNING id, role, content, intent, department, created_at`,
        [session.id, direct.text, 'system_direct', 'SYS'],
      );
      await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);
      return {
        private: false,
        persisted: true,
        system_direct: true,
        founder_direct: true,
        session_id: session.id,
        mode: 'system',
        tag: session.tag,
        department: 'SYS',
        intent: 'system_direct',
        user_message: { role: 'user', content, intent: 'system_direct' },
        assistant_message: assistantRows[0],
        reply_source: replySource,
        context_health: null,
        staged_command: direct.staged_command,
        command_execution: direct.command_execution,
        api_trace: direct.api_trace,
        commitment_extract: null,
      };
    }

    let stagedCommand = null;
    let commandExecution = null;
    const routeToSystem = shouldRouteFounderToSystem({
      mode,
      intent,
      content,
      department: deptId,
    });
    if (routeToSystem) {
      stagedCommand = await stageCommand({
        userId,
        sessionId: session.id,
        utterance: content,
        intent: 'command',
      });
      if (stagedCommand?.id && isVoiceRailCommandExecuteEnabled()) {
        try {
          commandExecution = await executeVoiceRailFounderCommand({
            pool,
            stagedCommandId: stagedCommand.id,
            utterance: content,
            userId,
            logger,
            commandKey,
            baseUrl,
          });
          stagedCommand = {
            ...stagedCommand,
            executed: commandExecution.ok === true,
            command_control_job_id: commandExecution.job_id || null,
            execution_receipt: commandExecution,
          };
        } catch (execErr) {
          logger?.warn?.({ err: execErr.message }, 'voice-rail command execute failed');
          commandExecution = { ok: false, error: execErr.message };
        }
      }
    }

    /** Work/build/route → BuilderOS command-control directly; no department chat wrapper. */
    if (routeToSystem && !simulateOnly) {
      const systemReply = formatCommandSystemReply({
        commandExecution,
        stagedCommand,
        utterance: content,
      });
      const replySource = {
        path: 'lifeos/system/command-control',
        persona: 'SYS',
        department: deptId,
        department_title: 'LifeOS System',
        display_name: 'BuilderOS Command & Control',
        model_id: 'command-control',
        provider: 'lifeos',
        note: 'Founder command executed via internal API — not department chat.',
        command_execution: commandExecution,
        system_direct: true,
      };
      const { rows: assistantRows } = await pool.query(
        `INSERT INTO voice_rail_messages (session_id, role, content, intent, department, is_interim)
         VALUES ($1, 'assistant', $2, $3, $4, FALSE)
         RETURNING id, role, content, intent, department, created_at`,
        [session.id, systemReply, intent, 'SYS'],
      );
      await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);
      return {
        private: false,
        persisted: true,
        system_direct: true,
        session_id: session.id,
        mode: session.mode,
        tag: session.tag,
        department: deptId,
        intent,
        user_message: { role: 'user', content, intent },
        assistant_message: assistantRows[0],
        reply_source: replySource,
        context_health: null,
        staged_command: stagedCommand,
        command_execution: commandExecution,
        commitment_extract: null,
      };
    }

    let commitmentExtract = null;
    if (intent === 'commitment' && commitmentTracker?.extractCommitments) {
      try {
        const extracted = await commitmentTracker.extractCommitments(content, userId);
        commitmentExtract = { extracted: extracted || [], count: (extracted || []).length };
      } catch (e) {
        logger?.warn?.({ err: e.message }, 'voice-rail commitment extract failed');
        commitmentExtract = { extracted: [], error: e.message };
      }
    }

    const preferenceSaved = await persistFounderPreferenceSignal({
      pool,
      userId,
      sessionId: session.id,
      content: councilContent,
      communicationProfile,
      logger,
    });

    const sessionState = await getSessionRoutingState(pool, session.id);
    let tierBoost = sessionState.tier_boost || 0;
    if (detectEscalationAsk(councilContent)) {
      tierBoost = Math.min(tierBoost + 1, 3);
    }

    const routing = resolveRouting(deptId, councilMember, {
      content: councilContent,
      mode,
      intent,
      tierBoost,
    });
    const operator = await resolveOperatorProfile(userId);

    const panelMemberKeys = (() => {
      const raw = Array.isArray(councilMemberKeys) ? councilMemberKeys : [];
      const keys = raw
        .map((k) => normalizeProviderMemberKey(k, councilMembers, councilAliasMap))
        .filter(Boolean);
      return [...new Set(keys)];
    })();

    if (simulateOnly) {
      await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);
      return {
        private: false,
        persisted: true,
        simulate_only: true,
        session_id: session.id,
        mode: session.mode,
        tag: session.tag,
        department: deptId,
        intent,
        user_message: { role: 'user', content, intent },
        assistant_message: null,
        reply_source: { path: 'none', note: 'simulate_only — user message persisted; no reply generated.' },
        staged_command: stagedCommand,
        commitment_extract: commitmentExtract,
      };
    }

    if (panelMemberKeys.length > 1) {
      const panelReplies = await Promise.all(
        panelMemberKeys.map(async (memberKey) => {
          const panelRouting = resolveRouting(deptId, memberKey, {
            content: councilContent,
            mode,
            intent,
            tierBoost,
          });
          try {
            const panelResult = await generateCouncilReply({
              pool,
              callCouncilMember,
              lumin,
              communicationProfile,
              userId,
              sessionId: session.id,
              listMessagesFn: listMessages,
              content: councilContent,
              mode,
              intent,
              department: deptId,
              routing: panelRouting,
              councilMemberOverride: memberKey,
              councilMembers,
              councilAliasMap,
              tierBoost,
              operator,
              commandExecutionReceipt: commandExecution,
              logger,
            });
            const panelReply = panelResult.text;
            const finalRouting = panelResult.routing || panelRouting;
            const replySource = {
              path: 'lifeos/department',
              persona: deptId,
              department: deptId,
              department_title: finalRouting.departmentTitle,
              council_member: finalRouting.memberKey,
              model_id: finalRouting.modelId,
              provider: finalRouting.provider,
              display_name: finalRouting.displayName,
              context_health: panelResult.contextHealth,
              routing_meta: finalRouting.routing_meta || null,
              usage_receipt: panelResult.usageReceipt || null,
              escalated: panelResult.escalated || false,
              escalation_reason: panelResult.escalation_reason || null,
              preference_saved: preferenceSaved?.ok ? preferenceSaved.preference_type : null,
              execution_truth: panelResult.execution_truth || null,
              lie_blocked: Boolean(panelResult.execution_truth?.lie_blocked),
              command_execution: commandExecution,
              note: panelResult.execution_truth?.lie_blocked
                ? 'Model claimed async work — reply replaced with execution truth.'
                : panelResult.contextHealth?.honesty_note || 'Panel reply via council API.',
            };
            const { rows: assistantRows } = await pool.query(
              `INSERT INTO voice_rail_messages (session_id, role, content, intent, department, is_interim)
               VALUES ($1, 'assistant', $2, $3, $4, FALSE)
               RETURNING id, role, content, intent, department, created_at`,
              [session.id, panelReply, intent, deptId],
            );
            return {
              ok: true,
              assistant_message: assistantRows[0],
              reply_source: replySource,
            };
          } catch (e) {
            logger?.warn?.({ err: e.message, member: memberKey }, 'voice-rail panel reply failed');
            const detail = e.detail || councilUnavailableError(panelRouting, e.message).detail;
            return {
              ok: false,
              error: detail?.reason || e.message,
              reply_source: {
                path: 'lifeos/department',
                display_name: panelRouting.displayName,
                model_id: panelRouting.modelId,
                provider: panelRouting.provider,
                council_member: panelRouting.memberKey,
              },
            };
          }
        }),
      );

      await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);

      return {
        private: false,
        persisted: true,
        panel: true,
        session_id: session.id,
        mode: session.mode,
        tag: session.tag,
        department: deptId,
        intent,
        user_message: { role: 'user', content, intent },
        panel_replies: panelReplies,
        assistant_message: panelReplies.find((r) => r.ok)?.assistant_message || null,
        reply_source: panelReplies.find((r) => r.ok)?.reply_source || null,
        context_health: panelReplies.find((r) => r.ok)?.reply_source?.context_health || null,
        staged_command: stagedCommand,
        command_execution: commandExecution,
        commitment_extract: commitmentExtract,
      };
    }

    let reply;
    let replySource;
    let finalRouting = routing;
    try {
      const councilResult = await generateCouncilReply({
        pool,
        callCouncilMember,
        lumin,
        communicationProfile,
        userId,
        sessionId: session.id,
        listMessagesFn: listMessages,
        content: councilContent,
        mode,
        intent,
        department: deptId,
        routing,
        councilMemberOverride: councilMember,
        councilMembers,
        councilAliasMap,
        tierBoost,
        operator,
        commandExecutionReceipt: commandExecution,
        logger,
      });
      reply = councilResult.text;
      finalRouting = councilResult.routing || routing;
      replySource = {
        path: 'lifeos/department',
        persona: deptId,
        department: deptId,
        department_title: finalRouting.departmentTitle,
        council_member: finalRouting.memberKey,
        model_id: finalRouting.modelId,
        provider: finalRouting.provider,
        display_name: finalRouting.displayName,
        context_health: councilResult.contextHealth,
        routing_meta: finalRouting.routing_meta || null,
        usage_receipt: councilResult.usageReceipt || null,
        escalated: councilResult.escalated || false,
        escalation_reason: councilResult.escalation_reason || null,
        preference_saved: preferenceSaved?.ok ? preferenceSaved.preference_type : null,
        execution_truth: councilResult.execution_truth || null,
        lie_blocked: Boolean(councilResult.execution_truth?.lie_blocked),
        command_execution: commandExecution,
        note: councilResult.execution_truth?.lie_blocked
          ? 'Model claimed async work — reply replaced with execution truth.'
          : councilResult.contextHealth?.honesty_note || 'Council API reply.',
      };
    } catch (e) {
      logger?.warn?.({ err: e.message, detail: e.detail }, 'voice-rail council reply failed');
      throw e.status ? e : councilUnavailableError(routing, e.message);
    }

    await saveSessionRoutingState(pool, session.id, {
      tier_boost: tierBoost,
      last_tier: finalRouting.routing_meta?.tier ?? 0,
    });

    const { rows: assistantRows } = await pool.query(
      `INSERT INTO voice_rail_messages (session_id, role, content, intent, department, is_interim)
       VALUES ($1, 'assistant', $2, $3, $4, FALSE)
       RETURNING id, role, content, intent, department, created_at`,
      [session.id, reply, intent, deptId],
    );

    await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);

    return {
      private: false,
      persisted: true,
      session_id: session.id,
      mode: session.mode,
      tag: session.tag,
      department: deptId,
      intent,
      user_message: { role: 'user', content, intent },
      assistant_message: assistantRows[0],
      reply_source: replySource,
      context_health: replySource.context_health || null,
      staged_command: stagedCommand,
      command_execution: commandExecution,
      commitment_extract: commitmentExtract,
    };
  }

  async function classifyOnly(text, mode = 'conversation') {
    return { intent: normalizeIntent(classifyIntent(text, mode)) };
  }

  async function loadFounderTimeline(userId, { before = null, limit = 40 } = {}) {
    const session = await getOrCreateSession({ userId, continuous: true });
    const messages = await listFounderHistoryPage(userId, { before, limit });
    const lim = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
    return {
      session_id: session.id,
      tag: session.tag,
      mode: session.mode,
      messages,
      has_more: messages.length >= lim,
    };
  }

  function listProviders() {
    return listVoiceRailProviderPicks(councilMembers);
  }

  async function findPrivateLeak(userId, needle) {
    const checks = {};
    const { rows: msgs } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM voice_rail_messages m
        JOIN voice_rail_sessions s ON s.id = m.session_id
       WHERE s.user_id = $1 AND m.content ILIKE $2`,
      [userId, `%${needle}%`],
    );
    checks.messages = msgs[0]?.c || 0;

    const { rows: staged } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM voice_rail_staged_commands
        WHERE user_id = $1 AND utterance ILIKE $2`,
      [userId, `%${needle}%`],
    );
    checks.staged_commands = staged[0]?.c || 0;

    let commitments = 0;
    if (commitmentTracker?.getOpen) {
      const open = await commitmentTracker.getOpen(userId);
      commitments = (open || []).filter((c) =>
        String(c.title || c.description || '').toLowerCase().includes(needle.toLowerCase()),
      ).length;
    }
    checks.commitments = commitments;

    return {
      leaked: (checks.messages + checks.staged_commands + checks.commitments) > 0,
      checks,
    };
  }

  async function probeFounderContext(userId) {
    let contextData = {};
    try {
      contextData = await buildVoiceRailOperatorContext({
        pool,
        userId,
        lumin,
        communicationProfile,
        departmentId: 'ChC',
        logger,
      });
    } catch (e) {
      logger?.warn?.({ err: e.message }, 'voice-rail context probe failed');
    }
    try {
      const sotSection = await buildSystemContext('LifeOS founder context probe', {
        taskType: 'voice_rail_department',
        maxIdeas: 2,
      });
      if (sotSection) contextData.sot_knowledge_chars = sotSection.length;
    } catch (e) {
      logger?.warn?.({ err: e.message }, 'voice-rail SOT probe failed');
    }
    const contextHealth = summarizeVoiceRailContextHealth(contextData);
    contextHealth.sufficient_for_founder_reply = isVoiceRailContextSufficientForFounderReply(contextHealth);
    return {
      fail_closed: isVoiceRailFailClosedEnabled(),
      sufficient: contextHealth.sufficient_for_founder_reply,
      context_health: contextHealth,
    };
  }

  return {
    MODES: [...MODES],
    INTENTS: [...INTENTS],
    classifyIntent,
    resolveUserId,
    resolveOperatorProfile,
    getOrCreateSession,
    listMessages,
    listFounderHistoryPage,
    searchFounderHistory,
    loadFounderTimeline,
    listProviders,
    submitMessage,
    classifyOnly,
    listStagedCommands,
    stageCommand,
    findPrivateLeak,
    probeFounderContext,
    listDepartments: listVoiceRailDepartmentsPublic,
  };
}
