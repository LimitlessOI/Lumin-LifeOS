/**
 * services/victory-vault.js
 *
 * LifeOS Growth extension — Victory Vault / Identity Evidence Engine.
 *
 * Stores proof-of-becoming moments (wins, courage, integrity, repair, discipline)
 * and synthesizes replay reels that can be used for future encouragement or
 * video-generation inputs.
 *
 * Exports:
 *   createVictoryVault({ pool, callAI, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const ALLOWED_MOMENT_TYPES = new Set([
  'courage',
  'discipline',
  'repair',
  'breakthrough',
  'goal',
  'integrity',
  'health',
  'parenting',
  'business',
  'faith',
  'other',
]);

const ALLOWED_MEDIA_TYPES = new Set(['audio', 'video', 'text', 'image', 'mixed']);
const ALLOWED_SOURCE_TYPES = new Set(['manual', 'voice_note', 'video_clip', 'imported']);

function normalizeEnum(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function fallbackScenePlan(moments = []) {
  return moments.map((moment, index) => ({
    order: index + 1,
    moment_id: moment.id,
    scene: moment.title,
    visual: moment.media_url
      ? `Use the saved ${moment.media_type || 'media'} from this moment as the anchor clip.`
      : `Build a reflective montage around ${moment.title.toLowerCase()}.`,
    voiceover: moment.what_it_proves || moment.outcome_summary || moment.what_you_did,
  }));
}

function fallbackNarration(title, purpose, moments = []) {
  const opener = purpose
    ? `This reel exists for ${purpose}.`
    : 'This reel exists to remind you what is already true about you.';
  const beats = moments.map((moment) => {
    const proof = moment.what_it_proves || moment.outcome_summary || moment.what_you_did;
    return `${moment.title}: ${proof}`;
  });
  return [title, opener, ...beats].filter(Boolean).join('\n\n');
}

export function createVictoryVault({ pool, callAI, logger }) {
  async function logMoment({
    userId,
    title,
    momentType,
    whatWasHard,
    whatYouDid,
    whatItProves,
    outcomeSummary,
    emotionalBefore,
    emotionalAfter,
    goalLink,
    mediaType,
    mediaUrl,
    transcript,
    sourceType,
  }) {
    if (!title) throw new Error('title required');
    if (!whatYouDid) throw new Error('whatYouDid required');

    const normalizedMomentType = normalizeEnum(momentType, ALLOWED_MOMENT_TYPES, 'other');
    const normalizedMediaType = normalizeEnum(mediaType, ALLOWED_MEDIA_TYPES, mediaUrl ? 'mixed' : 'text');
    const normalizedSourceType = normalizeEnum(sourceType, ALLOWED_SOURCE_TYPES, 'manual');

    const playbackWeight = [whatItProves, outcomeSummary, mediaUrl].filter(Boolean).length + 1;

    const { rows } = await pool.query(`
      INSERT INTO victory_moments (
        user_id, title, moment_type, what_was_hard, what_you_did, what_it_proves,
        outcome_summary, emotional_before, emotional_after, goal_link,
        media_type, media_url, transcript, source_type, playback_weight
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      userId,
      title,
      normalizedMomentType,
      whatWasHard || null,
      whatYouDid,
      whatItProves || null,
      outcomeSummary || null,
      emotionalBefore || null,
      emotionalAfter || null,
      goalLink || null,
      normalizedMediaType,
      mediaUrl || null,
      transcript || null,
      normalizedSourceType,
      playbackWeight,
    ]);

    return rows[0];
  }

  async function getMoments({ userId, limit = 25 }) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const { rows } = await pool.query(`
      SELECT *
      FROM victory_moments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, safeLimit]);
    return rows;
  }

  async function getMomentSummaryForPrompt({ userId, momentIds = [] }) {
    if (momentIds.length) {
      const { rows } = await pool.query(`
        SELECT *
        FROM victory_moments
        WHERE user_id = $1
          AND id = ANY($2::bigint[])
        ORDER BY created_at DESC
      `, [userId, momentIds]);
      if (rows.length) return rows;
    }

    const { rows } = await pool.query(`
      SELECT *
      FROM victory_moments
      WHERE user_id = $1
      ORDER BY playback_weight DESC, created_at DESC
      LIMIT 5
    `, [userId]);
    return rows;
  }

  async function buildReplay({ userId, title, purpose, momentIds = [] }) {
    const moments = await getMomentSummaryForPrompt({ userId, momentIds });
    if (!moments.length) throw new Error('No victory moments available yet');

    const requestedTitle = title || 'Proof You Already Do Hard Things';
    const requestedPurpose = purpose || 're-ground you in evidence instead of self-doubt';

    let narrationScript = fallbackNarration(requestedTitle, requestedPurpose, moments);
    let scenePlan = fallbackScenePlan(moments);

    if (callAI) {
      try {
        const prompt = `You are building a short personal replay reel from real proof-of-becoming moments.

Purpose: ${requestedPurpose}
Requested title: ${requestedTitle}

Moments:
${moments.map((moment, index) => `${index + 1}. ${moment.title}\nType: ${moment.moment_type}\nWhat was hard: ${moment.what_was_hard || 'n/a'}\nWhat they did: ${moment.what_you_did}\nWhat it proves: ${moment.what_it_proves || 'n/a'}\nOutcome: ${moment.outcome_summary || 'n/a'}\nEmotion before: ${moment.emotional_before || 'n/a'}\nEmotion after: ${moment.emotional_after || 'n/a'}\nMedia url: ${moment.media_url || 'n/a'}\nTranscript: ${moment.transcript || 'n/a'}`).join('\n\n')}

Return ONLY JSON in this shape:
{
  "title": "...",
  "purpose": "...",
  "narration_script": "120-220 words, second person, grounded, evidence-based, no hype",
  "scene_plan": [
    {
      "order": 1,
      "moment_id": 123,
      "scene": "short scene label",
      "visual": "what to show",
      "voiceover": "single sentence tied to evidence"
    }
  ],
  "render_prompt": "short cinematic production prompt for a future renderer"
}

Rules:
- Use only the supplied moments.
- Do not invent wins.
- Tone is calm, honest, strengthening.
- The reel should feel like proof, not marketing.`;

        const raw = await callAI(prompt);
        const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
        const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
        narrationScript = parsed.narration_script || narrationScript;
        scenePlan = Array.isArray(parsed.scene_plan) && parsed.scene_plan.length ? parsed.scene_plan : scenePlan;
        title = parsed.title || requestedTitle;
        purpose = parsed.purpose || requestedPurpose;
        const renderPrompt = parsed.render_prompt || null;

        const { rows } = await pool.query(`
          INSERT INTO victory_reels (
            user_id, title, purpose, selected_moment_ids, narration_script, scene_plan, render_prompt, status
          )
          VALUES ($1,$2,$3,$4::bigint[],$5,$6::jsonb,$7,$8)
          RETURNING *
        `, [
          userId,
          title,
          purpose,
          momentIds.length ? momentIds : moments.map((m) => m.id),
          narrationScript,
          JSON.stringify(scenePlan),
          renderPrompt,
          'ready',
        ]);

        return { reel: rows[0], moments };
      } catch (err) {
        logger?.warn?.({ err: err.message }, 'victory-vault: AI reel generation failed, using fallback');
      }
    }

    const renderPrompt = `Create a grounded personal highlight reel from these real moments: ${moments.map((m) => m.title).join(', ')}. Tone: honest, cinematic, evidence-based.`;
    const { rows } = await pool.query(`
      INSERT INTO victory_reels (
        user_id, title, purpose, selected_moment_ids, narration_script, scene_plan, render_prompt, status
      )
      VALUES ($1,$2,$3,$4::bigint[],$5,$6::jsonb,$7,$8)
      RETURNING *
    `, [
      userId,
      requestedTitle,
      requestedPurpose,
      momentIds.length ? momentIds : moments.map((m) => m.id),
      narrationScript,
      JSON.stringify(scenePlan),
      renderPrompt,
      'draft',
    ]);

    return { reel: rows[0], moments };
  }

  async function getReels({ userId, limit = 10 }) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const { rows } = await pool.query(`
      SELECT *
      FROM victory_reels
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, safeLimit]);
    return rows;
  }

  return {
    logMoment,
    getMoments,
    buildReplay,
    getReels,
  };
}
