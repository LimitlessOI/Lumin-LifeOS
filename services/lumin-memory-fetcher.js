/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * lumin-memory-fetcher.js
 *
 * Fetches raw AI conversation dump files from the GitHub repo
 * (• Lumin-Memory/00_INBOX/raw/) and imports them into LifeOS memory.
 *
 * Handles:
 * - Files larger than 1MB via GitHub Git Blobs API
 * - Multiple source formats: GPT, Gemini, DeepSeek, Grok, LifeOS/LimitlessOS
 * - Plain text chunking into ~2K word segments for AI processing
 * - Extraction of insights, decisions, commitments, purpose signals
 * - Deduplication: won't re-import files already processed
 *
 * Env required: GITHUB_TOKEN, GITHUB_REPO (default: LimitlessOI/Lumin-LifeOS)
 */

const REPO          = process.env.GITHUB_REPO || 'LimitlessOI/Lumin-LifeOS';
const BRANCH        = process.env.GITHUB_BRANCH || 'main';
// Folder name is bullet + TAB + "Lumin-Memory" — use tree API to avoid path encoding issues
const DUMP_FOLDER_MARKER = 'Lumin-Memory/00_INBOX/raw'; // match by suffix in tree
const CHUNK_WORDS   = 2000;   // words per chunk sent to AI
const MAX_CHUNKS_PER_FILE = 30; // safety cap per file

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  const headers = { 'User-Agent': 'LifeOS-Memory-Fetcher/1.0', 'Accept': 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function detectSource(filename) {
  const f = (filename || '').toLowerCase();
  if (f.includes('gpt'))       return 'chatgpt';
  if (f.includes('gemini'))    return 'gemini';
  if (f.includes('deepseek'))  return 'deepseek';
  if (f.includes('grok'))      return 'grok';
  if (f.includes('lifeos') || f.includes('limitless')) return 'lifeos';
  if (f.includes('directive') || f.includes('ideas'))  return 'notes';
  if (f.includes('mission') || f.includes('north'))    return 'mission';
  return 'misc';
}

function chunkText(text, chunkWords = CHUNK_WORDS) {
  // Split on blank lines first (conversation turns), then by word count
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length;
    if (wordCount + words > chunkWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      wordCount = 0;
    }
    current.push(para.trim());
    wordCount += words;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks.filter(c => c.trim().length > 100); // skip tiny fragments
}

export function createLuminMemoryFetcher({ pool, callAI, logger = console }) {

  // ── GitHub API helpers ─────────────────────────────────────────────────────
  // Uses the git tree API (recursive) to list files — avoids all path encoding
  // issues with special characters (bullet, tab, spaces) in folder names.

  async function fetchFileList() {
    // Step 1: get main branch HEAD SHA
    const refResp = await fetch(
      `https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}`,
      { headers: githubHeaders() }
    );
    if (!refResp.ok) throw new Error(`GitHub ref fetch failed: ${refResp.status}`);
    const refData = await refResp.json();
    const treeSha = refData?.object?.sha;
    if (!treeSha) throw new Error('Could not get HEAD SHA');

    // Step 2: get recursive tree
    const treeResp = await fetch(
      `https://api.github.com/repos/${REPO}/git/trees/${treeSha}?recursive=1`,
      { headers: githubHeaders() }
    );
    if (!treeResp.ok) throw new Error(`GitHub tree fetch failed: ${treeResp.status}`);
    const treeData = await treeResp.json();

    // Step 3: filter to files in our dump folder (match by path suffix, ignore bullet/tab encoding)
    return (treeData.tree || []).filter(item =>
      item.type === 'blob' &&
      item.path.replace(/^[^a-zA-Z]+/, '').startsWith('Lumin-Memory/00_INBOX/raw/') &&
      !item.path.includes('/00_INBOX/raw/00_INBOX/') && // skip the broken duplicate subtree
      item.size > 100  // skip placeholder 14-byte "404: Not Found" files
    ).map(item => ({
      name: item.path.split('/').pop(),
      sha: item.sha,
      size: item.size,
    }));
  }

  async function fetchFileContent(item) {
    // All these files are large (>1MB) — fetch via raw blob API using SHA
    const url = `https://api.github.com/repos/${REPO}/git/blobs/${item.sha}`;
    const resp = await fetch(url, {
      headers: { ...githubHeaders(), Accept: 'application/vnd.github.raw+json' },
    });
    if (!resp.ok) {
      throw new Error(`GitHub blob fetch failed for ${item.name}: ${resp.status}`);
    }
    return await resp.text();
  }

  // ── AI extraction ──────────────────────────────────────────────────────────

  async function extractFromChunk(chunkText, meta) {
    if (!callAI) return { commitments: [], insights: [], decisions: [], purpose_signals: [] };

    const preview = chunkText.substring(0, 6000);
    const prompt = `You are analyzing a conversation between Adam Hopkins and an AI assistant. This is from Adam's personal knowledge archive for LifeOS — his personal operating system.

Source: ${meta.source} | File: ${meta.filename}

Conversation text:
---
${preview}
---

Extract the following (only include items with real substance — skip filler):

1. COMMITMENTS — things Adam said he would do or build
   { title, description, approximate_date? }

2. INSIGHTS — important ideas, realizations, or principles Adam expressed
   { insight, category: one of 'lifeos_vision'|'personal_development'|'health'|'relationships'|'business'|'technology' }

3. DECISIONS — choices Adam made about the product, strategy, or his life
   { subject, decision_made, reasoning? }

4. PURPOSE_SIGNALS — what energizes or drains Adam, what he cares deeply about
   { type: 'energy_source'|'energy_drain'|'joy_source'|'purpose_hint', observation }

Return ONLY a JSON object: { commitments, insights, decisions, purpose_signals }
If a category has nothing worth capturing, return an empty array for it.`;

    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : (raw?.content || raw?.text || '');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { commitments: [], insights: [], decisions: [], purpose_signals: [] };
      const parsed = JSON.parse(match[0]);
      return {
        commitments:     Array.isArray(parsed.commitments)     ? parsed.commitments     : [],
        insights:        Array.isArray(parsed.insights)        ? parsed.insights        : [],
        decisions:       Array.isArray(parsed.decisions)       ? parsed.decisions       : [],
        purpose_signals: Array.isArray(parsed.purpose_signals) ? parsed.purpose_signals : [],
      };
    } catch (err) {
      logger.warn?.(`[MEMORY-FETCHER] Extraction failed for chunk in ${meta.filename}: ${err.message}`);
      return { commitments: [], insights: [], decisions: [], purpose_signals: [] };
    }
  }

  // ── DB storage ─────────────────────────────────────────────────────────────

  async function ensureTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_dump_chunks (
        id          SERIAL PRIMARY KEY,
        source_file TEXT NOT NULL,
        source_ai   TEXT,
        chunk_index INTEGER,
        chunk_text  TEXT NOT NULL,
        word_count  INTEGER,
        processed   BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_import_runs (
        id                 SERIAL PRIMARY KEY,
        started_at         TIMESTAMPTZ DEFAULT NOW(),
        completed_at       TIMESTAMPTZ,
        files_found        INTEGER DEFAULT 0,
        files_processed    INTEGER DEFAULT 0,
        chunks_stored      INTEGER DEFAULT 0,
        insights_extracted INTEGER DEFAULT 0,
        commitments_stored INTEGER DEFAULT 0,
        decisions_stored   INTEGER DEFAULT 0,
        status             TEXT DEFAULT 'running',
        error              TEXT
      )
    `).catch(() => {});
  }

  async function alreadyImported(filename) {
    try {
      const r = await pool.query(
        `SELECT 1 FROM memory_dump_chunks WHERE source_file = $1 LIMIT 1`,
        [filename]
      );
      return r.rows.length > 0;
    } catch { return false; }
  }

  async function storeChunk({ filename, sourceAi, chunkIndex, text }) {
    const words = text.split(/\s+/).length;
    await pool.query(
      `INSERT INTO memory_dump_chunks (source_file, source_ai, chunk_index, chunk_text, word_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [filename, sourceAi, chunkIndex, text, words]
    ).catch(() => {});
  }

  async function storeInsight({ insight, category, source, filename }) {
    await pool.query(
      `INSERT INTO adam_decisions (event_type, subject, input_text, context, tags)
       VALUES ('conversation', $1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [category, insight.substring(0, 500),
       JSON.stringify({ source, file: filename }),
       [category, source, 'memory_import']]
    ).catch(() => {});
  }

  async function storeDecision({ subject, decisionMade, reasoning, source, filename }) {
    await pool.query(
      `INSERT INTO adam_decisions (event_type, subject, input_text, context, tags)
       VALUES ('decision', $1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [subject?.substring(0, 200),
       decisionMade?.substring(0, 500),
       JSON.stringify({ reasoning, source, file: filename }),
       ['decision', source, 'memory_import']]
    ).catch(() => {});
  }

  async function storeCommitment({ title, description, approximateDate, source, filename }) {
    const { createCommitmentTracker } = await import('./commitment-tracker.js');
    const tracker = createCommitmentTracker(pool, null);
    await tracker.logCommitment({
      userId: 'adam',
      title: title?.substring(0, 200),
      committedTo: 'self',
      dueAt: approximateDate ? new Date(approximateDate).toISOString() : null,
      weight: 1,
      source: 'memory_import',
      sourceRef: filename,
    }).catch(() => {});
  }

  async function storePurposeSignal({ type, observation, source, filename }) {
    const col = ['energy_source', 'joy_source'].includes(type) ? 'joy_sources' : 'joy_drains';
    const tag = (observation || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50);
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO joy_checkins (user_id, checkin_date, ${col}, source, inferred_from)
       VALUES ('adam', $1::date, $2, 'memory_import', $3)
       ON CONFLICT (user_id, checkin_date) DO UPDATE SET
         ${col} = array_append(joy_checkins.${col}, $2[1])`,
      [today, [tag], `${source}:${filename}`]
    ).catch(() => {});
  }

  // ── Main import pipeline ───────────────────────────────────────────────────

  async function importFromGitHub({ skipAlreadyImported = true, dryRun = false, maxFiles = 50 } = {}) {
    await ensureTables();

    let runId = null;
    try {
      const r = await pool.query(
        `INSERT INTO memory_import_runs DEFAULT VALUES RETURNING id`
      );
      runId = r.rows[0]?.id;
    } catch { /* table may not exist yet, non-fatal */ }

    const stats = {
      files_found: 0, files_processed: 0, files_skipped: 0,
      chunks_stored: 0, insights_extracted: 0,
      commitments_stored: 0, decisions_stored: 0, errors: [],
    };

    try {
      logger.info?.('[MEMORY-FETCHER] Listing files from GitHub…');
      const files = await fetchFileList();
      stats.files_found = files.length;
      logger.info?.(`[MEMORY-FETCHER] Found ${files.length} files`);

      const toProcess = files.slice(0, maxFiles);

      for (const file of toProcess) {
        const filename = file.name;
        const source = detectSource(filename);

        if (skipAlreadyImported && await alreadyImported(filename)) {
          logger.info?.(`[MEMORY-FETCHER] Skipping already-imported: ${filename}`);
          stats.files_skipped++;
          continue;
        }

        try {
          logger.info?.(`[MEMORY-FETCHER] Fetching: ${filename} (${Math.round((file.size || 0) / 1024)}KB)`);
          const content = await fetchFileContent(file);
          const chunks = chunkText(content).slice(0, MAX_CHUNKS_PER_FILE);

          logger.info?.(`[MEMORY-FETCHER] ${filename}: ${chunks.length} chunks`);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!dryRun) await storeChunk({ filename, sourceAi: source, chunkIndex: i, text: chunk });
            stats.chunks_stored++;

            // AI extraction — only run on first N chunks to keep costs down
            if (callAI && i < 5) {
              const extracted = await extractFromChunk(chunk, { source, filename });

              if (!dryRun) {
                for (const ins of extracted.insights) {
                  await storeInsight({ ...ins, source, filename });
                  stats.insights_extracted++;
                }
                for (const dec of extracted.decisions) {
                  await storeDecision({ subject: dec.subject, decisionMade: dec.decision_made, reasoning: dec.reasoning, source, filename });
                  stats.decisions_stored++;
                }
                for (const com of extracted.commitments) {
                  await storeCommitment({ title: com.title, description: com.description, approximateDate: com.approximate_date, source, filename });
                  stats.commitments_stored++;
                }
                for (const sig of extracted.purpose_signals) {
                  await storePurposeSignal({ type: sig.type, observation: sig.observation, source, filename });
                }
              }
            }
          }

          stats.files_processed++;
        } catch (err) {
          logger.warn?.(`[MEMORY-FETCHER] Error processing ${filename}: ${err.message}`);
          stats.errors.push({ file: filename, error: err.message });
        }
      }

      if (runId) {
        await pool.query(
          `UPDATE memory_import_runs SET completed_at=NOW(), status='complete',
           files_found=$1, files_processed=$2, chunks_stored=$3,
           insights_extracted=$4, commitments_stored=$5, decisions_stored=$6
           WHERE id=$7`,
          [stats.files_found, stats.files_processed, stats.chunks_stored,
           stats.insights_extracted, stats.commitments_stored, stats.decisions_stored, runId]
        ).catch(() => {});
      }

      logger.info?.(`[MEMORY-FETCHER] Done — ${stats.files_processed} files, ${stats.chunks_stored} chunks, ${stats.insights_extracted} insights`);
      return { ok: true, run_id: runId, ...stats };

    } catch (err) {
      if (runId) {
        await pool.query(
          `UPDATE memory_import_runs SET completed_at=NOW(), status='error', error=$1 WHERE id=$2`,
          [err.message, runId]
        ).catch(() => {});
      }
      throw err;
    }
  }

  async function getImportHistory({ limit = 10 } = {}) {
    try {
      const r = await pool.query(
        `SELECT * FROM memory_import_runs ORDER BY started_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows;
    } catch { return []; }
  }

  async function searchChunks({ query, limit = 20 } = {}) {
    if (!query) return [];
    try {
      const r = await pool.query(
        `SELECT id, source_file, source_ai, chunk_index, word_count,
                substring(chunk_text, 1, 400) AS preview
         FROM memory_dump_chunks
         WHERE chunk_text ILIKE $1
         ORDER BY id DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      return r.rows;
    } catch { return []; }
  }

  return { importFromGitHub, getImportHistory, searchChunks };
}
