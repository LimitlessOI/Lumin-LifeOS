/**
 * services/character-builder.js
 *
 * LifeOS Children's App — Character Building Engine
 *
 * Integrity, generosity, and courage are not taught by lecture.
 * They are built through story, choice, reflection, and real-world recognition.
 *
 * This module:
 * 1. Generates age-appropriate stories where the child is the protagonist
 * 2. Presents two choices — one that embodies the virtue, one that doesn't
 * 3. After the child chooses, delivers outcome narrative + earns points
 * 4. Lets parents log real-world character moments (evidence base)
 * 5. Tracks character growth across three virtues over time
 *
 * No moralizing. No grades. No shame for wrong choices — the story shows the outcome.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const TRAITS = ['integrity', 'generosity', 'courage'];

const STORY_PROMPTS = {
  integrity: 'integrity (doing the right thing when no one is watching, telling the truth even when it is hard)',
  generosity: 'generosity (giving time, attention, kindness, or something of value to someone else without being asked)',
  courage: 'courage (doing something that feels scary or hard because it matters, speaking up for yourself or someone else)',
};

const AGE_STYLE = {
  '4-5':  'Use very short sentences. Simple words only. Make the character a friendly animal or a child named after the reader. Fun and warm.',
  '6-9':  'Use short paragraphs and clear language. The protagonist can be the child themselves. Add a small adventure. Make the choice feel real.',
  '10-12': 'Write with more complexity. The protagonist faces a realistic situation at school or home. The right choice has a real cost — it is not easy.',
  '13+':  'Write like a real short story. The protagonist faces social pressure, a friendship conflict, or a moment where integrity is genuinely hard. No easy answers.',
};

const POINTS = {
  correct_story_choice:   10,
  parent_moment_logged:    5,
  parent_moment_celebrated: 10,
};

export function createCharacterBuilder({ pool, callAI, logger }) {
  const log = logger || console;

  // ── Get or create character profile ────────────────────────────────────────
  async function getProfile(childId) {
    const { rows } = await pool.query(
      `SELECT cp.*, ch.display_name, ch.age
       FROM character_profiles cp
       JOIN child_profiles ch ON ch.id = cp.child_id
       WHERE cp.child_id = $1`,
      [childId]
    );
    if (!rows.length) {
      // Auto-create profile if child exists
      await pool.query(
        `INSERT INTO character_profiles (child_id) VALUES ($1) ON CONFLICT (child_id) DO NOTHING`,
        [childId]
      );
      return getProfile(childId);
    }
    const p = rows[0];
    p.total_pts = p.integrity_pts + p.generosity_pts + p.courage_pts;
    p.level     = computeLevel(p.total_pts);
    return p;
  }

  // ── Generate a new story ────────────────────────────────────────────────────
  async function generateStory(childId, { trait = null, age_group = '6-9' } = {}) {
    if (!callAI) throw new Error('AI not available');
    const selectedTrait = trait && TRAITS.includes(trait) ? trait : TRAITS[Math.floor(Math.random() * TRAITS.length)];
    const style = AGE_STYLE[age_group] || AGE_STYLE['6-9'];

    const prompt = `You are writing a short character-building story for a child.

Trait to teach: ${STORY_PROMPTS[selectedTrait]}
Age group: ${age_group}
Style guidance: ${style}

Write a very short story (150–250 words) where the child protagonist faces a moment requiring ${selectedTrait}. End the story just before the protagonist makes their choice.

Then provide TWO options:
- Choice A: the choice that embodies ${selectedTrait}
- Choice B: the choice that takes the easier or less honest path

Return ONLY valid JSON in this exact shape (no markdown, no explanation):
{
  "title": "<story title>",
  "story_text": "<the story, ending before the choice>",
  "choice_a": "<first option — one sentence>",
  "choice_b": "<second option — one sentence>",
  "good_choice": "<'a' or 'b' — which choice embodies ${selectedTrait}>"
}`;

    let parsed;
    try {
      const raw = await callAI(prompt);
      const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error(`Story generation failed: ${e.message}`);
    }

    const { rows: [story] } = await pool.query(
      `INSERT INTO character_stories
         (child_id, trait, title, story_text, choice_a, choice_b, good_choice, age_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [childId, selectedTrait, parsed.title, parsed.story_text, parsed.choice_a, parsed.choice_b, parsed.good_choice, age_group]
    );
    return story;
  }

  // ── Child responds to a story ───────────────────────────────────────────────
  async function respondToStory(childId, { storyId, choice, reflection = null }) {
    const { rows: [story] } = await pool.query(
      `SELECT * FROM character_stories WHERE id = $1 AND child_id = $2`,
      [storyId, childId]
    );
    if (!story) throw Object.assign(new Error('Story not found'), { status: 404 });
    if (!['a', 'b'].includes(choice)) throw Object.assign(new Error('choice must be a or b'), { status: 400 });

    const correct   = choice === story.good_choice;
    const ptsEarned = correct ? POINTS.correct_story_choice : 0;

    // Record response
    const { rows: [resp] } = await pool.query(
      `INSERT INTO character_story_responses
         (story_id, child_id, choice, pts_earned, reflection)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [storyId, childId, choice, ptsEarned, reflection || null]
    );

    // Award points
    if (ptsEarned > 0) {
      await pool.query(
        `UPDATE character_profiles
         SET ${story.trait}_pts = ${story.trait}_pts + $1, updated_at = NOW()
         WHERE child_id = $2`,
        [ptsEarned, childId]
      );
    }

    // Generate outcome narrative if AI available
    let outcomeNarrative = correct
      ? `That was the courageous choice. ${story.choice_a === choice ? story.choice_a : story.choice_b} — and that matters.`
      : `That was the easier path. What do you think might have happened differently?`;

    if (callAI) {
      try {
        const outcomePrompt = `A child just finished reading this story and made a choice.

Story: ${story.story_text}

They chose: ${choice === 'a' ? story.choice_a : story.choice_b}
This choice was: ${correct ? 'the one that shows ' + story.trait : 'the easier path'}

Write 2-3 warm, non-preachy sentences showing what happened next in the story as a result of their choice. If they made the virtuous choice, celebrate it genuinely. If they made the easier choice, show a natural consequence without shame — just what happened. End with one gentle question to think about. Age group: 6-9.`;
        outcomeNarrative = await callAI(outcomePrompt);
      } catch { /* use fallback above */ }
    }

    return { response: resp, correct, pts_earned: ptsEarned, outcome_narrative: outcomeNarrative };
  }

  // ── Parent logs a real-world moment ────────────────────────────────────────
  async function logMoment(childId, { loggedBy, trait, title, description = null, ptOverride = null }) {
    if (!TRAITS.includes(trait)) throw Object.assign(new Error('Invalid trait'), { status: 400 });
    const pts = ptOverride ?? POINTS.parent_moment_logged;
    const { rows: [moment] } = await pool.query(
      `INSERT INTO character_moments
         (child_id, logged_by, trait, title, description, pts_awarded)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [childId, loggedBy || null, trait, title, description || null, pts]
    );
    await pool.query(
      `UPDATE character_profiles
       SET ${trait}_pts = ${trait}_pts + $1, updated_at = NOW()
       WHERE child_id = $2`,
      [pts, childId]
    );
    return moment;
  }

  // ── Celebrate a moment (parent taps celebrate) ───────────────────────────────
  async function celebrateMoment(momentId, childId) {
    const { rows } = await pool.query(
      `UPDATE character_moments
       SET celebrated = TRUE
       WHERE id = $1 AND child_id = $2 AND celebrated = FALSE
       RETURNING *`,
      [momentId, childId]
    );
    if (!rows.length) return { ok: true, already_celebrated: true };
    const m = rows[0];
    await pool.query(
      `UPDATE character_profiles
       SET ${m.trait}_pts = ${m.trait}_pts + $1, updated_at = NOW()
       WHERE child_id = $2`,
      [POINTS.parent_moment_celebrated, childId]
    );
    return { ok: true, bonus_pts: POINTS.parent_moment_celebrated };
  }

  // ── Get character history ────────────────────────────────────────────────────
  async function getMoments(childId, { limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM character_moments WHERE child_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [childId, Math.min(limit, 100)]
    );
    return rows;
  }

  async function getStoryHistory(childId, { limit = 20 } = {}) {
    const { rows } = await pool.query(
      `SELECT cs.*, csr.choice, csr.pts_earned, csr.reflection
       FROM character_stories cs
       LEFT JOIN character_story_responses csr ON csr.story_id = cs.id AND csr.child_id = cs.child_id
       WHERE cs.child_id = $1
       ORDER BY cs.created_at DESC
       LIMIT $2`,
      [childId, Math.min(limit, 50)]
    );
    return rows;
  }

  // ── Internal ────────────────────────────────────────────────────────────────
  function computeLevel(totalPts) {
    if (totalPts < 20)   return 1;
    if (totalPts < 60)   return 2;
    if (totalPts < 120)  return 3;
    if (totalPts < 220)  return 4;
    if (totalPts < 370)  return 5;
    if (totalPts < 570)  return 6;
    if (totalPts < 820)  return 7;
    if (totalPts < 1120) return 8;
    if (totalPts < 1520) return 9;
    return 10;
  }

  return {
    getProfile,
    generateStory,
    respondToStory,
    logMoment,
    celebrateMoment,
    getMoments,
    getStoryHistory,
  };
}
