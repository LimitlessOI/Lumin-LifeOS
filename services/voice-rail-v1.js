/**
 * Voice Rail v1 — LifeOS communication layer (sessions, intents, staging).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @ssot builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/FOUNDER_PACKET.md
 */
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

export function classifyIntent(text, mode = 'conversation') {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return 'general_conversation';

  if (/\b(policy|routing|wrong system|should not|governance|ssot|drift)\b/.test(t)) {
    return 'governance_correction';
  }
  if (/\b(frustrated|angry|stressed|overwhelmed|vent|upset|furious)\b/.test(t)) {
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

function buildReply(intent, text) {
  switch (intent) {
    case 'command':
      return 'Understood. I staged that command for your review — nothing runs automatically in v1.';
    case 'brainstorm':
      return 'Got it — brainstorming mode. I will not execute anything from this thread unless you switch to Command and stage it.';
    case 'commitment':
      return 'I heard a commitment in that. I will extract and track it if you want follow-through.';
    case 'governance_correction':
      return 'Governance note received. I will route this as a system correction for visibility — not silent auto-fix.';
    case 'emotional':
      return 'I hear you. Take your time — I am here when you are ready to continue.';
    default:
      return `Thanks — I received: "${String(text || '').slice(0, 120)}". How can I help next?`;
  }
}

function resolveCouncilMemberLabel() {
  return (
    process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
    process.env.LUMIN_COUNCIL_MEMBER ||
    'anthropic'
  );
}

function resolveCouncilRouting(councilMembers, councilAliasMap) {
  const memberKey = resolveCouncilMemberLabel();
  const resolvedKey = councilAliasMap?.[memberKey] || memberKey;
  const cfg = councilMembers?.[resolvedKey] || {};
  return {
    memberKey,
    resolvedKey,
    displayName: cfg.name || resolvedKey,
    modelId: cfg.model || 'unknown',
    provider: cfg.provider || 'unknown',
    councilRole: cfg.role || 'LifeOS chat',
  };
}

function isIdentityQuestion(text) {
  return /\b(who am i talking|who are you|what model|what modle|which model|deep\s*seek|deepseek|what role|what'?s your role|who is this|are you (real|ai|a bot)|not a bot|what backend)\b/i.test(
    String(text || ''),
  );
}

function buildVoiceRailSystemPrompt(routing, mode, contextData) {
  const ctxBlock =
    contextData && Object.keys(contextData).length
      ? `\nVerified LifeOS context (use only this — do not invent beyond it):\n${JSON.stringify(contextData, null, 2)}\n`
      : '\nNo LifeOS context payload loaded for this turn — do not pretend you know Adam\'s private data.\n';

  return `You are Lumin on LifeOS Voice Rail v1 — Adam's browser/phone comms surface to the LifeOS stack on Railway.

VERIFIED BACKEND FACTS (state plainly when asked about identity, model, or role):
- Surface: Voice Rail v1 (/voice-rail). Messages persist in LifeOS DB. Commands are STAGED only — you never auto-run BuilderOS or deploy.
- Council route: member key "${routing.memberKey}" → ${routing.displayName}
- Provider: ${routing.provider} | Model ID: ${routing.modelId} | Council role label: ${routing.councilRole}
- You are NOT Cursor, NOT a standalone chatbot, NOT DeepSeek unless the model ID above says deepseek.
- Your role on THIS surface: conversational gateway + intent routing + honest answers. Not the full multi-model council debate UI.

Behavior (North Star §2.6 — no lies):
- Answer the user's ACTUAL question first. Never ignore a direct question to give a generic greeting.
- Never repeat the same opening paragraph you already used earlier in this session.
- Never invent internal architecture (Lemon System, pods, KERNEL, SSOT names) unless it appears in the context block below.
- If you lack evidence, say "I don't know" — do not roleplay omniscience.
- Typical length: 2–6 sentences unless the user asks for depth. Complete your sentences.
- Session mode right now: ${mode}.
${ctxBlock}`;
}

function formatCouncilReply(raw) {
  const text = typeof raw === 'string' ? raw : (raw?.content || raw?.text || '');
  return String(text || '').trim().replace(/\n{3,}/g, '\n\n').slice(0, 8000);
}

export function createVoiceRailV1({
  pool,
  commitmentTracker,
  callAI,
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

  async function getOrCreateSession({ userId, mode = 'conversation', tag = null, sessionId = null }) {
    const m = MODES.has(mode) ? mode : 'conversation';
    if (sessionId) {
      const { rows } = await pool.query(
        `SELECT * FROM voice_rail_sessions WHERE id = $1 AND user_id = $2`,
        [sessionId, userId],
      );
      if (rows[0]) return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO voice_rail_sessions (user_id, mode, tag) VALUES ($1, $2, $3) RETURNING *`,
      [userId, m, tag || null],
    );
    return rows[0];
  }

  async function listMessages(sessionId, userId) {
    const { rows: sessions } = await pool.query(
      `SELECT id FROM voice_rail_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    if (!sessions[0]) return null;
    const { rows } = await pool.query(
      `SELECT id, role, content, intent, is_interim, created_at
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
    text,
    private: isPrivate = false,
    simulateOnly = false,
  }) {
    const content = String(text || '').trim();
    if (!content) {
      const err = new Error('empty_message');
      err.status = 400;
      throw err;
    }

    const intent = normalizeIntent(classifyIntent(content, mode));

    if (isPrivate || mode === 'private') {
      const reply = buildReply(intent, content);
      return {
        private: true,
        persisted: false,
        intent,
        user_message: { role: 'user', content, intent },
        assistant_message: { role: 'assistant', content: reply, intent },
        staged_command: null,
        commitment_extract: null,
      };
    }

    const session = await getOrCreateSession({ userId, mode, tag, sessionId });
    await pool.query(
      `INSERT INTO voice_rail_messages (session_id, role, content, intent, is_interim)
       VALUES ($1, 'user', $2, $3, FALSE)`,
      [session.id, content, intent],
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

    let reply = buildReply(intent, content);
    const routing = resolveCouncilRouting(councilMembers, councilAliasMap);
    let replySource = {
      path: 'template',
      council_member: routing.memberKey,
      model_id: routing.modelId,
      provider: routing.provider,
      note: 'Intent acknowledgment only — council unavailable.',
    };

    if (!simulateOnly && callCouncilMember) {
      try {
        let contextData = {};
        if (lumin?.buildContextSnapshot) {
          try {
            contextData = await lumin.buildContextSnapshot(userId, { mode: 'general' });
          } catch (ctxErr) {
            logger?.warn?.({ err: ctxErr.message }, 'voice-rail context snapshot skipped');
          }
        }

        const history = await listMessages(session.id, userId);
        const prior = (history || []).slice(0, -1).slice(-10);
        const threadText = prior
          .map((m) => `${m.role === 'user' ? 'User' : 'Lumin'}: ${m.content}`)
          .join('\n\n');

        const system = buildVoiceRailSystemPrompt(routing, mode, contextData);
        const turn = threadText
          ? `--- Prior messages this session ---\n${threadText}\n\n--- Current turn ---\nUser: ${content}\n\nLumin:`
          : `User: ${content}\n\nLumin:`;
        const prompt = `${system}\n\n---\n\n${turn}`;

        const councilRaw = await callCouncilMember(routing.memberKey, prompt, {
          taskType: 'analysis',
          maxOutputTokens: 1200,
        });
        const councilText = formatCouncilReply(councilRaw);

        if (councilText) {
          reply = councilText;
          if (isIdentityQuestion(content)) {
            const facts =
              `[Voice Rail · ${routing.displayName} · model ${routing.modelId}] ` +
              `You are talking to Lumin on LifeOS (Railway). I route through council member "${routing.memberKey}" (${routing.provider}). ` +
              `Role here: conversational layer — persist messages, stage commands, no auto-execution.\n\n`;
            if (!reply.toLowerCase().includes(routing.modelId.toLowerCase())) {
              reply = facts + reply;
            }
          }
          if (intent === 'command' || mode === 'command') {
            reply += '\n\n(Commands are staged for your review — nothing auto-runs in v1.)';
          }
          replySource = {
            path: 'lifeos/council',
            council_member: routing.memberKey,
            model_id: routing.modelId,
            provider: routing.provider,
            display_name: routing.displayName,
            note: 'Session-aware council call with Voice Rail system prompt + LifeOS context snapshot.',
          };
        }
      } catch (e) {
        logger?.warn?.({ err: e.message }, 'voice-rail council reply fallback');
        replySource = {
          path: 'template',
          council_member: routing.memberKey,
          model_id: routing.modelId,
          provider: routing.provider,
          note: `Council call failed (${e.message}); template fallback.`,
        };
        if (isIdentityQuestion(content)) {
          reply =
            `You are on LifeOS Voice Rail. Backend: council member "${routing.memberKey}" → ${routing.displayName}, ` +
            `provider ${routing.provider}, model ${routing.modelId}. I am Lumin (conversational layer). ` +
            'Commands stage only — nothing auto-runs. Council call failed this turn; this answer is factual, not AI-generated.';
        }
      }
    } else if (!simulateOnly && callAI) {
      replySource = {
        path: 'legacy_callAI',
        council_member: resolveCouncilMemberLabel(),
        note: 'Lumin service missing; degraded council prompt path.',
      };
      try {
        const ai = await callAI(
          'You are Lumin on LifeOS Voice Rail. Use only verified LifeOS context. ' +
            'Never invent internal system names or claim you executed commands. ' +
            `Disclose backend: LifeOS council member ${resolveCouncilMemberLabel()}.`,
          content,
        );
        if (ai && String(ai).trim()) reply = String(ai).trim().slice(0, 2000);
      } catch (e) {
        logger?.warn?.({ err: e.message }, 'voice-rail AI reply fallback');
        replySource.path = 'template';
        replySource.note = `Council call failed (${e.message}); template fallback.`;
      }
    }

    const { rows: assistantRows } = await pool.query(
      `INSERT INTO voice_rail_messages (session_id, role, content, intent, is_interim)
       VALUES ($1, 'assistant', $2, $3, FALSE)
       RETURNING id, role, content, intent, created_at`,
      [session.id, reply, intent],
    );

    await pool.query(`UPDATE voice_rail_sessions SET updated_at = NOW() WHERE id = $1`, [session.id]);

    return {
      private: false,
      persisted: true,
      session_id: session.id,
      mode: session.mode,
      tag: session.tag,
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
    getOrCreateSession,
    listMessages,
    submitMessage,
    classifyOnly,
    listStagedCommands,
    stageCommand,
    findPrivateLeak,
  };
}
