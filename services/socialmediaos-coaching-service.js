/**
 * SYNOPSIS: AI coaching Q&A loop for SocialMediaOS client sessions — 5 questions, story extraction.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import { randomUUID } from 'node:crypto';

const COACHING_QUESTIONS = [
  {
    id: 'q1_what_you_do',
    text: "Tell me what you do and who you help. Don't filter yourself — just talk.",
    purpose: 'niche + voice extraction',
  },
  {
    id: 'q2_biggest_mistake',
    text: "What's the number one mistake people in your space make that you see over and over?",
    purpose: 'authority + contrast hook',
  },
  {
    id: 'q3_client_result',
    text: "Tell me about a client who got a result that surprised even you. What happened?",
    purpose: 'story + social proof',
  },
  {
    id: 'q4_wish_they_knew',
    text: "What's the one thing you wish your ideal client understood before they ever came to you?",
    purpose: 'education hook + empathy',
  },
  {
    id: 'q5_fence_sitter',
    text: "If you could say one thing to someone sitting on the fence about working with you, what would it be?",
    purpose: 'objection reversal + CTA',
  },
];

export function createSocialmediaosCoachingService({ pool }) {
  async function startCoachingSession({ ownerId, niche, goal }) {
    const sessionId = randomUUID();
    const meta = JSON.stringify({ niche: niche || '', goal: goal || '', answers: [], currentQuestion: 0 });
    await pool.query(
      `INSERT INTO socialmediaos_sessions
         (id, owner_id, status, session_type, metadata, created_at, updated_at)
       VALUES ($1, $2, 'coaching_active', 'text_coaching', $3::jsonb, NOW(), NOW())`,
      [sessionId, ownerId, meta]
    );
    return {
      sessionId,
      question: COACHING_QUESTIONS[0],
      questionNumber: 1,
      totalQuestions: COACHING_QUESTIONS.length,
    };
  }

  async function submitAnswer({ sessionId, ownerId, answer }) {
    const { rows } = await pool.query(
      `SELECT id, metadata FROM socialmediaos_sessions
       WHERE id = $1 AND owner_id = $2 AND status = 'coaching_active'`,
      [sessionId, ownerId]
    );
    if (!rows.length) {
      const err = new Error('Session not found or not active');
      err.statusCode = 404;
      throw err;
    }

    const meta = rows[0].metadata;
    const answers = meta.answers || [];
    const currentQuestion = meta.currentQuestion || 0;

    answers.push({ questionId: COACHING_QUESTIONS[currentQuestion].id, answer });
    const nextQuestion = currentQuestion + 1;

    if (nextQuestion >= COACHING_QUESTIONS.length) {
      await pool.query(
        `UPDATE socialmediaos_sessions
         SET status = 'coaching_complete', metadata = $2::jsonb, updated_at = NOW()
         WHERE id = $1`,
        [sessionId, JSON.stringify({ ...meta, answers, currentQuestion: nextQuestion })]
      );
      return { complete: true, sessionId, answers };
    }

    await pool.query(
      `UPDATE socialmediaos_sessions
       SET metadata = $2::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [sessionId, JSON.stringify({ ...meta, answers, currentQuestion: nextQuestion })]
    );
    return {
      complete: false,
      question: COACHING_QUESTIONS[nextQuestion],
      questionNumber: nextQuestion + 1,
      totalQuestions: COACHING_QUESTIONS.length,
    };
  }

  async function getSessionState({ sessionId, ownerId }) {
    const { rows } = await pool.query(
      `SELECT id, status, metadata, created_at
       FROM socialmediaos_sessions
       WHERE id = $1 AND owner_id = $2`,
      [sessionId, ownerId]
    );
    if (!rows.length) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  return { startCoachingSession, submitAnswer, getSessionState, COACHING_QUESTIONS };
}
