/**
 * SYNOPSIS: Exports buildSessionExport — services/marketing-session-export.js.
 */
export async function buildSessionExport(sessionId, format, db, callCouncilMember) {
  if (!sessionId) {
    throw new Error('buildSessionExport requires sessionId');
  }

  const exportFormat = format === 'markdown' ? 'markdown' : 'json';
  const pool = db;
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('buildSessionExport requires a db with query()');
  }
  const strategist = callCouncilMember;
  if (typeof strategist !== 'function') {
    throw new Error('buildSessionExport requires callCouncilMember');
  }

  const sessionResult = await pool.query(
    `select *
     from marketing_sessions
     where id = $1
     limit 1`,
    [sessionId]
  );

  const session = sessionResult.rows[0];
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const piecesResult = await pool.query(
    `select *
     from marketing_content_pieces
     where session_id = $1
       and (
         status = 'approved'
         or status = 'published'
         or status is null
       )
     order by created_at asc`,
    [sessionId]
  );

  const contentPieces = piecesResult.rows;

  const voiceResult = await pool.query(
    `select *
     from marketing_content_atoms
     where session_id = $1
     order by created_at asc`,
    [sessionId]
  );

  const brandVoiceAtoms = voiceResult.rows;

  const prompt = [
    `You are assembling a final session export for a marketing session.`,
    `Return a polished export summary string only.`,
    `Export format: ${exportFormat}.`,
    `Session ID: ${session.id}`,
    `Session type: ${session.session_type ?? ''}`,
    `Status: ${session.status ?? ''}`,
    `Start time: ${session.start_time ?? ''}`,
    `End time: ${session.end_time ?? ''}`,
    `Metadata: ${JSON.stringify(session.metadata ?? null)}`,
    ``,
    `Approved content pieces:`,
    ...contentPieces.map((piece, index) => {
      const title = piece.title ?? '';
      const body = piece.body ?? piece.content_text ?? '';
      const platform = piece.platform ?? '';
      const pieceFormat = piece.format ?? '';
      return [
        `${index + 1}. Title: ${title}`,
        `Platform: ${platform}`,
        `Format: ${pieceFormat}`,
        `Body: ${body}`,
      ].join('\n');
    }),
    ``,
    `Brand voice atoms:`,
    ...brandVoiceAtoms.map((atom, index) => {
      return [
        `${index + 1}. Type: ${atom.atom_type ?? ''}`,
        `Text: ${atom.text ?? ''}`,
        `Tags: ${JSON.stringify(atom.tags ?? null)}`,
        `Reuse consent level: ${atom.reuse_consent_level ?? ''}`,
      ].join('\n');
    }),
    ``,
    `Write a concise but complete export summary that can be saved for the session export record.`,
  ].join('\n');

  const exportText = await strategist('strategist', prompt);

  const insertResult = await pool.query(
    `insert into marketing_session_exports (session_id, export_format, export_url)
     values ($1, $2, $3)
     returning *`,
    [sessionId, exportFormat, null]
  );

  const inserted = insertResult.rows[0];
  if (!inserted) {
    throw new Error('Failed to create marketing_session_exports row');
  }

  return {
    exportText,
    exportFormat,
    sessionId,
  };
}