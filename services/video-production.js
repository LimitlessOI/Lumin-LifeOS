/**
 * services/video-production.js
 *
 * Video Production system — generates personalized AI video content using
 * Replicate API. Builds cinematic prompts from LifeOS data (vision narratives,
 * timeline projections, weekly summaries) and manages the video lifecycle.
 *
 * Exports: createVideoProduction({ pool, callAI, logger })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

// Wan 2.1 for speed (default), Kling 1.6 for quality (future_life, legacy)
const REPLICATE_MODELS = {
  speed:   'wavespeedai/wan-2.1-t2v-480p',
  quality: 'klingai/kling-v1-6-standard',
};

// ── Script generation system prompt ────────────────────────────────────────
const SCRIPT_SYSTEM_PROMPT = `You write narration scripts for short personal videos.

Your scripts are:
- Second person, present tense ("You are standing at...")
- Vivid and specific — not generic
- Emotionally true without being sentimental
- 60-90 seconds when spoken aloud (approximately 150-200 words)

For future life videos: write as a letter from the person's future self.
For weekly reflection videos: warm, celebratory of real progress, honest about real challenges.
For timeline videos: clear contrast between two paths, specific turning points.

Never write anything that sounds like marketing copy. This is personal. It should feel like it was written specifically for one person — because it was.`;

export function createVideoProduction({ pool, callAI, logger }) {

  // ── Internal helpers ────────────────────────────────────────────────────

  async function replicateRequest(path, method = 'GET', body = null) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('REPLICATE_API_TOKEN not set');

    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${REPLICATE_API_BASE}${path}`, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Replicate API ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json();
  }

  function selectModel(videoType) {
    // Higher-quality model for the most emotionally significant types
    if (videoType === 'future_life' || videoType === 'legacy') {
      return REPLICATE_MODELS.quality;
    }
    return REPLICATE_MODELS.speed;
  }

  // ── buildFutureLifePrompt ───────────────────────────────────────────────

  /**
   * Build a cinematic Replicate video prompt from vision narrative and answers.
   * @param {{ userId, narrative, answers }} params
   * @returns {Promise<string>}
   */
  async function buildFutureLifePrompt({ userId, narrative, answers }) {
    const a = answers || {};
    const eulogyWords   = (a.eulogy_words || []).slice(0, 4).join(', ');
    const achievements  = (a.proudest_achievements || []).slice(0, 2).join('; ');
    const legacy        = a.legacy_statement || '';
    const relationships = a.key_relationships || '';

    if (callAI) {
      try {
        const promptRequest = [
          'Generate a detailed Replicate AI video generation prompt for a "future life" personal video.',
          '',
          'The video should be:',
          '- Cinematic montage, warm golden hour lighting',
          '- A person in their 70s, wise and at peace',
          '- Showing specific scenes from a fulfilled life',
          '- Slow pans, documentary style, deeply human',
          '- No text overlays. Photorealistic.',
          '',
          'User vision data:',
          eulogyWords     ? `Who they want to have been: ${eulogyWords}` : '',
          achievements    ? `Proudest achievements: ${achievements}` : '',
          legacy          ? `Legacy: ${legacy}` : '',
          relationships   ? `Relationships: ${relationships}` : '',
          narrative ? `\nNarrative excerpt (first 300 chars): ${narrative.substring(0, 300)}` : '',
          '',
          'Write a single video generation prompt, 3-5 sentences, cinematic and specific.',
          'Return only the prompt text — no labels, no quotes.',
        ].filter(Boolean).join('\n');

        const raw = await callAI(SCRIPT_SYSTEM_PROMPT, promptRequest);
        const result = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (result) return result;
      } catch (err) {
        logger?.warn?.(`[VIDEO] Future life prompt AI generation failed: ${err.message}`);
      }
    }

    // Fallback: construct directly from available data
    const scenes = [];
    if (relationships) scenes.push(`surrounded by ${relationships}`);
    if (achievements)  scenes.push(`reflecting on ${achievements}`);
    if (legacy)        scenes.push(`with the quiet satisfaction of ${legacy}`);

    return [
      `Cinematic montage, warm golden hour lighting.`,
      `A person in their 70s, vital and at peace, ${eulogyWords || 'wise and kind'}.`,
      scenes.length ? `${scenes.join(', ')}.` : 'A life lived with purpose and presence.',
      `Slow pans, documentary style, deeply human. No text. Photorealistic.`,
    ].join(' ');
  }

  // ── buildCompoundingPrompt ──────────────────────────────────────────────

  /**
   * Build a video prompt visualizing the divergence between two life paths.
   * @param {{ currentTrajectory, alignedTrajectory, hingeDecisions }} params
   * @returns {Promise<string>}
   */
  async function buildCompoundingPrompt({ currentTrajectory, alignedTrajectory, hingeDecisions }) {
    if (callAI) {
      try {
        const promptRequest = [
          'Generate a Replicate AI video generation prompt for a "two paths" visualization video.',
          '',
          'The video should:',
          '- Start with a single person at a crossroads moment (morning, looking out a window)',
          '- Split into two visual paths — one muted/gray, one warm/vibrant',
          '- Show contrasting futures without being preachy',
          '- End on the vibrant path, a person living the aligned life',
          '- Cinematic, no text, photorealistic',
          '',
          'Current trajectory (20 years): ' + (currentTrajectory?.year_20 || 'unclear path'),
          'Aligned trajectory (20 years): ' + (alignedTrajectory?.year_20 || 'purpose-driven life'),
          hingeDecisions?.length
            ? `Key hinge decisions: ${hingeDecisions.slice(0, 3).join('; ')}`
            : '',
          '',
          'Write a single video generation prompt, 3-5 sentences, cinematic and specific.',
          'Return only the prompt text — no labels, no quotes.',
        ].filter(Boolean).join('\n');

        const raw = await callAI(SCRIPT_SYSTEM_PROMPT, promptRequest);
        const result = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (result) return result;
      } catch (err) {
        logger?.warn?.(`[VIDEO] Compounding prompt AI generation failed: ${err.message}`);
      }
    }

    return [
      `Split-screen cinematic visualization. Left side: muted, desaturated, a person going through the motions of an ordinary day.`,
      `Right side: warm golden light, the same person but alive with purpose — laughing with family, building something meaningful, fully present.`,
      `Both paths start from the same morning. The divergence is in the small choices.`,
      `Documentary style. No text. Photorealistic. The right path wins.`,
    ].join(' ');
  }

  // ── buildWeeklyReflectionPrompt ─────────────────────────────────────────

  /**
   * Build a prompt for a short weekly reflection video.
   * @param {{ userId, weekSummary }} params
   * @returns {Promise<string>}
   */
  async function buildWeeklyReflectionPrompt({ userId, weekSummary }) {
    const ws = weekSummary || {};
    const keptPct = ws.commitmentsTotal > 0
      ? Math.round((ws.commitmentsKept / ws.commitmentsTotal) * 100)
      : null;

    if (callAI) {
      try {
        const promptRequest = [
          'Generate a warm, personal Replicate AI video prompt for a weekly reflection video (30-60 seconds).',
          '',
          'This is a celebration of a real person\'s real week. Not generic. Specific to what they did.',
          '',
          'Week data:',
          keptPct != null ? `Commitments kept: ${keptPct}%` : '',
          ws.joyScore      ? `Joy score: ${ws.joyScore}/100` : '',
          ws.integrityScore ? `Integrity score: ${ws.integrityScore}/100` : '',
          ws.biggestWin     ? `Biggest win: ${ws.biggestWin}` : '',
          ws.biggestChallenge ? `Biggest challenge: ${ws.biggestChallenge}` : '',
          '',
          'Tone: warm, personal, celebratory of real progress. Not a highlight reel — honest.',
          'Visual style: close and human — hands, faces, small moments. Morning light. Real.',
          '',
          'Write a single video generation prompt, 2-4 sentences.',
          'Return only the prompt text — no labels, no quotes.',
        ].filter(Boolean).join('\n');

        const raw = await callAI(SCRIPT_SYSTEM_PROMPT, promptRequest);
        const result = (typeof raw === 'string' ? raw : raw?.content || '').trim();
        if (result) return result;
      } catch (err) {
        logger?.warn?.(`[VIDEO] Weekly reflection prompt AI generation failed: ${err.message}`);
      }
    }

    return [
      `Warm, intimate close-ups of a person's week — hands at work, morning coffee, a genuine laugh, a moment of stillness.`,
      `${keptPct != null ? `They kept ${keptPct}% of what they said they'd do.` : 'A week lived with intention.'}`,
      `Soft natural light, documentary style. Real. Human. A week worth remembering.`,
    ].join(' ');
  }

  // ── generateScript ──────────────────────────────────────────────────────

  /**
   * Generate a 60-90 second narration script for a video.
   * @param {{ userId, videoType, narrative, answers }} params
   * @returns {Promise<string|null>}
   */
  async function generateScript({ userId, videoType, narrative, answers }) {
    if (!callAI) return null;

    const a = answers || {};

    let scriptContext;
    if (videoType === 'future_life') {
      scriptContext = [
        'Write a 60-90 second narration script for a "future life" video.',
        'This reads as a letter from the person\'s future self.',
        'Second person, present tense, vivid and specific.',
        '',
        'Their vision:',
        narrative ? narrative.substring(0, 600) : '(no narrative available)',
        a.legacy_statement ? `Legacy: ${a.legacy_statement}` : '',
        a.future_self_description ? `Future self: ${a.future_self_description}` : '',
      ].filter(Boolean).join('\n');
    } else if (videoType === 'compounding_timeline') {
      scriptContext = [
        'Write a 60-90 second narration script for a "two paths" video.',
        'The script moves from the current trajectory to the aligned trajectory.',
        'Name the hinge moment — where the paths diverge.',
        'End on the aligned path. Specific. Honest. Not preachy.',
      ].join('\n');
    } else if (videoType === 'weekly_reflection') {
      scriptContext = [
        'Write a 30-60 second narration script for a weekly reflection video.',
        'Second person, warm, celebratory of real effort — not just results.',
        'Honest about both wins and challenges.',
        'End with one sentence about what this week built toward.',
      ].join('\n');
    } else {
      scriptContext = [
        `Write a 60-90 second narration script for a "${videoType}" personal video.`,
        'Second person, vivid, specific to this person\'s life.',
      ].join('\n');
    }

    try {
      const raw = await callAI(SCRIPT_SYSTEM_PROMPT, scriptContext);
      return (typeof raw === 'string' ? raw : raw?.content || '').trim() || null;
    } catch (err) {
      logger?.warn?.(`[VIDEO] Script generation failed: ${err.message}`);
      return null;
    }
  }

  // ── queueVideo ───────────────────────────────────────────────────────────

  /**
   * Insert a video record and optionally submit to Replicate.
   * @param {{ userId, visionSessionId, videoType, prompt, script }} params
   * @returns {Promise<object>} the video record
   */
  async function queueVideo({ userId, visionSessionId, videoType, prompt, script }) {
    if (!userId)    throw new Error('userId is required');
    if (!videoType) throw new Error('videoType is required');
    if (!prompt)    throw new Error('prompt is required');

    // Insert as queued
    const { rows } = await pool.query(
      `INSERT INTO future_videos
         (user_id, vision_session_id, video_type, prompt_used, script, status)
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING *`,
      [userId, visionSessionId || null, videoType, prompt, script || null]
    );

    let video = rows[0];

    // Submit to Replicate if configured
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const model = selectModel(videoType);
        const prediction = await replicateRequest('/predictions', 'POST', {
          model,
          input: {
            prompt,
            duration: videoType === 'weekly_reflection' ? 5 : 10,
          },
        });

        const { rows: updated } = await pool.query(
          `UPDATE future_videos
              SET replicate_prediction_id = $1,
                  status = 'processing',
                  updated_at = NOW()
            WHERE id = $2
            RETURNING *`,
          [prediction.id, video.id]
        );

        video = updated[0];
        logger?.info?.(`[VIDEO] Submitted to Replicate: video=${video.id} prediction=${prediction.id}`);
      } catch (err) {
        logger?.warn?.(`[VIDEO] Replicate submission failed: ${err.message}`);
        // Video stays queued — can be retried
      }
    }

    return video;
  }

  // ── checkVideoStatus ─────────────────────────────────────────────────────

  /**
   * Poll Replicate for the current status of a video prediction.
   * @param {{ videoId }} params
   * @returns {Promise<object>} updated video record
   */
  async function checkVideoStatus({ videoId }) {
    const { rows } = await pool.query(
      'SELECT * FROM future_videos WHERE id = $1',
      [videoId]
    );

    const video = rows[0];
    if (!video) throw new Error(`Video ${videoId} not found`);
    if (!video.replicate_prediction_id) return video;
    if (video.status === 'completed' || video.status === 'failed') return video;

    try {
      const prediction = await replicateRequest(`/predictions/${video.replicate_prediction_id}`);

      if (prediction.status === 'succeeded') {
        const videoUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;

        const { rows: updated } = await pool.query(
          `UPDATE future_videos
              SET video_url   = $1,
                  status      = 'completed',
                  updated_at  = NOW()
            WHERE id = $2
            RETURNING *`,
          [videoUrl || null, videoId]
        );

        logger?.info?.(`[VIDEO] Completed: video=${videoId} url=${videoUrl}`);
        return updated[0];
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const { rows: updated } = await pool.query(
          `UPDATE future_videos
              SET status = 'failed', updated_at = NOW()
            WHERE id = $1
            RETURNING *`,
          [videoId]
        );

        logger?.warn?.(`[VIDEO] Failed: video=${videoId} reason=${prediction.error || 'unknown'}`);
        return updated[0];
      }

      // Still processing — return as-is
      return video;
    } catch (err) {
      logger?.warn?.(`[VIDEO] Status check failed: ${err.message}`);
      return video;
    }
  }

  // ── getVideos ─────────────────────────────────────────────────────────────

  async function getVideos({ userId }) {
    if (!userId) throw new Error('userId is required');
    const { rows } = await pool.query(
      `SELECT * FROM future_videos
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── getPendingVideos ──────────────────────────────────────────────────────

  async function getPendingVideos() {
    const { rows } = await pool.query(
      `SELECT * FROM future_videos
        WHERE status = 'processing'
        ORDER BY created_at ASC`
    );
    return rows;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    buildFutureLifePrompt,
    buildCompoundingPrompt,
    buildWeeklyReflectionPrompt,
    generateScript,
    queueVideo,
    checkVideoStatus,
    getVideos,
    getPendingVideos,
  };
}
