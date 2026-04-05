/**
 * scripts/import-dumps-to-twin.js
 *
 * One-time (and re-runnable) import of memory_dump_chunks into adam_decisions.
 *
 * The 448 conversation dump chunks are the richest source of raw Adam data —
 * years of thinking, vision, values, decisions, and reasoning across GPT,
 * Gemini, Grok, DeepSeek, and direct LifeOS conversations.
 *
 * This script feeds all of them into adam_decisions so the profile builder
 * can synthesize the Adam filter from the full historical record.
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING on a unique source_ref key.
 *
 * Usage:
 *   node scripts/import-dumps-to-twin.js
 *   node scripts/import-dumps-to-twin.js --build-profile   (also triggers rebuild after import)
 *
 * @ssot docs/projects/AMENDMENT_09_LIFE_COACHING.md
 */

import pg from 'pg';

const { Pool } = pg;

const DB = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_jFs5uT7noLEC@ep-lingering-grass-af213jp9-pooler.c-2.us-west-2.aws.neon.tech/lifeos-sandbox?sslmode=require&channel_binding=require';

const BUILD_PROFILE = process.argv.includes('--build-profile');

async function run() {
  const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

  // ── Ensure adam_decisions has the source_ref column we need ───────────────
  await pool.query(`
    ALTER TABLE adam_decisions
    ADD COLUMN IF NOT EXISTS source_ref TEXT UNIQUE
  `).catch(() => {}); // ignore if already exists

  // ── Fetch all dump chunks ─────────────────────────────────────────────────
  const { rows: chunks } = await pool.query(`
    SELECT id, chunk_index, source_file, source_ai, chunk_text, word_count
    FROM memory_dump_chunks
    ORDER BY source_file, chunk_index
  `);

  console.log(`Found ${chunks.length} dump chunks to import`);

  let imported = 0;
  let skipped  = 0;

  for (const chunk of chunks) {
    const sourceRef = `dump:${chunk.source_file}:${chunk.chunk_index}`;
    const sessionId = `dump_import_${chunk.source_file.replace(/\W+/g, '_')}`;

    // Tag with source AI and file so profile builder can weight appropriately
    const tags = [
      'dump_import',
      `source:${chunk.source_ai || 'unknown'}`,
      `file:${chunk.source_file}`,
    ];

    try {
      await pool.query(`
        INSERT INTO adam_decisions (
          session_id, event_type,
          subject, input_text, reasoning,
          context, tags, source_ref,
          created_at
        ) VALUES (
          $1, 'conversation',
          $2, $3, NULL,
          $4, $5, $6,
          NOW() - ($7 * INTERVAL '1 second')
        )
        ON CONFLICT (source_ref) DO NOTHING
      `, [
        sessionId,
        `AI conversation dump — ${chunk.source_file} chunk ${chunk.chunk_index}`,
        chunk.chunk_text,
        JSON.stringify({
          source_file:  chunk.source_file,
          source_ai:    chunk.source_ai,
          chunk_index:  chunk.chunk_index,
          word_count:   chunk.word_count,
          import_type:  'historical_dump',
        }),
        tags,
        sourceRef,
        (chunks.length - chunks.indexOf(chunk)) * 10,
      ]);
      imported++;
    } catch (e) {
      if (e.code === '23505') { skipped++; } // unique violation = already imported
      else console.error(`Chunk ${chunk.id} failed:`, e.message);
    }
  }

  console.log(`Import complete: ${imported} new, ${skipped} already existed`);

  // ── Also import existing conversation_messages (Adam's words in the system) ──
  const { rows: msgs } = await pool.query(`
    SELECT id, content, created_at
    FROM conversation_messages
    WHERE role = 'user'
    ORDER BY created_at ASC
  `);

  console.log(`\nFound ${msgs.length} conversation_messages from Adam`);

  let msgImported = 0;
  let msgSkipped  = 0;

  for (const msg of msgs) {
    const sourceRef = `conv_msg:${msg.id}`;
    try {
      await pool.query(`
        INSERT INTO adam_decisions (
          session_id, event_type,
          subject, input_text,
          context, tags, source_ref,
          created_at
        ) VALUES (
          'lifeos_conversation', 'conversation',
          'LifeOS conversation message', $1,
          $2, $3, $4, $5
        )
        ON CONFLICT (source_ref) DO NOTHING
      `, [
        msg.content,
        JSON.stringify({ source: 'conversation_messages', message_id: msg.id }),
        ['lifeos_conversation', 'source:lifeos'],
        sourceRef,
        msg.created_at,
      ]);
      msgImported++;
    } catch (e) {
      if (e.code === '23505') { msgSkipped++; }
      else console.error(`Message ${msg.id} failed:`, e.message);
    }
  }

  console.log(`Messages: ${msgImported} new, ${msgSkipped} already existed`);

  // ── Count total decisions now ─────────────────────────────────────────────
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM adam_decisions');
  console.log(`\nTotal adam_decisions now: ${count}`);

  // ── Optionally trigger profile build via API ──────────────────────────────
  if (BUILD_PROFILE) {
    console.log('\nTriggering profile rebuild...');
    try {
      const res = await fetch('http://localhost:3000/api/v1/twin/profile/rebuild', {
        method: 'POST',
        headers: { 'x-command-key': process.env.COMMAND_CENTER_KEY || '' },
      });
      const body = await res.json().catch(() => ({}));
      console.log('Profile rebuild response:', body);
    } catch (e) {
      console.log('Could not reach local server for profile rebuild. Run manually when server is up:');
      console.log('  POST /api/v1/twin/profile/rebuild');
    }
  } else {
    console.log('\nNext step: trigger profile build with:');
    console.log('  node scripts/import-dumps-to-twin.js --build-profile');
    console.log('  or POST /api/v1/twin/profile/rebuild when server is running');
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
