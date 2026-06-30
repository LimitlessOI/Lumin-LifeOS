/**
 * SYNOPSIS: Generates content packs from coaching session answers using AI council.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import { randomUUID } from 'node:crypto';

function buildGenerationPrompt(niche, goal, answers) {
  const answerBlock = answers
    .map((a, i) => `Q${i + 1}: ${a.answer}`)
    .join('\n\n');
  return `You are a world-class content strategist for entrepreneurs and service professionals.

Generate a complete social media content pack from this coaching session.

NICHE: ${niche || 'business / professional services'}
GOAL: ${goal || 'grow audience and attract ideal clients'}

CLIENT ANSWERS:
${answerBlock}

OUTPUT (valid JSON only — no prose before or after the JSON block):
{
  "linkedin_posts": [
    { "hook": "...", "body": "...", "cta": "..." },
    { "hook": "...", "body": "...", "cta": "..." },
    { "hook": "...", "body": "...", "cta": "..." },
    { "hook": "...", "body": "...", "cta": "..." },
    { "hook": "...", "body": "...", "cta": "..." }
  ],
  "youtube_hooks": [
    "Hook 1 — pattern-interrupt opening for a 15-second earned-attention open",
    "Hook 2",
    "Hook 3"
  ],
  "instagram_captions": [
    { "text": "...", "hashtags": ["tag1", "tag2", "tag3"] },
    { "text": "...", "hashtags": ["tag1", "tag2", "tag3"] },
    { "text": "...", "hashtags": ["tag1", "tag2", "tag3"] }
  ],
  "email_subjects": [
    "Subject line 1 — curiosity-gap style",
    "Subject line 2",
    "Subject line 3"
  ],
  "core_story": "2-3 sentence summary of the most compelling story from these answers",
  "headline_angle": "The single strongest angle for this client's content"
}

Rules:
- Write in the client's own voice using their exact words where possible.
- LinkedIn hooks must be pattern interrupts — not questions, not "I", not generic openings.
- YouTube hooks: each earns the next 30 seconds — state a bold claim, create open loop, or promise a specific result.
- Instagram: authentic, not promotional. Hashtags niche-specific, not generic.
- Email subjects: specific curiosity gap — no clickbait, no ALL CAPS, no "free".
- Do NOT add generic business advice. Everything comes directly from what the client said.`;
}

export function createSocialmediaosContentGenerator({ pool, callAI }) {
  async function generateContentPack({ sessionId, ownerId }) {
    const { rows } = await pool.query(
      `SELECT id, metadata FROM socialmediaos_sessions
       WHERE id = $1 AND owner_id = $2 AND status = 'coaching_complete'`,
      [sessionId, ownerId]
    );
    if (!rows.length) {
      const err = new Error('Session not ready — coaching must be complete first');
      err.statusCode = 409;
      throw err;
    }

    const meta = rows[0].metadata;
    const prompt = buildGenerationPrompt(meta.niche, meta.goal, meta.answers || []);
    const raw = await callAI(prompt);

    let pack;
    try {
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error('No JSON found in response');
      pack = JSON.parse(raw.slice(jsonStart, jsonEnd));
    } catch (parseErr) {
      const err = new Error(`Content generation failed — AI response not parseable: ${parseErr.message}`);
      err.statusCode = 502;
      throw err;
    }

    const packId = randomUUID();
    await pool.query(
      `INSERT INTO socialmediaos_content_packs
         (id, session_id, owner_id, status, content, created_at, updated_at)
       VALUES ($1, $2, $3, 'generated', $4::jsonb, NOW(), NOW())`,
      [packId, sessionId, ownerId, JSON.stringify(pack)]
    );
    await pool.query(
      `UPDATE socialmediaos_sessions SET status = 'content_generated', updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    return { packId, pack };
  }

  async function getContentPack({ sessionId, ownerId }) {
    const { rows } = await pool.query(
      `SELECT cp.id, cp.content, cp.created_at
       FROM socialmediaos_content_packs cp
       WHERE cp.session_id = $1 AND cp.owner_id = $2
       ORDER BY cp.created_at DESC LIMIT 1`,
      [sessionId, ownerId]
    );
    if (!rows.length) {
      const err = new Error('No content pack found — generate one first');
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  function exportAsText(pack) {
    const p = typeof pack === 'string' ? JSON.parse(pack) : pack;
    const lines = ['=== SOCIALMEDIAOS CONTENT PACK ===', ''];

    if (p.headline_angle) lines.push(`HEADLINE ANGLE: ${p.headline_angle}`, '');
    if (p.core_story) lines.push(`CORE STORY: ${p.core_story}`, '');

    lines.push('', '--- LINKEDIN POSTS ---');
    (p.linkedin_posts || []).forEach((post, i) => {
      lines.push(`\n[Post ${i + 1}]`);
      lines.push(post.hook);
      lines.push('');
      lines.push(post.body);
      lines.push('');
      lines.push(post.cta);
    });

    lines.push('\n--- YOUTUBE HOOKS ---');
    (p.youtube_hooks || []).forEach((hook, i) => lines.push(`${i + 1}. ${hook}`));

    lines.push('\n--- INSTAGRAM CAPTIONS ---');
    (p.instagram_captions || []).forEach((cap, i) => {
      lines.push(`\n[Caption ${i + 1}]`);
      lines.push(cap.text);
      lines.push((cap.hashtags || []).map((h) => `#${h}`).join(' '));
    });

    lines.push('\n--- EMAIL SUBJECTS ---');
    (p.email_subjects || []).forEach((subj, i) => lines.push(`${i + 1}. ${subj}`));

    return lines.join('\n');
  }

  return { generateContentPack, getContentPack, exportAsText };
}
