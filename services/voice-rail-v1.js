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
  resolveDepartmentRouting,
} from '../config/voice-rail-departments.js';
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

const MODES = new Set(['conversation', 'command', 'brainstorm', 'private']);
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
  let out = kept.join(' ').replace(/\s+/g, ' ').trim();
  out = out.replace(/\bLumen\b/g, 'LifeOS');
  const maxLen = isSystemOrMemoryQuestion(userQuestion) ? 1400 : 720;
  if (out.length > maxLen) {
    const sentences = out.match(/[^.!?]+[.!?]+/g) || [out];
    out = sentences.slice(0, isSystemOrMemoryQuestion(userQuestion) ? 6 : 3).join(' ').trim();
  }
  const priors = (priorAssistants || []).filter((m) => m.role === 'assistant').map((m) => m.content);
  for (const prev of priors.slice(-2)) {
    if (isNearDuplicateReply(out, prev)) {
      return `${name}, I already said that — what do you want to tackle next?`;
    }
  }
  return out || `${name}, council returned nothing usable — try again; if it repeats, check Railway logs for council_unavailable.`;
}

async function readMissionQueueHead() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'builderos-reboot', 'BP_PRIORITY.json'), 'utf8');
    const q = JSON.parse(raw);
    const list = q.items || q.priorities || q.queue || [];
    return (Array.isArray(list) ? list : []).slice(0, 6).map((m) => ({
      id: m.id || m.mission_id || m.slug,
      title: m.title || m.name || m.objective,
      status: m.status || m.state,
    }));
  } catch {
    return [];
  }
}

async function readContinuityTail() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), 'docs', 'CONTINUITY_LOG.md'), 'utf8');
    return text.slice(-2000);
  } catch {
    return null;
  }
}

/** Operator-facing context: DB + memories + cross-session voice rail + missions (not stateless chat). */
export async function buildVoiceRailOperatorContext({ pool, userId, lumin, logger }) {
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
      `SELECT m.role, LEFT(m.content, 500) AS content, m.department, m.created_at
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
  userId,
  sessionId,
  listMessagesFn,
  content,
  mode,
  department,
  routing,
  operator,
  logger,
}) {
  if (!callCouncilMember) {
    throw councilUnavailableError(routing, 'callCouncilMember not configured');
  }

  const deptId = normalizeVoiceRailDepartment(department || routing?.department);

  let contextData = {};
  try {
    contextData = await buildVoiceRailOperatorContext({ pool, userId, lumin, logger });
  } catch (ctxErr) {
    logger?.warn?.({ err: ctxErr.message }, 'voice-rail operator context failed');
  }

  const history = await listMessagesFn(sessionId, userId);
  const prior = (history || []).slice(0, -1).slice(-10);
  const operatorName = operator?.display_name || 'Adam';
  const threadText = prior
    .map((m) => {
      const label =
        m.role === 'user'
          ? operatorName
          : normalizeVoiceRailDepartment(m.department || deptId);
      return `${label}: ${m.content}`;
    })
    .join('\n\n');

  let repeatHint = '';
  if (isIdentityOrRoleQuestion(content) && sessionAlreadyExplainedIdentity(prior, deptId)) {
    repeatHint =
      '\n\nOne sentence only — identity already established. Do NOT restate who the founder is.\n';
  }

  const system = buildDepartmentSystemPrompt(deptId, routing, mode, contextData, operator);
  const emotionHint =
    classifyIntent(content, mode) === 'emotional'
      ? '\n\nOperator tone reads emotional — acknowledge mood briefly, stay grounded, no platitudes.\n'
      : '';
  const userTurn = threadText
    ? `--- Prior messages ---\n${threadText}\n\n--- Current ---\n${operatorName}: ${content}${repeatHint}${emotionHint}`
    : `${operatorName}: ${content}${repeatHint}${emotionHint}`;

  let councilRaw;
  try {
    councilRaw = await callCouncilMember(routing.resolvedKey || routing.memberKey, userTurn, {
      taskType: 'voice_rail_department',
      systemPromptOverride: system,
      skipKnowledge: true,
      useCache: false,
      critical: true,
      founderComms: true,
      allowModelDowngrade: false,
      maxOutputTokens: 800,
      model: routing.modelId,
    });
  } catch (apiErr) {
    const msg = apiErr?.message || String(apiErr);
    logger?.warn?.({ err: msg, member: routing.memberKey }, 'voice-rail council API failed');
    throw councilUnavailableError(routing, msg);
  }

  const councilText = sanitizeVoiceRailReply(
    formatCouncilReply(councilRaw),
    prior,
    operatorName,
    content,
  );
  if (!councilText || /^Adam, council returned nothing/i.test(councilText)) {
    throw councilUnavailableError(routing, 'council returned empty or unusable response after sanitize');
  }
  return councilText;
}

export { listVoiceRailDepartmentsPublic, normalizeVoiceRailDepartment };

export function createVoiceRailV1({
  pool,
  commitmentTracker,
  callCouncilMember,
  councilMembers,
  councilAliasMap,
  lumin,
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

  function resolveRouting(deptId, councilMemberOverride) {
    const overrideKey = normalizeProviderMemberKey(
      councilMemberOverride,
      councilMembers,
      councilAliasMap,
    );
    return resolveDepartmentRouting(deptId, councilMembers, councilAliasMap, overrideKey);
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
        WHERE user_id = $1 AND status = 'staged' AND executed = FALSE
        ORDER BY created_at DESC LIMIT 50`,
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

    let stagedCommand = null;
    if (intent === 'command' || mode === 'command') {
      stagedCommand = await stageCommand({
        userId,
        sessionId: session.id,
        utterance: content,
        intent: 'command',
      });
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

    const routing = resolveRouting(deptId, councilMember);
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
          const panelRouting = resolveRouting(deptId, memberKey);
          try {
            const panelReply = await generateCouncilReply({
              pool,
              callCouncilMember,
              lumin,
              userId,
              sessionId: session.id,
              listMessagesFn: listMessages,
              content: councilContent,
              mode,
              department: deptId,
              routing: panelRouting,
              operator,
              logger,
            });
            const replySource = {
              path: 'lifeos/department',
              persona: deptId,
              department: deptId,
              department_title: panelRouting.departmentTitle,
              council_member: panelRouting.memberKey,
              model_id: panelRouting.modelId,
              provider: panelRouting.provider,
              display_name: panelRouting.displayName,
              note: `Panel reply — ${panelRouting.displayName}; council-backed.`,
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
        staged_command: stagedCommand,
        commitment_extract: commitmentExtract,
      };
    }

    let reply;
    let replySource;
    try {
      reply = await generateCouncilReply({
        pool,
        callCouncilMember,
        lumin,
        userId,
        sessionId: session.id,
        listMessagesFn: listMessages,
        content: councilContent,
        mode,
        department: deptId,
        routing,
        operator,
        logger,
      });
      replySource = {
        path: 'lifeos/department',
        persona: deptId,
        department: deptId,
        department_title: routing.departmentTitle,
        council_member: routing.memberKey,
        model_id: routing.modelId,
        provider: routing.provider,
        display_name: routing.displayName,
        note: `Direct ${deptId} department voice — council-backed; not template fallback.`,
      };
    } catch (e) {
      logger?.warn?.({ err: e.message, detail: e.detail }, 'voice-rail council reply failed');
      throw e.status ? e : councilUnavailableError(routing, e.message);
    }

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
      staged_command: stagedCommand,
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
    listDepartments: listVoiceRailDepartmentsPublic,
  };
}
