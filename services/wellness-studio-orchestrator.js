/**
 * SYNOPSIS: Exports runWellnessSession — services/wellness-studio-orchestrator.js.
 */
export async function runWellnessSession(userId, sessionType, deps) {
  if (!deps || typeof deps !== 'object') {
    throw new TypeError('deps is required');
  }

  const { db, callCouncilMember, wellnessTherapist } = deps;
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('deps.db with query() is required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('deps.callCouncilMember is required');
  }

  const { createSession, createInsight, generateWellnessInsight } = await import('./wellness-studio-data.js');
  const ai = await import('./wellness-studio-ai.js');

  const session =
    typeof createSession === 'function'
      ? await createSession(userId, sessionType, db)
      : await createSessionFallback(userId, sessionType, db);

  const insightGenerator =
    typeof generateWellnessInsight === 'function'
      ? generateWellnessInsight
      : ai && typeof ai.generateWellnessInsight === 'function'
        ? ai.generateWellnessInsight
        : null;

  if (typeof insightGenerator !== 'function') {
    throw new TypeError('generateWellnessInsight is required from wellness-studio-ai.js');
  }

  const insight = await insightGenerator(session, { db, callCouncilMember });

  const persistedInsight =
    typeof createInsight === 'function'
      ? await createInsight(session?.user_id ?? userId, session?.id, insight, db)
      : await createInsightFallback(session?.user_id ?? userId, session?.id, insight, db);

  if (wellnessTherapist && typeof wellnessTherapist.notifyIfNeeded === 'function') {
    await wellnessTherapist.notifyIfNeeded(userId, persistedInsight);
  }

  return { session, insight: persistedInsight };
}

async function createSessionFallback(userId, sessionType, db) {
  const result = await db.query(
    `INSERT INTO wellness_studio_sessions (user_id, session_type, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, sessionType, 'active']
  );
  return result.rows[0];
}

async function createInsightFallback(userId, sessionId, insight, db) {
  const content =
    typeof insight === 'string'
      ? insight
      : insight && typeof insight.content === 'string'
        ? insight.content
        : JSON.stringify(insight);

  const insightType =
    insight && typeof insight.insight_type === 'string'
      ? insight.insight_type
      : 'wellness';

  const confidenceScore =
    insight && typeof insight.confidence_score === 'number'
      ? insight.confidence_score
      : insight && typeof insight.confidence === 'number'
        ? insight.confidence
        : null;

  const result = await db.query(
    `INSERT INTO wellness_studio_insights (user_id, session_id, insight_type, content, confidence_score)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, sessionId, insightType, content, confidenceScore]
  );
  return result.rows[0];
}