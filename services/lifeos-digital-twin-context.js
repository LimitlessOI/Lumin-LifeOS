/**
 * SYNOPSIS: Exports getTwinContextForUser — services/lifeos-digital-twin-context.js.
 */
export async function getTwinContextForUser(db, userId) {
  const identityResult = await db.query('SELECT user_id, name, email FROM users WHERE user_id = $1', [userId]);
  const identity = identityResult.rows[0];

  const recentNotesResult = await db.query('SELECT note_id, content, created_at FROM lifeos_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);
  const recentNotes = recentNotesResult.rows.map(note => ({ id: note.note_id, content: note.content, createdAt: note.created_at }));

  const commitmentsResult = await db.query('SELECT commitment_id, description, status FROM twin_simulator WHERE user_id = $1 AND status != \'completed\' ORDER BY created_at DESC LIMIT 5', [userId]);
  const openCommitments = commitmentsResult.rows.map(c => ({ id: c.commitment_id, description: c.description, status: c.status }));

  const emotionalStateResult = await db.query('SELECT state FROM twin_simulator WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
  const emotionalState = emotionalStateResult.rows[0]?.state || 'neutral';

  const uiDirectivesResult = await db.query('SELECT directive_key, value FROM ui_directives WHERE user_id = $1', [userId]);
  const uiDirectives = uiDirectivesResult.rows.reduce((acc, dir) => {
    acc[dir.directive_key] = dir.value;
    return acc;
  }, {});

  const energyLevelResult = await db.query('SELECT level FROM flourishing_preferences WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
  const energyLevel = energyLevelResult.rows[0]?.level || 'medium';

  return {
    identity,
    recentNotes,
    openCommitments,
    emotionalState,
    uiDirectives,
    energyLevel,
  };
}

export function injectTwinContext(prompt, twinContext) {
  if (!twinContext) {
    return prompt;
  }

  const contextParts = [];

  if (twinContext.identity) {
    contextParts.push(`User Identity: Name: ${twinContext.identity.name}, Email: ${twinContext.identity.email}.`);
  }
  if (twinContext.emotionalState) {
    contextParts.push(`Current Emotional State: ${twinContext.emotionalState}.`);
  }
  if (twinContext.energyLevel) {
    contextParts.push(`Current Energy Level: ${twinContext.energyLevel}.`);
  }
  if (twinContext.recentNotes && twinContext.recentNotes.length > 0) {
    const notes = twinContext.recentNotes.map(n => `  - "${n.content}" (ID: ${n.id})`).join('\n');
    contextParts.push(`Recent Notes:\n${notes}`);
  }
  if (twinContext.openCommitments && twinContext.openCommitments.length > 0) {
    const commitments = twinContext.openCommitments.map(c => `  - "${c.description}" (Status: ${c.status}, ID: ${c.id})`).join('\n');
    contextParts.push(`Open Commitments:\n${commitments}`);
  }
  if (twinContext.uiDirectives && Object.keys(twinContext.uiDirectives).length > 0) {
    const directives = Object.entries(twinContext.uiDirectives).map(([key, value]) => `  - ${key}: ${value}`).join('\n');
    contextParts.push(`UI Directives:\n${directives}`);
  }

  if (contextParts.length === 0) {
    return prompt;
  }

  const contextString = `\n\n--- Digital Twin Context ---\n${contextParts.join('\n')}\n----------------------------\n`;
  return `${contextString}\n${prompt}`;
}

export async function updateTwinFromInteraction(db, userId, message, reply) {
  const learnedFact = `User said: "${message}". Assistant replied: "${reply}".`;
  await db.query(
    'INSERT INTO twin_simulator (user_id, state, description, created_at) VALUES ($1, $2, $3, NOW())',
    [userId, 'learned_fact', learnedFact]
  );
}