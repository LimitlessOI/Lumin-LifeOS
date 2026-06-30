/**
 * SYNOPSIS: Generates content packs from coaching session answers using AI council.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import { randomUUID } from 'node:crypto';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function takeSentence(value, fallback) {
  const clean = normalizeText(value);
  if (!clean) return fallback;
  const parts = clean.split(/(?<=[.!?])\s+/);
  return parts[0] || clean || fallback;
}

function buildFallbackPack(niche, goal, answers = []) {
  const normalizedAnswers = answers.map((entry) => normalizeText(entry?.answer)).filter(Boolean);
  const [a1, a2, a3, a4, a5] = normalizedAnswers;
  const topic = niche || 'service business';
  const desiredOutcome = goal || 'attract better clients';
  const story = a3 || a1 || `Help clients in ${topic} get better outcomes`;
  const mistake = a2 || `Most people in ${topic} rely on generic content that gets ignored`;
  const truth = a4 || `Authentic language converts better than polished but empty messaging`;
  const urgency = a5 || `Consistency compounds faster than people expect`;

  return {
    linkedin_posts: [
      {
        hook: `Generic content is why most ${topic} posts disappear.`,
        body: `${takeSentence(mistake, mistake)} The better move is to lead with a concrete insight your audience can immediately recognize.`,
        cta: `If your goal is to ${desiredOutcome}, start by saying the thing your market keeps avoiding.`,
      },
      {
        hook: `The story your market needs is probably already in your client work.`,
        body: `${takeSentence(story, story)} Stories like this outperform broad advice because they prove the result instead of claiming it.`,
        cta: `Turn one real client win into three pieces of content this week.`,
      },
      {
        hook: `Authenticity beats perfection when trust is the real product.`,
        body: `${takeSentence(truth, truth)} Audiences respond when the message sounds lived, not manufactured.`,
        cta: `Write the next post the way you would actually say it to a client.`,
      },
      {
        hook: `Most people do not have a content problem. They have a clarity problem.`,
        body: `${takeSentence(a1, `Be explicit about who you help and why it matters.`)} Clear positioning makes every later content decision cheaper and easier.`,
        cta: `Refine one sentence today: who you help, what result you create, why it matters now.`,
      },
      {
        hook: `Waiting a month to publish is usually more expensive than publishing imperfectly today.`,
        body: `${takeSentence(urgency, urgency)} Repetition builds recognition, and recognition is what turns attention into pipeline.`,
        cta: `Choose one post, one short video, and one follow-up email. Publish all three this week.`,
      },
    ],
    youtube_hooks: [
      `The real reason ${topic} content gets ignored.`,
      `How one client story can become a month of content.`,
      `Why authentic messaging converts faster than polished messaging.`,
    ],
    instagram_captions: [
      {
        text: `${takeSentence(story, story)} This is the kind of proof that makes people stop scrolling and pay attention.`,
        hashtags: ['clientstory', 'marketingstrategy', 'socialmediaos'],
      },
      {
        text: `${takeSentence(truth, truth)} The goal is not to sound impressive. The goal is to sound real.`,
        hashtags: ['authenticmarketing', 'brandvoice', 'contentstrategy'],
      },
      {
        text: `${takeSentence(urgency, urgency)} Momentum matters more than polish when you are trying to build demand.`,
        hashtags: ['consistentcontent', 'audiencegrowth', 'smallbusinessmarketing'],
      },
    ],
    email_subjects: [
      `The content mistake costing ${topic} trust`,
      `One client story worth repurposing this week`,
      `Why consistency beats waiting for the perfect post`,
    ],
    core_story: takeSentence(story, `This business helps clients in ${topic} get clearer outcomes through more authentic messaging.`),
    headline_angle: `Use real client evidence to help ${topic} audiences ${desiredOutcome}.`,
  };
}

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

    let pack;
    let generationMode = 'ai';
    try {
      const raw = await callAI(prompt);
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error('No JSON found in response');
      pack = JSON.parse(raw.slice(jsonStart, jsonEnd));
    } catch (error) {
      generationMode = 'deterministic_fallback';
      pack = buildFallbackPack(meta.niche, meta.goal, meta.answers || []);
      pack._fallback = {
        mode: generationMode,
        reason: String(error.message || error),
      };
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

    return { packId, pack, generation_mode: generationMode };
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
