#!/usr/bin/env node
/**
 * scripts/import-claude-conversations.js
 * Reads all Claude Code JSONL session files and imports them into the conversations DB.
 *
 * Usage:
 *   node scripts/import-claude-conversations.js
 *   node scripts/import-claude-conversations.js --dry-run
 *
 * Looks in: ~/.claude/projects/<encoded-project-path>/*.jsonl
 * Imports to: conversations + conversation_messages tables
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import pg from 'pg';
import { createConversationStore } from '../services/conversation-store.js';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_PATH = process.cwd(); // /Users/adamhopkins/Projects/Lumin-LifeOS

// Encode project path the way Claude Code does
// /Users/foo/bar → -Users-foo-bar (each slash becomes a dash, leading slash kept as dash)
function encodeProjectPath(p) {
  return p.split('/').join('-');
}

async function findJsonlFiles() {
  const claudeDir = path.join(os.homedir(), '.claude', 'projects');
  const encodedPath = encodeProjectPath(PROJECT_PATH);
  const projectDir = path.join(claudeDir, encodedPath);

  try {
    const files = await fs.readdir(projectDir);
    return files
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(projectDir, f));
  } catch (err) {
    console.error(`Could not read Claude project dir: ${err.message}`);
    console.error(`Expected: ${path.join(claudeDir, encodedPath)}`);
    return [];
  }
}

function extractMessages(lines) {
  const messages = [];
  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    // Only capture user and assistant message types
    if (obj.type !== 'user' && obj.type !== 'assistant') continue;
    if (!obj.message) continue;

    const msg = obj.message;
    const role = msg.role;
    if (!role) continue;

    // Extract text content
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = msg.content
        .filter(c => c.type === 'text')
        .map(c => c.text || '')
        .join('\n')
        .trim();
    }

    if (!content || content.length < 2) continue;

    // Skip pure terminal output (starts with shell prompt patterns)
    if (role === 'user' && content.match(/^(Last login:|adamhopkins@)/m) && content.length < 500) continue;

    messages.push({
      role,
      content: content.substring(0, 50000), // cap at 50k chars per message
      timestamp: obj.timestamp ? new Date(obj.timestamp) : null,
      metadata: {
        model: msg.model || null,
        promptId: obj.promptId || null,
        uuid: obj.uuid || null,
      },
    });
  }
  return messages;
}

async function importFile(store, filePath) {
  const sessionId = path.basename(filePath, '.jsonl');

  const raw = await fs.readFile(filePath, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);

  if (lines.length === 0) return { skipped: true, reason: 'empty file' };

  const messages = extractMessages(lines);
  if (messages.length === 0) return { skipped: true, reason: 'no user/assistant messages' };

  // Get session timestamps
  let startedAt = null, endedAt = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.timestamp) {
        const ts = new Date(obj.timestamp);
        if (!startedAt || ts < startedAt) startedAt = ts;
        if (!endedAt || ts > endedAt) endedAt = ts;
      }
    } catch {}
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would import ${messages.length} messages from ${sessionId}`);
    return { messages: messages.length };
  }

  const result = await store.save({
    sessionId,
    source: 'claude_code',
    project: PROJECT_PATH,
    startedAt,
    endedAt,
    messages,
    metadata: { file: path.basename(filePath), lines: lines.length },
  });

  return { messages: messages.length, inserted: result.inserted };
}

async function main() {
  console.log(`\n🔍 Claude Code Conversation Importer`);
  console.log(`   Project: ${PROJECT_PATH}`);
  if (DRY_RUN) console.log(`   Mode: DRY RUN (no writes)`);

  // Connect to DB
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set. Run: export DATABASE_URL=your_neon_url');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });

  const store = createConversationStore(pool);

  // Find all JSONL files
  const files = await findJsonlFiles();
  if (files.length === 0) {
    console.log('No JSONL files found.');
    await pool.end();
    return;
  }

  console.log(`\n📂 Found ${files.length} session file(s)\n`);

  let totalMessages = 0;
  let totalInserted = 0;
  let skipped = 0;

  for (const file of files) {
    const sessionId = path.basename(file, '.jsonl');
    process.stdout.write(`  ${sessionId.substring(0, 8)}... `);

    try {
      const result = await importFile(store, file);
      if (result.skipped) {
        console.log(`⏭️  skipped (${result.reason})`);
        skipped++;
      } else {
        console.log(`✅ ${result.messages} messages (${result.inserted ?? 0} new)`);
        totalMessages += result.messages || 0;
        totalInserted += result.inserted || 0;
      }
    } catch (err) {
      console.log(`❌ error: ${err.message}`);
    }
  }

  console.log(`\n✅ Import complete`);
  console.log(`   Sessions: ${files.length - skipped} imported, ${skipped} skipped`);
  console.log(`   Messages: ${totalMessages} total, ${totalInserted} new rows inserted`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
