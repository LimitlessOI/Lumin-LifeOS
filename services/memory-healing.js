/**
 * services/memory-healing.js
 *
 * LifeOS Memory & Healing — therapeutic AI assistance for grief, regression,
 * memory reconstruction, and inner child work.
 *
 * ETHICAL FRAMING (non-negotiable, enforced in code):
 *  - Every session starts with a professional support disclaimer
 *  - Completion conversations are clearly labeled as AI-generated (not the actual person)
 *  - Video reconstructions carry permanent ethical framing
 *  - Full delete-on-demand for all session data
 *  - This system supports therapeutic work — it does not replace a therapist
 *
 * Session types:
 *   grief           — supported grief processing, no timeline, at their pace
 *   regression      — guided revisit of a past experience with adult perspective
 *   memory_walk     — walking through a reconstructed place (childhood home, etc.)
 *   completion      — saying what was never said to someone who has passed
 *   inner_child     — connecting with and healing a younger version of self
 *   memorial        — AI-assisted memorial — honoring someone using artifacts
 *
 * Exports: createMemoryHealing({ pool, callAI, videoProduction, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

// Core philosophy — embedded in every session
const UTILITY_FRAMING = `Core framing: never moralize, never judge, never use "right" or "wrong". The only question is "does this work for this person, or does it not?" Frame everything in terms of what serves their healing and their life — never in terms of what they should or shouldn't feel, do, or have done.`;

const PROFESSIONAL_FRAMING = `**A note before we begin:**
This space is here to support your healing work, not to replace professional support.
If you're working through something significant, I'd encourage you to also be working with a licensed therapist, grief counselor, or mental health professional.
This system can go deep alongside professional work — but it can't go deep *instead* of it.

If you're in crisis: call or text 988 (Suicide & Crisis Lifeline, US) or your country's equivalent.`;

// ── Session type configurations ──────────────────────────────────────────────

const SESSION_CONFIGS = {
  grief: {
    label: 'Grief Support',
    systemPrompt: `${UTILITY_FRAMING}
You are a compassionate grief support companion. You do not rush or fix. You hold space.
Your job is not to make the grief go away — grief is not a problem to solve. It is love with nowhere to go.
You listen, reflect, and occasionally offer a gentle question when it feels right to go deeper.
Never minimize. Never compare. Never offer silver linings unless the person finds them first.
If they express suicidal ideation or crisis, immediately and gently encourage professional help and provide the 988 Suicide & Crisis Lifeline.
Keep responses under 120 words. Let silence exist. You don't need to fill every moment.`,
    openingPrompt: (ctx) => `You're here to process grief about ${ctx.subject ?? 'a loss'}. I'm with you.

There's no agenda, no timeline. We go at your pace.

Tell me whatever you want to — or just sit here for a moment if you need to.

Where are you right now?`,
  },

  regression: {
    label: 'Guided Regression',
    systemPrompt: `${UTILITY_FRAMING}
You are guiding someone through a therapeutic regression — a gentle revisit of a past experience, viewed now with adult perspective and distance.
You are not a hypnotherapist. This is a conversational journey, not trance induction.
Your role: help them describe the scene with sensory detail, locate themselves in it as both child and witness, find what that younger version of them needed, and bring adult wisdom back to that moment.
Pace slowly. Ask one thing at a time. Never push. If it gets too intense, slow down and remind them they are safe in the present.
Responses under 100 words. Use present tense to bring the scene alive.`,
    openingPrompt: (ctx) => `We're going to gently revisit ${ctx.subject ?? 'a past experience'} together.

You're safe. You're here, in the present. What we're going to do is look back at that time — not to relive it, but to understand it with the wisdom you have now.

Close your eyes if that helps. Take a breath.

Tell me: how old were you, and where were you?`,
  },

  memory_walk: {
    label: 'Memory Walk',
    systemPrompt: `You are guiding someone on a memory walk — a rich, detailed reconstruction of a meaningful place from their past.
This could be their childhood home, their grandmother's kitchen, a school, a neighborhood.
Your job is to help them reconstruct it in vivid sensory detail: what they see, hear, smell, feel underfoot.
Ask about each room or area one at a time. Help them notice small things they haven't thought about in years — the way the light came through a window, what was on the kitchen counter, the specific sound of the front door.
After they've walked through the place, help them find what it meant to them — what it held for them.
Responses under 120 words. Sensory and specific.`,
    openingPrompt: (ctx) => `We're going to walk through ${ctx.subject ?? 'a place from your past'} together.

This is a space to remember it in detail — not just the big things, but the small ones. The things that made it feel like that place.

Let's start at the entrance or outside. What do you see first when you picture arriving there?`,
  },

  completion: {
    label: 'Completion Conversation',
    systemPrompt: `You are facilitating a completion conversation — helping someone say what they never got to say to a person who has passed.
Your first role is to help them find and articulate those unsaid things. Ask them what's been sitting with them. What they wish they'd said. What they needed to hear.
When they're ready, you will write a response in the voice and perspective of the person who passed — clearly labeled as AI-generated, not a channel or communication from the actual person.
This response should give them the gift of what they might have hoped to hear: acknowledgment, love, understanding, closure. Based only on what they've told you about who this person was.
Never claim this is real contact. Always frame: "If they could speak to you now, what they might want you to know is..." Never impersonate without the user's explicit request.
Responses under 150 words. Warm. Present. True to what they've shared.`,
    openingPrompt: (ctx) => `This is a space to say what was never said to ${ctx.personName ?? 'someone you lost'}.

There's something powerful about putting it into words — even now, even when they can't hear it.

Take your time. Tell me about them first. Who were they to you?`,
  },

  inner_child: {
    label: 'Inner Child Work',
    systemPrompt: `${UTILITY_FRAMING}
You are guiding someone in inner child healing — a conversation that helps them connect with and care for a younger version of themselves.
This is gentle, careful work. You help them locate a specific age or moment when they needed more than they received.
You help them speak to that younger self: what they would say now, what that child needed to hear, what they're finally giving themselves permission to feel.
You may also help the adult version hear what the child version wants to say to them.
Never rush toward resolution. Let them feel what needs to be felt.
Pace gently. One thread at a time. Keep responses under 100 words.`,
    openingPrompt: (ctx) => `Inner child work is some of the most tender work there is.

${ctx.subject ? `You mentioned wanting to connect with yourself around ${ctx.subject}.` : 'There\'s a younger version of you that has been waiting.'}

Let's find them gently. When you think about a time in your childhood when you felt most alone, or most in need — what age comes to mind?`,
  },

  memorial: {
    label: 'Memorial',
    systemPrompt: `You are helping someone create a living memorial for a person they have lost.
This is not grief processing — this is celebration and honoring. Your job is to help them capture who this person was: their quirks, their phrases, their way of being in the world. The small things as much as the large.
You will help them write a memorial piece — something they could share, keep, or simply have.
Ask about memories. Ask what made this person distinctly themselves. Ask what they would have said about various things.
Build a portrait through stories.
Responses under 120 words. Curious. Warm.`,
    openingPrompt: (ctx) => `Let's honor ${ctx.personName ?? 'them'}.

The best memorials aren't lists of accomplishments — they're portraits of who someone actually was. The way they laughed. What they always said. The things that made them undeniably themselves.

Tell me about them. Not from the beginning — just: what's the first thing that comes to mind when you think of them right now?`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export function createMemoryHealing({ pool, callAI, videoProduction = null, logger }) {

  function textOf(raw) {
    if (typeof raw === 'string') return raw;
    return raw?.content ?? raw?.text ?? '';
  }

  // ── Session management ────────────────────────────────────────────────────

  /**
   * Start a new healing session.
   * Returns the professional framing + opening question.
   * @param {{ userId, sessionType, title?, subject?, personName?, consent }} params
   * @returns {Promise<{ session, framing, openingMessage }>}
   */
  async function startSession({ userId, sessionType, title, subject, personName, consent }) {
    const config = SESSION_CONFIGS[sessionType];
    if (!config) throw new Error(`Unknown session type: ${sessionType}`);

    if (!consent) {
      return {
        session: null,
        framing: PROFESSIONAL_FRAMING,
        requiresConsent: true,
        openingMessage: null,
      };
    }

    const ctx = { subject, personName };
    const opening = config.openingPrompt(ctx);

    const initialConversation = [{
      role: 'assistant',
      content: opening,
      timestamp: new Date().toISOString(),
    }];

    const { rows } = await pool.query(
      `INSERT INTO healing_sessions
         (user_id, session_type, title, conversation, professional_framing_shown, consent_given)
       VALUES ($1, $2, $3, $4::jsonb, TRUE, TRUE)
       RETURNING *`,
      [userId, sessionType, title ?? config.label, JSON.stringify(initialConversation)]
    );

    return {
      session: rows[0],
      framing: PROFESSIONAL_FRAMING,
      requiresConsent: false,
      openingMessage: opening,
    };
  }

  /**
   * Send a message in a healing session. Returns AI response.
   * @param {{ sessionId, userId, message }} params
   * @returns {Promise<{ response: string, session: object }>}
   */
  async function sendMessage({ sessionId, userId, message }) {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM healing_sessions WHERE id = $1 AND user_id = $2 AND status != 'complete'`,
      [sessionId, userId]
    );
    if (!session) throw new Error('Session not found or already complete');

    const config = SESSION_CONFIGS[session.session_type];
    if (!config) throw new Error('Unknown session type');

    const conversation = Array.isArray(session.conversation) ? session.conversation : [];

    // Build turn history for context (last 10 turns)
    const history = conversation.slice(-10).map(t =>
      `${t.role === 'user' ? 'Person' : 'You'}: ${t.content}`
    ).join('\n\n');

    const fullPrompt = `${history}\n\nPerson: ${message}\n\nYou:`;

    let response = '';
    try {
      response = textOf(await callAI(fullPrompt, { systemPrompt: config.systemPrompt }));
    } catch (err) {
      logger?.warn({ err, sessionId }, '[memory-healing] AI call failed');
      response = 'I\'m here with you. Take your time.';
    }

    // Append both turns
    conversation.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    conversation.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });

    const { rows } = await pool.query(
      `UPDATE healing_sessions SET conversation = $1::jsonb WHERE id = $2 RETURNING *`,
      [JSON.stringify(conversation), sessionId]
    );

    return { response, session: rows[0] };
  }

  /**
   * Complete a session: extract insights and write a summary.
   * @param {{ sessionId, userId }} params
   * @returns {Promise<{ session: object, summary: string, insights: object }>}
   */
  async function completeSession({ sessionId, userId }) {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM healing_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    if (!session) throw new Error('Session not found');

    const conversation = Array.isArray(session.conversation) ? session.conversation : [];
    const userTurns = conversation.filter(t => t.role === 'user').map(t => t.content).join('\n\n');

    if (!userTurns || !callAI) {
      await pool.query(
        `UPDATE healing_sessions SET status = 'complete' WHERE id = $1`,
        [sessionId]
      );
      return { session, summary: null, insights: null };
    }

    const config = SESSION_CONFIGS[session.session_type];

    const extractPrompt = `This person just completed a ${config?.label ?? session.session_type} session. Here is what they shared:

${userTurns}

Extract:
1. A brief summary (2-3 sentences) of what they processed or arrived at
2. The most significant insight or realization (1 sentence)
3. Any action or intention they expressed (or null if none)
4. What they most needed and seemed to find

Return ONLY a JSON object:
{
  "summary": "...",
  "key_insight": "...",
  "intention": "..." or null,
  "what_was_found": "..."
}`;

    let insights = {};
    let summary = '';
    try {
      const raw = textOf(await callAI(extractPrompt));
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        summary = parsed.summary ?? '';
        insights = parsed;
      }
    } catch (err) {
      logger?.warn({ err, sessionId }, '[memory-healing] insight extraction failed');
    }

    const { rows } = await pool.query(
      `UPDATE healing_sessions
          SET status = 'complete', summary = $1, insights = $2::jsonb
        WHERE id = $3
       RETURNING *`,
      [summary, JSON.stringify(insights), sessionId]
    );

    return { session: rows[0], summary, insights };
  }

  /**
   * Get all sessions for a user, optionally filtered by type.
   */
  async function getSessions({ userId, sessionType = null }) {
    const query = sessionType
      ? `SELECT id, session_type, title, status, summary, created_at, updated_at
           FROM healing_sessions WHERE user_id = $1 AND session_type = $2 ORDER BY created_at DESC`
      : `SELECT id, session_type, title, status, summary, created_at, updated_at
           FROM healing_sessions WHERE user_id = $1 ORDER BY created_at DESC`;
    const params = sessionType ? [userId, sessionType] : [userId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  /**
   * Get a single session (ownership check).
   */
  async function getSession({ sessionId, userId }) {
    const { rows: [session] } = await pool.query(
      'SELECT * FROM healing_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    if (!session) throw new Error('Session not found');
    return session;
  }

  // ── Completion conversations ──────────────────────────────────────────────

  /**
   * Create a completion conversation — saying what was never said.
   * Generates an AI response "in the voice of" the person who passed.
   * ALWAYS clearly framed as AI, never as real contact.
   *
   * @param {{ userId, personName, relationship, whatHappened, unsaidThings, sessionId? }} params
   */
  async function createCompletionConversation({ userId, personName, relationship, whatHappened, unsaidThings, sessionId }) {
    const voicePrompt = `You are helping someone with a completion conversation. They want to say something to ${personName} (their ${relationship ?? 'loved one'}) who has passed away.

Context about this person and their relationship:
${whatHappened ?? '(no context provided)'}

What the user wants to say:
"${unsaidThings}"

Now write a response — what ${personName} might have wanted them to know. This is clearly AI-generated, not real contact. You are giving the gift of what they might have hoped to hear.

Frame it as: "What they might have wanted you to know is..." or similar.
Write in first person as ${personName}, based only on what the user has shared about them.
Warm. Specific to what they've told you. Healing. Under 200 words.

IMPORTANT: Include the phrase "(This is an AI-generated response, not communication from ${personName}.)" at the end.`;

    let aiResponse = '';
    if (callAI) {
      try {
        aiResponse = textOf(await callAI(voicePrompt));
      } catch (err) {
        logger?.warn({ err, userId }, '[memory-healing] completion conversation AI failed');
        aiResponse = `What ${personName} might have wanted you to know is that they heard you — even when words were hard, even when there wasn't enough time. The love was real. It still is.\n\n(This is an AI-generated response, not communication from ${personName}.)`;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO completion_conversations
         (user_id, session_id, person_name, relationship, what_happened, unsaid_things, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, sessionId ?? null, personName, relationship ?? null, whatHappened ?? null, unsaidThings, aiResponse]
    );

    return rows[0];
  }

  /**
   * Add the user's reply to a completion conversation and optionally close the loop.
   */
  async function replyToCompletion({ conversationId, userId, reply, feltComplete }) {
    const { rows } = await pool.query(
      `UPDATE completion_conversations
          SET user_reply = $1, felt_complete = $2
        WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [reply, feltComplete ?? null, conversationId, userId]
    );
    if (!rows.length) throw new Error('Conversation not found');
    return rows[0];
  }

  // ── Artifacts ─────────────────────────────────────────────────────────────

  /**
   * Store metadata about an artifact (photo, video, description) for reconstruction.
   */
  async function addArtifact({ userId, sessionId, artifactType, subject, description, url }) {
    const { rows } = await pool.query(
      `INSERT INTO healing_artifacts (user_id, session_id, artifact_type, subject, description, url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, sessionId ?? null, artifactType, subject ?? null, description ?? null, url ?? null]
    );
    return rows[0];
  }

  /**
   * Get artifacts for a user or specific session.
   */
  async function getArtifacts({ userId, sessionId = null }) {
    const query = sessionId
      ? `SELECT * FROM healing_artifacts WHERE user_id = $1 AND session_id = $2 ORDER BY created_at DESC`
      : `SELECT * FROM healing_artifacts WHERE user_id = $1 ORDER BY created_at DESC`;
    const params = sessionId ? [userId, sessionId] : [userId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  // ── Memory palace ─────────────────────────────────────────────────────────

  /**
   * Add a memory to the user's memory palace.
   */
  async function addMemory({ userId, memoryTitle, place, approximateAge, memoryText, sensoryDetails, emotion, significance }) {
    const { rows } = await pool.query(
      `INSERT INTO memory_palace
         (user_id, memory_title, place, approximate_age, memory_text, sensory_details, emotion, significance)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING *`,
      [userId, memoryTitle, place ?? null, approximateAge ?? null, memoryText ?? null,
       JSON.stringify(sensoryDetails ?? {}), emotion ?? null, significance ?? null]
    );
    return rows[0];
  }

  /**
   * Get a user's memory palace.
   */
  async function getMemoryPalace(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM memory_palace WHERE user_id = $1 ORDER BY approximate_age ASC, created_at ASC`,
      [userId]
    );
    return rows;
  }

  // ── AI-generated healing videos ───────────────────────────────────────────

  /**
   * Queue a healing video. Builds prompt from artifacts + session context.
   * @param {{ userId, sessionId, videoType, subject, artifacts?, additionalContext }} params
   */
  async function queueHealingVideo({ userId, sessionId, videoType, subject, artifacts = [], additionalContext = '' }) {
    const ethicalFraming = videoType === 'memorial'
      ? `This video is an AI-generated memorial, not a recording of or communication from ${subject ?? 'this person'}. It is created from descriptions and photos you provided as an act of remembrance and healing.`
      : `This is an AI-generated visual reconstruction to support your healing work. It is not a recording of actual events.`;

    // Build prompt
    let prompt = '';
    if (callAI) {
      const artifactDescriptions = artifacts.map(a => a.description ?? a.subject ?? '').filter(Boolean).join('; ');

      const promptRequest = videoType === 'memorial'
        ? `Create a cinematic AI video prompt for a memorial video honoring ${subject ?? 'a loved one'}.
Context about them: ${additionalContext || artifactDescriptions || '(not provided)'}
The video should feel like a quiet, warm tribute — not sad, not celebratory, just present and honoring.
Use natural lighting, soft movement. No faces (AI video limitation). Focus on symbolic imagery, places, objects associated with them.
Return only the video prompt (under 200 words).`
        : videoType === 'memory_reconstruction'
        ? `Create a cinematic AI video prompt for a memory reconstruction.
The subject is: ${subject ?? 'a meaningful place from childhood'}
Additional context: ${additionalContext || artifactDescriptions || '(not provided)'}
Make it warm, slightly dreamlike, sensory. Focus on light, texture, atmosphere. No specific faces.
Return only the video prompt (under 200 words).`
        : `Create a healing visual meditation video prompt.
Theme: ${subject ?? 'inner healing'}
Context: ${additionalContext || '(general healing)'}
Atmospheric, calming, symbolic. No faces. Focus on nature, light, gentle movement.
Return only the video prompt (under 200 words).`;

      try {
        prompt = textOf(await callAI(promptRequest)).trim();
      } catch {
        prompt = `Cinematic healing video: ${subject ?? 'a meaningful place'}. Warm natural light, gentle movement, soft and contemplative. No faces. ${additionalContext}`;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO healing_videos
         (user_id, session_id, video_type, prompt, ethical_framing)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, sessionId ?? null, videoType, prompt, ethicalFraming]
    );

    // Submit to Replicate if available
    let video = rows[0];
    if (videoProduction && prompt) {
      try {
        const queued = await videoProduction.queueVideo({
          userId,
          videoType: 'memorial',
          script: prompt,
        });
        if (queued?.replicate_id) {
          const { rows: updated } = await pool.query(
            `UPDATE healing_videos SET replicate_id = $1, status = 'processing' WHERE id = $2 RETURNING *`,
            [queued.replicate_id, video.id]
          );
          video = updated[0];
        }
      } catch (err) {
        logger?.warn({ err }, '[memory-healing] replicate submission failed — video stays queued');
      }
    }

    return { video, ethicalFraming };
  }

  /**
   * Get healing videos for a user.
   */
  async function getHealingVideos({ userId, sessionId = null }) {
    const query = sessionId
      ? `SELECT * FROM healing_videos WHERE user_id = $1 AND session_id = $2 ORDER BY created_at DESC`
      : `SELECT * FROM healing_videos WHERE user_id = $1 ORDER BY created_at DESC`;
    const params = sessionId ? [userId, sessionId] : [userId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  // ── Data erasure (user sovereignty) ──────────────────────────────────────

  /**
   * Delete all healing data for a user. Irreversible.
   */
  async function eraseAllHealingData(userId) {
    await pool.query('DELETE FROM healing_sessions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM healing_artifacts WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM healing_videos WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM completion_conversations WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM memory_palace WHERE user_id = $1', [userId]);
    logger?.info({ userId }, '[memory-healing] all healing data erased for user');
    return { erased: true };
  }

  return {
    // Session lifecycle
    startSession,
    sendMessage,
    completeSession,
    getSessions,
    getSession,
    // Completion conversations
    createCompletionConversation,
    replyToCompletion,
    // Artifacts
    addArtifact,
    getArtifacts,
    // Memory palace
    addMemory,
    getMemoryPalace,
    // Healing videos
    queueHealingVideo,
    getHealingVideos,
    // Erasure
    eraseAllHealingData,
    // Expose framing for routes
    PROFESSIONAL_FRAMING,
    SESSION_CONFIGS,
  };
}
