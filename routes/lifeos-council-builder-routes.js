/**
 * routes/lifeos-council-builder-routes.js
 *
 * Council Builder Dispatch Endpoint
 *
 * This is the "coworker" bridge. Claude Code (Cursor) sends a structured task
 * here. The council reads the domain prompt file for context, then generates
 * code, plans, or analysis. Output is returned to Claude Code for review —
 * nothing is auto-committed.
 *
 * Routes:
 *   GET  /api/v1/lifeos/builder/ready           server-side readiness (commit + council + pool + auth); **`Cache-Control: no-store`**; **`codegen`** (policy_revision, max_output_tokens body flag, optional deploy_commit_sha); **`builder.codegen_policy_revision`** mirrors policy for nested-only parsers
 *   GET  /api/v1/lifeos/builder/domains         list available domain prompt files
 *   GET  /api/v1/lifeos/builder/domain/:name    read a specific domain prompt file
 *   GET  /api/v1/lifeos/builder/next-task      cold-start packet excerpts + read order
 *   POST /api/v1/lifeos/builder/task            dispatch a task to the council (body `files[]` = repo-relative paths → **server reads and injects file contents** into prompt; optional `target_file` improves HTML full-file hints; code mode passes scaled `maxOutputTokens` to the council; optional **`max_output_tokens`** or **`maxOutputTokens`** clamps completion budget on code mode — **same auth as `/build`; use sparingly when estimator lags deploy**)
 *   POST /api/v1/lifeos/builder/review          ask the council to review code/diff
 *   GET  /api/v1/lifeos/builder/model-map       show task-to-model routing table
 *   GET  /api/v1/lifeos/builder/history         recent builder audit trail
 *   GET  /api/v1/lifeos/builder/gaps            recent builder failures / next platform fixes
 *
 * Task body autonomy controls (optional):
 *   autonomy_mode: 'max' | 'normal' (default: 'max')
 *   internet_research: boolean (default: true)
 *   execution_only: boolean (default: false) — when true with mode=code and no explicit `model`, routes to
 *     `council.builder.code_execute` (fast literal codegen). Use only after a frozen spec (see prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { readdir, readFile, writeFile, unlink, mkdtemp, mkdir } from 'fs/promises';
import { join, dirname, resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { getModelForTask, getCandidateModelsForTask, TASK_MODEL_MAP } from '../config/task-model-routing.js';
import { createMemoryIntelligenceService } from '../services/memory-intelligence-service.js';
import { filterAvailableCouncilMembers } from '../services/council-model-availability.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');
const REPO_ROOT = join(__dirname, '..');

/** Bumped when builder codegen/token policy semantics change; operators compare GET /builder/ready to git main. */
const BUILDER_CODEGEN_POLICY_REVISION = '2026-05-01a';

const METADATA_SEP = '\n---METADATA---\n';
const REMOTE_SYSTEM_TRUTH = 'System truth is remote: GitHub=source, Railway=runtime, Neon=data. Local shell/repo are workbench mirrors only.';

/** Max chars injected per file / total into council prompt (large overlays like lifeos-chat.html). */
const BUILDER_FILE_INJECT_MAX_PER = 120_000;
const BUILDER_FILE_INJECT_MAX_TOTAL = 280_000;

/** Grounding rules — paired with `prompts/00-SSOT-READ-SEQUENCE.md`. */
const BUILDER_EPISTEMIC_LAWS = [
  'EPISTEMIC LAWS (this call):',
  '- Ground outputs in DOMAIN CONTEXT, SPECIFICATION, and injected REPO FILE CONTENTS only; do not invent features, routes, env vars, or DB tables not supported there.',
  '- If the spec is incomplete or contradictory, state that in one line before ---METADATA--- and set a low confidence value in the JSON.',
  '- When both apply, injected file bodies override vague task wording.',
  '- If REPO FILE CONTENTS include a nonempty body for path P, NEVER claim that P is missing from the repository or return ENOENT for P.',
].join('\n');

/**
 * Resolve `files` body paths to repo files and read contents for the council prompt.
 * Previously only path names were listed — models could not see `lifeos-chat.html` etc.
 * @param {unknown} files
 * @param {{ warn: Function }} log
 * @returns {Promise<{ block: string, summaries: Array<{ path: string, chars?: number, truncated?: boolean, omitted?: boolean, error?: string }> }>}
 */
async function loadRepoFilesForBuilder(files, log) {
  if (!Array.isArray(files) || files.length === 0) {
    return { block: '', summaries: [] };
  }
  const summaries = [];
  const parts = [];
  let total = 0;

  for (const raw of files) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const rel = raw.trim().replace(/^[/\\]+/, '');
    if (rel.includes('..') || !/^[\w./\\-]+$/.test(rel)) {
      summaries.push({ path: String(raw), error: 'invalid_path' });
      continue;
    }
    const abs = resolve(REPO_ROOT, rel);
    const relToRoot = relative(REPO_ROOT, abs);
    if (relToRoot.startsWith('..') || relToRoot === '') {
      summaries.push({ path: rel, error: 'outside_repo' });
      continue;
    }
    try {
      const content = await readFile(abs, 'utf8');
      const truncated = content.length > BUILDER_FILE_INJECT_MAX_PER;
      const slice = truncated ? content.slice(0, BUILDER_FILE_INJECT_MAX_PER) : content;
      if (total + slice.length > BUILDER_FILE_INJECT_MAX_TOTAL) {
        parts.push(`\n--- REPO FILE OMITTED: ${rel} (builder prompt size cap; raise BUILDER_FILE_INJECT_MAX_TOTAL if needed) ---\n`);
        summaries.push({ path: rel, chars: content.length, omitted: true });
        break;
      }
      const note = truncated ? ` [TRUNCATED: showing ${BUILDER_FILE_INJECT_MAX_PER} of ${content.length} chars]` : '';
      parts.push(`\n--- REPO FILE: ${rel} (${content.length} chars)${note} ---\n${slice}\n`);
      total += slice.length;
      summaries.push({ path: rel, chars: content.length, truncated });
    } catch (e) {
      const msg = e?.message || String(e);
      parts.push(`\n--- REPO FILE: ${rel} (READ ERROR: ${msg}) ---\n`);
      summaries.push({ path: rel, error: msg });
      log.warn({ path: rel, err: msg }, '[BUILDER] Could not read files[] path');
    }
  }

  return { block: parts.join(''), summaries };
}

/**
 * If the model wrapped the code section in a markdown fence, strip it (keep ---METADATA--- tail intact).
 */
function stripLeadingMarkdownFenceBeforeMetadata(text) {
  const s = String(text || '');
  const metaIdx = s.indexOf(METADATA_SEP);
  const head = metaIdx === -1 ? s : s.slice(0, metaIdx);
  const tail = metaIdx === -1 ? '' : s.slice(metaIdx);
  let h = head.trimStart();
  if (!h.startsWith('```')) return s;
  const firstNl = h.indexOf('\n');
  if (firstNl === -1) return s;
  const closeIdx = h.lastIndexOf('\n```');
  if (closeIdx > firstNl) {
    // Has closing fence — strip both opening and closing
    h = h.slice(firstNl + 1, closeIdx).trim();
  } else {
    // No closing fence (model omitted it) — strip only the opening fence line
    h = h.slice(firstNl + 1).trim();
  }
  return h + tail;
}

/**
 * Builder codegen: estimate output token budget from injected repo files (full-file replacement).
 * @param {string} [targetFile] — When ending in `.html`, uses a higher output cap so large overlays
 *   are not truncated mid-`<head>` (validated as "missing structure" though `<!DOCTYPE` was emitted).
 */
function estimateBuilderMaxOutputTokens(summaries, filesContentBlock, targetFile) {
  let totalChars = 0;
  if (Array.isArray(summaries)) {
    for (const s of summaries) {
      if (typeof s?.chars === 'number' && s.chars > 0) totalChars += s.chars;
    }
  }
  if (totalChars === 0 && filesContentBlock) totalChars = filesContentBlock.length;
  // Return null when no file context injected — let the provider use its own default.
  // Sending a large maxOutputTokens without corresponding input context causes HTTP 413
  // on providers that validate total request token budget (Gemini Flash, Groq).
  if (totalChars === 0) return null;
  // Base heuristic: correlate with injected context size (historically JS/SQL-sized files).
  const linearEstimate = Math.ceil(totalChars / 2.5) + 4096;
  const isHtml = /\.html$/i.test(String(targetFile || ''));
  /** Full `.html` replacement must emit the entire prior document plus edits — chars→tokens≠2.5; use tighter ratio + floor so we do not strand at ~16k when the overlay is tens of kb. */
  const htmlHeuristic =
    Math.ceil(totalChars / 1.85) +
    Math.max(8192, Math.ceil(Math.min(totalChars, 180_000) / 420));
  const estimated = isHtml ? Math.max(linearEstimate, htmlHeuristic) : linearEstimate;
  const htmlCap = Math.min(
    128_000,
    Math.max(4096, parseInt(process.env.BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP || '65536', 10) || 65536),
  );
  const codeCap = Math.min(
    32_768,
    Math.max(4096, parseInt(process.env.BUILDER_CODE_MAX_OUTPUT_TOKENS_CAP || '16384', 10) || 16384),
  );
  const cap = isHtml ? htmlCap : codeCap;
  return Math.min(cap, Math.max(4096, estimated));
}

function builderTargetsHtml(files, targetFile) {
  const paths = Array.isArray(files) ? files : [];
  if (paths.some(p => String(p).toLowerCase().endsWith('.html'))) return true;
  if (String(targetFile || '').toLowerCase().endsWith('.html')) return true;
  return false;
}

function htmlFullFileCodegenHints() {
  return [
    'HTML FULL FILE — STRICT OUTPUT CONTRACT:',
    '1. Your ENTIRE response must be a complete HTML document. No analysis, no explanation, no markdown prose before or after.',
    '2. Output starts with <!DOCTYPE html> or <html (never with # or text or ```)',
    '3. Output ends with </html> (close the document fully — do not truncate mid-tag or mid-block)',
    '4. Do NOT wrap in markdown fences (no ```html).',
    '5. Do NOT write analysis, implementation notes, section headers, or prose of any kind.',
    '6. Violating this contract makes the output unusable — the build system will reject it.',
  ].join('\n');
}

function splitBuilderOutput(raw) {
  const text = stripLeadingMarkdownFenceBeforeMetadata(String(raw || ''));

  // Try exact separator first
  const i = text.lastIndexOf(METADATA_SEP);
  if (i !== -1) {
    const main = text.slice(0, i).trim();
    try {
      const placement = JSON.parse(text.slice(i + METADATA_SEP.length).trim());
      return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
    } catch {
      return { output: main, placement: null };
    }
  }

  // Fallback: match ---METADATA--- with any surrounding whitespace + optional ```json fence
  // Model sometimes emits `---METADATA---` without a leading \n or wraps JSON in ```json
  const metaMatch = text.match(/\n?---METADATA---[ \t]*\n?/);
  if (metaMatch) {
    const main = text.slice(0, metaMatch.index).trim();
    const metaTail = text.slice(metaMatch.index + metaMatch[0].length).trim();
    try {
      const jsonStr = metaTail.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      const placement = JSON.parse(jsonStr);
      return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
    } catch {
      return { output: main, placement: null };
    }
  }

  return { output: text.trim(), placement: null };
}

/**
 * Strip any markdown analysis/preamble a model emits before the HTML document.
 * Models (especially Claude) sometimes write analysis notes, then start the actual HTML.
 * Finds the first <!DOCTYPE html> or <html, trims everything before it.
 * Also strips trailing markdown after </html>.
 * Returns original text unchanged if no HTML start marker is found.
 */
/**
 * Models often paste a full HTML page, markdown fences, or a one-line "*.md" header into `.js` targets.
 * Mirrors the HTML preamble strip path so `node --check` sees real JavaScript.
 */
function extractJavaScriptFromOutput(rawText) {
  let s = String(rawText || '');
  let preambleStripPasses = 0;
  while (preambleStripPasses < 4) {
    preambleStripPasses += 1;
    s = stripLeadingMarkdownFenceBeforeMetadata(s).trim();
    if (!s) break;

    const wholeFence = /^```(?:js|javascript|mjs|cjs)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/im;
    const wf = s.match(wholeFence);
    if (wf && wf[1].trim().length > 40) return wf[1].trim();

    if (s.startsWith('```')) {
      const firstNl = s.indexOf('\n');
      if (firstNl !== -1) {
        let inner = s.slice(firstNl + 1);
        const closeIdx = inner.lastIndexOf('\n```');
        if (closeIdx !== -1) inner = inner.slice(0, closeIdx);
        inner = inner.trim();
        if (inner.length > 40) return inner;
      }
    }

    const nl = s.indexOf('\n');
    if (nl > 0 && nl < 220) {
      const head = s.slice(0, nl).trim();
      if (/^[\w./\\-]+\.(md|txt)$/i.test(head)) {
        s = s.slice(nl + 1).trim();
        continue;
      }
    }
    break;
  }

  const looksHtml = /<!DOCTYPE\s+html/i.test(s) || /<html[\s>]/i.test(s);
  if (looksHtml) {
    const blocks = [];
    const re = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = re.exec(s)) !== null) {
      const body = sm[1].trim();
      if (body.length > 80) blocks.push(body);
    }
    if (blocks.length) {
      blocks.sort((a, b) => b.length - a.length);
      return blocks[0];
    }
  }

  return s.trim();
}

async function verifyGeneratedJavaScriptWithNodeCheck(content, resolvedTarget) {
  let tmpFile = null;
  try {
    const tmpDir = await mkdtemp(join(tmpdir(), 'builder-check-'));
    tmpFile = join(tmpDir, extname(resolvedTarget) || '.js');
    await writeFile(tmpFile, content, 'utf8');
    execSync(`node --check "${tmpFile}"`, { stdio: 'pipe' });
    return { ok: true };
  } catch (checkErr) {
    return {
      ok: false,
      error: (checkErr.stderr?.toString() || checkErr.message || 'syntax error').slice(0, 400),
    };
  } finally {
    if (tmpFile) await unlink(tmpFile).catch(() => {});
  }
}

function extractHtmlFromOutput(text) {
  const s = String(text || '');
  // Find earliest HTML document start
  const doctypeRe = /<!DOCTYPE\s+html/i;
  const htmlTagRe = /<html[\s>]/i;
  const dtMatch = doctypeRe.exec(s);
  const htMatch = htmlTagRe.exec(s);
  let startIdx = -1;
  if (dtMatch) startIdx = dtMatch.index;
  if (htMatch && (startIdx === -1 || htMatch.index < startIdx)) startIdx = htMatch.index;
  if (startIdx === -1) return s; // No HTML found — return unchanged
  const trimmed = s.slice(startIdx);
  // Strip any trailing non-HTML content after the closing </html>
  const closeIdx = trimmed.toLowerCase().lastIndexOf('</html>');
  if (closeIdx !== -1) return trimmed.slice(0, closeIdx + 7); // 7 = '</html>'.length
  return trimmed;
}

function validateGeneratedOutputForTarget(targetFile, output) {
  const target = String(targetFile || '').toLowerCase();
  const text = String(output || '').trim();
  if (!text) return 'generated output is empty';
  if (target.endsWith('.html')) {
    if (text.length < 1000) return 'generated HTML is too short; refusing to commit likely truncated output';
    if (!/^[\s]*</.test(text)) return 'generated HTML must start with <!DOCTYPE or <html (no preamble or markdown)';
    // Accept either: classic <html>...</html> wrapper OR HTML5 <!DOCTYPE html> + <head> + <body>
    const hasHtmlWrapper = /<html[\s>]/i.test(text) && /<\/html>/i.test(text);
    const hasHtml5Structure = /<!DOCTYPE\s+html/i.test(text) && /<head[\s>]/i.test(text) && /<body[\s>]/i.test(text);
    if (!hasHtmlWrapper && !hasHtml5Structure) {
      const truncatedInHead =
        /<!DOCTYPE\s+html/i.test(text) &&
        /<html[\s>]/i.test(text) &&
        /<head[\s>]/i.test(text) &&
        !/<body[\s>]/i.test(text);
      if (truncatedInHead) {
        return 'generated HTML appears truncated before <body> (output token budget too small for full-file regeneration, or provider cut off). Retry with BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP or split CSS/markup into a smaller target file.';
      }
      return 'generated HTML is missing required document structure (<html> wrapper OR <!DOCTYPE html> + <head> + <body>)';
    }
  }
  return null;
}

function buildAutonomyInstructions({ autonomyMode, internetResearch }) {
  if (autonomyMode !== 'max') return '';
  const webLine = internetResearch
    ? 'If needed, infer missing implementation details from established patterns and web-known standards, then proceed.'
    : 'Infer missing implementation details from established repo patterns, then proceed.';
  return [
    'AUTONOMY MODE: MAX.',
    'Do not ask clarifying questions back to the operator for routine ambiguity.',
    'Make the best reasonable assumptions and continue execution.',
    webLine,
    'If assumptions are required, include a short "ASSUMPTIONS" section before ---METADATA---.',
    'Only stop when blocked by unavailable credentials, missing external systems, or irreversible/high-risk action requiring human authorization.',
  ].join(' ');
}

export function createLifeOSCouncilBuilderRoutes({
  pool,
  requireKey,
  callCouncilMember,
  lclMonitor,
  logger,
  getCachedResponse,
  cacheResponse,
  commitToGitHub,
}) {
  const log = logger || console;
  const cacheGet = typeof getCachedResponse === 'function' ? getCachedResponse : null;
  const cacheSet = typeof cacheResponse === 'function' ? cacheResponse : null;
  const memorySvc = pool?.query ? createMemoryIntelligenceService(pool, log) : null;

  // ── GET /ready — machine-readable "can the system build & commit?" (for preflight + operators)

  function getBuilderReady(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const anyAuthKey = Boolean(
      process.env.API_KEY || process.env.LIFEOS_KEY || process.env.COMMAND_CENTER_KEY
    );
    const deployCommitShaRaw =
      process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
    const deployCommitSha =
      typeof deployCommitShaRaw === 'string' && /^[a-fA-F0-9]{7,40}$/.test(deployCommitShaRaw.trim())
        ? deployCommitShaRaw.trim().slice(0, 40)
        : null;
    const codegen = {
      policy_revision: BUILDER_CODEGEN_POLICY_REVISION,
      supports_max_output_tokens_body: true,
      html_output_estimator: 'v2_linear_chars_1_85',
      ...(deployCommitSha ? { deploy_commit_sha: deployCommitSha } : {}),
    };
    res.json({
      ok: true,
      codegen,
      builder: {
        commitToGitHub: typeof commitToGitHub === 'function',
        /** Token present on the server; without it, commitToGitHub usually throws on use. */
        github_token: Boolean(process.env.GITHUB_TOKEN),
        callCouncilMember: typeof callCouncilMember === 'function',
        pool: Boolean(pool?.query),
        lclMonitor: Boolean(lclMonitor),
        /** Same string as codegen.policy_revision — nested for clients that only read `builder`. */
        codegen_policy_revision: BUILDER_CODEGEN_POLICY_REVISION,
      },
      server: {
        auth: anyAuthKey ? 'key_required' : 'open',
        // When open, requireKey still allows requests; when key_required, client must send matching header.
        auth_keys: anyAuthKey
          ? { API_KEY: Boolean(process.env.API_KEY), LIFEOS_KEY: Boolean(process.env.LIFEOS_KEY), COMMAND_CENTER_KEY: Boolean(process.env.COMMAND_CENTER_KEY) }
          : null,
      },
      next_steps: (() => {
        const s = [];
        if (typeof commitToGitHub !== 'function') s.push('Wire deployment-service commitToGitHub into createLifeOSCouncilBuilderRoutes (startup).');
        if (typeof commitToGitHub === 'function' && !process.env.GITHUB_TOKEN)
          s.push('Set GITHUB_TOKEN on the server — commits will fail at runtime without a GitHub PAT.');
        if (typeof callCouncilMember !== 'function') s.push('Wiring: callCouncilMember missing from createLifeOSCouncilBuilderRoutes (startup).');
        if (!pool?.query) s.push('Set DATABASE_URL — builder audit + some paths need pool.');
        if (anyAuthKey)
          s.push('Send x-command-key (or x-lifeos-key) equal to the configured COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY on each builder request from your machine.');
        return s;
      })(),
    });
  }

  // ── GET /domains ─────────────────────────────────────────────────────────────

  async function getDomains(req, res) {
    try {
      const files = await readdir(PROMPTS_DIR);
      const domains = files
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .map(f => ({
          name: f.replace('.md', ''),
          file: f,
          path: `prompts/${f}`,
        }));
      res.json({ ok: true, domains });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] Failed to list domains');
      res.status(500).json({ ok: false, error: 'Failed to list domain prompt files' });
    }
  }

  // ── GET /domain/:name ────────────────────────────────────────────────────────

  async function getDomain(req, res) {
    try {
      const { name } = req.params;
      if (!/^[\w-]+$/.test(name)) {
        return res.status(400).json({ ok: false, error: 'Invalid domain name' });
      }
      const filePath = join(PROMPTS_DIR, `${name}.md`);
      const content = await readFile(filePath, 'utf8');
      res.json({ ok: true, domain: name, content });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ ok: false, error: 'Domain prompt file not found' });
      }
      res.status(500).json({ ok: false, error: 'Failed to read domain file' });
    }
  }

  // ── GET /next-task ───────────────────────────────────────────────────────────
  // Machine-readable cold-start: same snippets as `npm run cold-start:gen` sources.

  async function getNextTask(req, res) {
    const paths = [
      ['continuity_index', join(REPO_ROOT, 'docs/CONTINUITY_INDEX.md')],
      ['continuity_main', join(REPO_ROOT, 'docs/CONTINUITY_LOG.md')],
      ['continuity_lifeos', join(REPO_ROOT, 'docs/CONTINUITY_LOG_LIFEOS.md')],
      ['continuity_council', join(REPO_ROOT, 'docs/CONTINUITY_LOG_COUNCIL.md')],
      ['ai_cold_start', join(REPO_ROOT, 'docs/AI_COLD_START.md')],
      ['prompt_ssot_sequence', join(PROMPTS_DIR, '00-SSOT-READ-SEQUENCE.md')],
      ['prompt_model_tiers', join(PROMPTS_DIR, '00-MODEL-TIERS-THINK-VS-EXECUTE.md')],
    ];
    const snippets = {};
    for (const [key, p] of paths) {
      try {
        const t = await readFile(p, 'utf8');
        snippets[key] = t.slice(0, 8000);
      } catch {
        snippets[key] = `(missing: ${key})`;
      }
    }
    res.json({
      ok: true,
      read_order: [
        'prompts/00-LIFEOS-AGENT-CONTRACT.md',
        'prompts/00-SSOT-READ-SEQUENCE.md',
        'prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md',
        'docs/CONTINUITY_INDEX.md',
        'docs/AI_COLD_START.md',
        'docs/CONTINUITY_LOG*.md (lane)',
        'docs/projects/*manifest.json',
        'prompts/<domain>.md',
      ],
      snippets,
      generated_at: new Date().toISOString(),
    });
  }

  function buildGapRecommendation({ stage, reason, targetFile = null, routingKey = null, mode = null, domain = null }) {
    const fixes = {
      routing: 'Inspect task-to-model authority and unblock or remap the builder route for this task type.',
      dispatch: 'Fix council dispatch on the Railway runtime: provider keys, routing, remote reachability, or server-side council path.',
      placement: 'Tighten builder metadata so target_file is emitted deterministically for commit-capable slices.',
      validation: 'Harden output validation rules or the domain prompt so builder output conforms before commit.',
      syntax: 'Improve code-generation prompt/contracts and keep the syntax gate red until generated JS passes node --check.',
      sql: 'Strengthen SQL generation/validation so migrations contain real executable SQL before commit.',
      html: 'Require full-document HTML output with the required root tags before commit.',
      commit: 'Repair the GitHub commit path on the remote system: token, branch permissions, or commit transport.',
    };
    return {
      stage,
      reason,
      target_file: targetFile,
      routing_key: routingKey,
      mode,
      domain,
      next_platform_fix: fixes[stage] || 'Repair the builder/platform path before retrying product work.',
      remote_system_truth: REMOTE_SYSTEM_TRUTH,
    };
  }

  async function insertBuilderAudit({
    domain,
    task,
    model_used,
    rawOutput,
    cache_hit,
    placement,
    status = 'generated',
    failureStage = null,
    failureReason = null,
    gapRecommendation = null,
    committed = null,
    routingKey = null,
    mode = null,
    executionOnly = null,
  }) {
    if (!pool?.query) return;
    const preview = String(task || '').slice(0, 500);
    const placementJson = {
      ...(placement || {}),
      status,
      failure_stage: failureStage,
      failure_reason: failureReason,
      gap_recommendation: gapRecommendation,
      committed,
      routing_key: routingKey,
      mode,
      execution_only: executionOnly,
    };
    await pool
      .query(
        `INSERT INTO conductor_builder_audit (domain, task_preview, model_used, output_chars, cache_hit, placement_json)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          domain || null,
          preview,
          model_used,
          rawOutput?.length || 0,
          !!cache_hit,
          JSON.stringify(placementJson),
        ]
      )
      .catch(() => {});
  }

  /** GitHub commits do not update the Railway container FS — files[] injection reads disk. Mirror so chained /build steps see newest content without redeploy between tasks. */
  async function mirrorCommittedContentToRepoRoot(relPath, content) {
    if (!relPath || typeof content !== 'string') return { ok: false, reason: 'bad_args' };
    const sanitized = String(relPath).replace(/^[/\\]+/, '');
    if (sanitized.includes('..') || !/^[\w./\\-]+$/.test(sanitized)) {
      return { ok: false, reason: 'invalid_path' };
    }
    const abs = resolve(REPO_ROOT, sanitized);
    const relToRoot = relative(REPO_ROOT, abs);
    if (relToRoot.startsWith('..') || relToRoot === '') return { ok: false, reason: 'outside_repo' };
    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, 'utf8');
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e?.message || String(e) };
    }
  }

  async function recordBuilderGap({
    domain,
    task,
    modelUsed = 'system',
    rawOutput = '',
    cacheHit = false,
    placement = null,
    status = 'failed',
    stage,
    reason,
    targetFile = null,
    routingKey = null,
    mode = null,
    executionOnly = null,
  }) {
    const gapRecommendation = buildGapRecommendation({
      stage,
      reason,
      targetFile: targetFile || placement?.target_file || null,
      routingKey,
      mode,
      domain,
    });
    await insertBuilderAudit({
      domain,
      task,
      model_used: modelUsed,
      rawOutput,
      cache_hit: cacheHit,
      placement,
      status,
      failureStage: stage,
      failureReason: reason,
      gapRecommendation,
      committed: false,
      routingKey,
      mode,
      executionOnly,
    });
    return gapRecommendation;
  }

  // ── POST /task ───────────────────────────────────────────────────────────────

  async function dispatchTask(req, res) {
    const {
      domain,
      task,
      spec,
      files,
      target_file: bodyTargetFile,
      model,
      mode = 'code',
      useCache = true,
      autonomy_mode = 'max',
      internet_research = true,
      execution_only = false,
    } = req.body || {};

    if (!task) {
      return res.status(400).json({ ok: false, error: 'task is required' });
    }

    let domainContext = '';
    let domainLoaded = false;
    if (domain) {
      try {
        if (!/^[\w-]+$/.test(domain)) throw new Error('Invalid domain name');
        const filePath = join(PROMPTS_DIR, `${domain}.md`);
        domainContext = await readFile(filePath, 'utf8');
        domainLoaded = true;
      } catch {
        log.warn({ domain }, '[BUILDER] Domain prompt file not found — proceeding without context');
      }
    }

    const { block: filesContentBlock, summaries: filesInjectSummaries } = await loadRepoFilesForBuilder(files, log);
    if (filesInjectSummaries.length) {
      log.info({ count: filesInjectSummaries.length, paths: filesInjectSummaries.map(s => s.path) }, '[BUILDER] Injected repo file bodies for files[]');
    }

    const executionOnly = execution_only === true;
    const routingKey =
      mode === 'code' && executionOnly && !model
        ? 'council.builder.code_execute'
        : `council.builder.${mode}`;
    const requestedModel = model || getModelForTask(routingKey) || 'gemini_flash';
    const rawCandidateModels = model ? [model] : getCandidateModelsForTask(routingKey);
    const availability = filterAvailableCouncilMembers(rawCandidateModels);
    const candidateModels = availability.available;
    const unavailableCandidates = availability.unavailable;
    const preferredModel = availability.availabilityByModel[requestedModel]?.available
      ? requestedModel
      : (candidateModels[0] || null);
    let routingRecommendation = {
      selectedModel: preferredModel,
      blockedCandidates: unavailableCandidates.map((row) => row.model),
      reason: preferredModel
        ? 'Using runtime-available routing map'
        : 'No runtime-available model is currently configured for this builder task',
    };
    if (model) {
      if (availability.availabilityByModel[model]?.available) {
        routingRecommendation = {
          selectedModel: model,
          blockedCandidates: unavailableCandidates.map((row) => row.model),
          reason: `Using explicit model override: ${model}`,
        };
      } else {
        routingRecommendation = {
          selectedModel: null,
          blockedCandidates: unavailableCandidates.map((row) => row.model),
          reason: `Explicit model override ${model} unavailable (${availability.availabilityByModel[model]?.reason || 'unknown_reason'})`,
        };
      }
    } else if (memorySvc) {
      try {
        routingRecommendation = await memorySvc.getRoutingRecommendation({
          taskType: routingKey,
          proposedModel: preferredModel,
          candidateModels,
        });
        routingRecommendation.blockedCandidates = [
          ...(routingRecommendation.blockedCandidates || []),
          ...unavailableCandidates.map((row) => row.model),
        ];
        if (!routingRecommendation.selectedModel && unavailableCandidates.length) {
          routingRecommendation.reason = `No runtime-available authorized model for ${routingKey}; unavailable: ${unavailableCandidates.map((row) => `${row.model}(${row.reason})`).join(', ')}`;
        } else if (
          routingRecommendation.selectedModel &&
          requestedModel &&
          !availability.availabilityByModel[requestedModel]?.available
        ) {
          routingRecommendation.reason = `Static/requested model ${requestedModel} unavailable (${availability.availabilityByModel[requestedModel]?.reason}); selected ${routingRecommendation.selectedModel} instead`;
        }
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message, routingKey }, '[BUILDER] Memory routing unavailable — falling back to static map');
        routingRecommendation.reason = preferredModel
          ? 'Memory routing unavailable; using runtime-available static routing map'
          : 'Memory routing unavailable and no runtime-available static model exists';
      }
    }
    const memberKey = routingRecommendation.selectedModel;
    if (!memberKey) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task,
        status: 'blocked',
        stage: 'routing',
        reason: routingRecommendation.reason || 'No authorized model is currently allowed for this builder task',
        targetFile: bodyTargetFile || null,
        routingKey,
        mode,
        executionOnly,
      });
      return res.status(409).json({
        ok: false,
        error: 'No authorized model is currently allowed for this builder task',
        routing_key: routingKey,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
        detail: routingRecommendation.reason,
        gap_recommendation: gapRecommendation,
      });
    }
    const cacheMember = `council_builder:${memberKey}`;

    const modeInstructions = {
      code:
        'Generate the complete implementation code. Output ONLY the code first — no explanation before the code block.\n' +
        'Then append a line containing exactly ---METADATA--- on its own line, followed by a single JSON object with keys: ' +
        '"target_file" (string or null), "insert_after_line" (number or null), "confidence" (0-1). No markdown fences around the JSON.',
      plan:
        'Generate a step-by-step implementation plan. Be specific about file names, function signatures, DB schema changes, and route endpoints. No code yet.\n' +
        'End with ---METADATA--- then JSON: {"target_file":null,"insert_after_line":null,"confidence":0.9}',
      review:
        'Review the provided code or diff. Identify bugs, missing edge cases, drift from the domain conventions, and anything that contradicts what the domain context says already exists.\n' +
        'End with ---METADATA--- then JSON: {"target_file":null,"insert_after_line":null,"confidence":0.9}',
    }[mode] || 'Generate the complete implementation code.';

    const systemPrompt = [
      'You are a senior engineer working on the LifeOS platform.',
      'You write clean, production-quality Node.js/ESM code that follows existing patterns.',
      'You never rebuild what already exists. You extend what is there.',
      BUILDER_EPISTEMIC_LAWS,
      domainContext ? `\n--- DOMAIN CONTEXT (read this before writing anything) ---\n${domainContext}\n---` : '',
    ].filter(Boolean).join('\n');

    const autonomyInstructions = buildAutonomyInstructions({
      autonomyMode: String(autonomy_mode || 'max').toLowerCase(),
      internetResearch: internet_research !== false,
    });

    const htmlCodegenExtra =
      mode === 'code' && builderTargetsHtml(files, bodyTargetFile) ? `\n${htmlFullFileCodegenHints()}` : '';

    const executionModeBlock =
      mode === 'code' && executionOnly
        ? '\nEXECUTION MODE: The architecture is already decided. Implement the SPECIFICATION and file context literally; do not expand scope or redesign.'
        : '';

    const userPrompt = [
      `TASK: ${task}`,
      spec ? `\nSPECIFICATION:\n${spec}` : '',
      files?.length ? `\nRELEVANT FILE PATHS (also embedded below when readable): ${files.join(', ')}` : '',
      filesContentBlock
        ? `\nREPO FILE CONTENTS — authoritative; produce a single full replacement for target_file when mode is code:\n${filesContentBlock}`
        : '',
      htmlCodegenExtra,
      executionModeBlock,
      `\nINSTRUCTION: ${modeInstructions}`,
      autonomyInstructions ? `\nAUTONOMY: ${autonomyInstructions}` : '',
    ].filter(Boolean).join('\n');

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      let cacheHit = false;
      if (useCache !== false && cacheGet) {
        const cached = await cacheGet(fullPrompt, cacheMember);
        if (cached) {
          cacheHit = true;
          const { output, placement } = splitBuilderOutput(cached);
          await insertBuilderAudit({
            domain,
            task,
            model_used: memberKey,
            rawOutput: cached,
            cache_hit: true,
            placement,
            status: 'generated',
            committed: false,
            routingKey,
            mode,
            executionOnly,
          });
          return res.json({
            ok: true,
            output,
            placement,
            model_used: memberKey,
            routing_key: routingKey,
            routing_reason: routingRecommendation.reason,
            blocked_candidates: routingRecommendation.blockedCandidates || [],
            execution_only: executionOnly,
            domain_context_loaded: domainLoaded,
            domain,
            mode,
            cache_hit: true,
            ...(filesInjectSummaries.length ? { files_injected: filesInjectSummaries } : {}),
          });
        }
      }

      // For code/chat modes the default task-type caps (800 for chat, 1500 for codegen)
      // are too low for any real code generation. Builder tasks always need more room.
      // Use estimateBuilderMaxOutputTokens for code mode (file-context aware); for chat
      // mode targeting a source file, floor at 4096 so the model can complete functions.
      const estimatedMax = mode === 'code'
        ? estimateBuilderMaxOutputTokens(filesInjectSummaries, filesContentBlock, bodyTargetFile)
        : null;
      // Fallback when estimator returns null (no file context): HTML overlays still need enough room for real pages.
      const isHtmlTarget = /\.html$/i.test(String(bodyTargetFile || ''));
      const htmlFloor = Math.min(
        128_000,
        Math.max(8192, parseInt(process.env.BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP || '65536', 10) || 65536),
      );
      const computedTokens =
        estimatedMax || (isHtmlTarget ? htmlFloor : bodyTargetFile || filesContentBlock ? 4096 : 2048);

      /** Supervisor knob: raises/lowers council completion budget without waiting for estimator deploy (same key auth as `/build`). */
      const rawSupervisorCap = req.body?.max_output_tokens ?? req.body?.maxOutputTokens;
      const supervisorCapParsed = typeof rawSupervisorCap === 'string' ? parseInt(rawSupervisorCap, 10) : Number(rawSupervisorCap);
      const maxOutputTokens =
        mode === 'code' &&
        typeof supervisorCapParsed === 'number' &&
        Number.isFinite(supervisorCapParsed) &&
        supervisorCapParsed > 0
          ? Math.min(128_000, Math.max(256, Math.floor(supervisorCapParsed)))
          : computedTokens;
      const result = await callCouncilMember(memberKey, fullPrompt, {
        useCache: false,
        allowModelDowngrade: false,
        taskType: mode === 'code' ? 'codegen' : mode,
        maxOutputTokens,
      });
      const raw = typeof result === 'string' ? result : result?.content || result?.text || '';
      const { output, placement } = splitBuilderOutput(raw);

      if (useCache !== false && cacheSet && raw) {
        cacheSet(fullPrompt, cacheMember, raw, routingKey);
      }

      await insertBuilderAudit({
        domain,
        task,
        model_used: memberKey,
        rawOutput: raw,
        cache_hit: false,
        placement,
        status: 'generated',
        committed: false,
        routingKey,
        mode,
        executionOnly,
      });

      log.info({ domain, mode, memberKey, taskLength: task.length }, '[BUILDER] Task dispatched and completed');

      res.json({
        ok: true,
        output,
        placement,
        model_used: memberKey,
        routing_key: routingKey,
        routing_reason: routingRecommendation.reason,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
        execution_only: executionOnly,
        domain_context_loaded: domainLoaded,
        domain,
        mode,
        cache_hit: false,
        ...(filesInjectSummaries.length ? { files_injected: filesInjectSummaries } : {}),
        ...(mode === 'code'
          ? {
              max_output_tokens_requested: maxOutputTokens,
              ...(mode === 'code' &&
              typeof supervisorCapParsed === 'number' &&
              Number.isFinite(supervisorCapParsed) &&
              supervisorCapParsed > 0 &&
              maxOutputTokens === Math.min(128_000, Math.max(256, Math.floor(supervisorCapParsed)))
                ? { max_output_tokens_supervisor_override: true }
                : {}),
            }
          : {}),
      });
    } catch (err) {
      log.error({ err: err.message, domain, mode }, '[BUILDER] Task dispatch failed');
      const gapRecommendation = await recordBuilderGap({
        domain,
        task,
        modelUsed: memberKey || 'system',
        status: 'failed',
        stage: 'dispatch',
        reason: err.message,
        targetFile: bodyTargetFile || null,
        routingKey,
        mode,
        executionOnly,
      });
      res.status(500).json({
        ok: false,
        error: 'Council call failed',
        detail: err.message,
        gap_recommendation: gapRecommendation,
      });
    }
  }

  async function reviewCode(req, res) {
    const { domain, code, question } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'code is required' });

    return dispatchTask(
      {
        body: {
          domain,
          task: question || 'Review this code for correctness, consistency with the domain, and any missing edge cases.',
          spec: code,
          mode: 'review',
        },
      },
      res
    );
  }

  function getModelMap(req, res) {
    const annotated = Object.entries(TASK_MODEL_MAP).map(([task, member]) => ({
      task,
      model: member || '(no AI needed)',
      is_free: true,
    }));
    res.json({ ok: true, routing: annotated, default_model: 'gemini_flash' });
  }

  function getLCLStats(req, res) {
    if (!lclMonitor) {
      return res.json({ ok: true, message: 'LCL monitor not initialized', stats: null });
    }
    const stats = lclMonitor.getStats();
    res.json({ ok: true, stats });
  }

  // ── POST /execute ─────────────────────────────────────────────────────────────
  // Apply pre-generated code to a file in the repo.
  // The Conductor (or system) reviewed the output from /task; this commits it.
  // Body: { output, target_file, commit_message?, branch? }
  // §2.11: This is the step that makes the SYSTEM the author, not the Conductor.

  async function executeOutput(req, res) {
    const { output, target_file, commit_message, branch } = req.body || {};
    if (!output) return res.status(400).json({ ok: false, error: 'output is required' });
    if (!target_file) return res.status(400).json({ ok: false, error: 'target_file is required' });

    if (typeof commitToGitHub !== 'function') {
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        status: 'blocked',
        stage: 'commit',
        reason: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      return res.status(503).json({
        ok: false,
        error: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        gap_recommendation: gapRecommendation,
      });
    }

    // For HTML targets: strip any markdown preamble the model wrote before <!DOCTYPE / <html
    let cleanedOutput = output;
    if (/\.html$/i.test(target_file)) {
      const extracted = extractHtmlFromOutput(output);
      if (extracted !== output) {
        log.info({ target_file, stripped: output.length - extracted.length }, '[BUILDER] /execute: Stripped markdown preamble from HTML output');
        cleanedOutput = extracted;
      }
    } else if (/\.(js|mjs|cjs)$/i.test(target_file)) {
      const extracted = extractJavaScriptFromOutput(output);
      if (extracted !== output) {
        log.info(
          { target_file, stripped: output.length - extracted.length },
          '[BUILDER] /execute: Stripped HTML/markdown wrapper from JS output',
        );
        cleanedOutput = extracted;
      }
    }
    const validationError = validateGeneratedOutputForTarget(target_file, cleanedOutput);
    if (validationError) {
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        modelUsed: 'system',
        rawOutput: output,
        status: 'failed',
        stage: 'validation',
        reason: validationError,
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      return res.status(422).json({ ok: false, error: validationError, committed: false, target_file, gap_recommendation: gapRecommendation });
    }

    if (/\.(js|mjs|cjs)$/i.test(target_file)) {
      const chk = await verifyGeneratedJavaScriptWithNodeCheck(cleanedOutput, target_file);
      if (!chk.ok) {
        const syntaxError = chk.error || 'syntax error';
        const gapRecommendation = await recordBuilderGap({
          domain: null,
          task: `execute: ${target_file}`,
          modelUsed: 'system',
          rawOutput: output,
          status: 'failed',
          stage: 'syntax',
          reason: syntaxError,
          targetFile: target_file,
          routingKey: 'council.builder.execute',
          mode: 'execute',
        });
        return res.status(422).json({
          ok: false,
          error: 'Pre-commit syntax check failed — commit blocked',
          syntax_error: syntaxError,
          committed: false,
          target_file,
          gap_recommendation: gapRecommendation,
        });
      }
    }

    const msg = commit_message || `[system-build] ${target_file}`;
    try {
      await commitToGitHub(target_file, cleanedOutput, msg, branch || undefined);
      log.info({ target_file, msg }, '[BUILDER] /execute committed file to GitHub');
      const mirrorExec = await mirrorCommittedContentToRepoRoot(target_file, cleanedOutput);
      if (!mirrorExec.ok) {
        log.warn({ target_file, reason: mirrorExec.reason }, '[BUILDER] Runtime repo mirror failed after /execute — chained files[] may be stale until redeploy');
      }
      await insertBuilderAudit({
        domain: null,
        task: `execute: ${target_file}`,
        model_used: 'system',
        rawOutput: cleanedOutput,
        cache_hit: false,
        placement: { target_file },
        status: 'committed',
        committed: true,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      res.json({ ok: true, committed: true, target_file, commit_message: msg });
    } catch (err) {
      log.error({ err: err.message, target_file }, '[BUILDER] /execute commit failed');
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        modelUsed: 'system',
        rawOutput: output,
        status: 'failed',
        stage: 'commit',
        reason: err.message,
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      res.status(500).json({ ok: false, error: err.message, gap_recommendation: gapRecommendation });
    }
  }

  // ── Route auto-wiring ─────────────────────────────────────────────────────────
  // Called after /build successfully commits a routes/lifeos-*-routes.js file.
  // Reads startup/register-runtime-routes.js from GitHub, adds import + app.use(), commits.
  // This makes the builder self-sufficient — no Conductor needed to wire routes manually.
  async function autoWireRoute(routeFilePath, routeFileContent, mountPathOverride) {
    const REGISTER_PATH = 'startup/register-runtime-routes.js';
    const token = process.env.GITHUB_TOKEN?.trim();
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) return { ok: false, reason: 'GITHUB_TOKEN or GITHUB_REPO not set' };
    const [owner, repoName] = repo.split('/');
    const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';

    // Extract export name from the committed route file content
    const exportMatch = routeFileContent.match(/export\s+(?:async\s+)?function\s+(create\w+|mount\w+)\s*\(/);
    if (!exportMatch) return { ok: false, reason: 'no export function found in route file' };
    const exportName = exportMatch[1];

    // Read current register-runtime-routes.js from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${REGISTER_PATH}?ref=${branch}`,
      { headers: { Authorization: `token ${token}`, 'Cache-Control': 'no-cache' } }
    );
    if (!getRes.ok) return { ok: false, reason: `could not read ${REGISTER_PATH}: HTTP ${getRes.status}` };
    const fileData = await getRes.json();
    let current = Buffer.from(fileData.content, 'base64').toString('utf8');

    // Already wired?
    if (current.includes(exportName)) return { ok: true, reason: 'already wired', skipped: true };

    // Derive mount path from file name: routes/lifeos-victory-vault-routes.js → /api/v1/lifeos/victory-vault
    const namePart = routeFilePath
      .replace(/^routes\//, '')
      .replace(/-routes\.js$/, '')
      .replace(/^lifeos-/, '');
    const mountPath = mountPathOverride || `/api/v1/lifeos/${namePart}`;
    const label = namePart.replace(/-/g, '_').toUpperCase();

    // Build import line
    const importLine = `import { ${exportName} } from "../${routeFilePath}";\n`;

    // Insert import: before `export async function registerRuntimeRoutes`
    const fnStart = current.indexOf('export async function registerRuntimeRoutes');
    if (fnStart === -1) return { ok: false, reason: 'could not find registerRuntimeRoutes in file' };
    current = current.slice(0, fnStart) + importLine + current.slice(fnStart);

    // Detect mount call pattern (mountXxx vs createXxx)
    const isMountStyle = exportName.startsWith('mount');
    const mountCall = isMountStyle
      ? `  ${exportName}(app, { pool });\n  logger.info('✅ [${label}] Routes mounted at ${mountPath}');\n`
      : `  app.use("${mountPath}", ${exportName}({ pool, requireKey, callCouncilMember, logger }));\n  logger.info('✅ [${label}] Routes mounted at ${mountPath}');\n`;

    // Insert mount: just before the Memory Intelligence mount (last reliable anchor before return)
    const memAnchor = "  // Memory Intelligence";
    const anchorIdx = current.indexOf(memAnchor);
    const insertAt = anchorIdx !== -1 ? anchorIdx : current.lastIndexOf('  return {');
    if (insertAt === -1) return { ok: false, reason: 'could not find insertion anchor in file' };
    current = current.slice(0, insertAt) + mountCall + '\n' + current.slice(insertAt);

    // Commit updated file
    await commitToGitHub(
      REGISTER_PATH,
      current,
      `[system-build] wire ${exportName} to register-runtime-routes.js`,
      branch
    );
    const mirrorReg = await mirrorCommittedContentToRepoRoot(REGISTER_PATH, current);
    if (!mirrorReg.ok) {
      log.warn(
        { path: REGISTER_PATH, reason: mirrorReg.reason },
        '[BUILDER] Runtime repo mirror failed after autoWireRoute — chained files[] seeing register-runtime-routes.js may lag until redeploy',
      );
    }
    return { ok: true, exportName, mountPath, committed: true };
  }

  // ── POST /build ───────────────────────────────────────────────────────────────
  // Full §2.11-compliant autonomous flow: generate code → commit to GitHub → Railway deploys.
  // Body: same as /task PLUS target_file (required if not in placement metadata) + commit_message?
  //       mount_path? — override auto-detected mount path for route auto-wiring
  // Returns: { ok, output, target_file, committed, model_used, route_wired? }

  async function buildAndCommit(req, res) {
    const { target_file, commit_message, branch, mount_path, ...taskBody } = req.body || {};

    if (!taskBody.task) {
      return res.status(400).json({ ok: false, error: 'task is required' });
    }
    if (typeof commitToGitHub !== 'function') {
      const gapRecommendation = await recordBuilderGap({
        domain: taskBody.domain || null,
        task: taskBody.task,
        status: 'blocked',
        stage: 'commit',
        reason: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        targetFile: target_file || null,
        routingKey: 'council.builder.code',
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      return res.status(503).json({
        ok: false,
        error: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        gap_recommendation: gapRecommendation,
      });
    }

    // Step 1: Generate via council (reuse dispatchTask logic inline)
    let generatedOutput, placement, model_used, domain_context_loaded, domain, routing_key;
    try {
      // Capture the response by calling dispatchTask via a mock response collector
      let captured = null;
      const mockRes = {
        status(code) { return { json(data) { captured = { code, data }; } }; },
        json(data) { captured = { code: 200, data }; },
      };
      // /build must NEVER use cache — every build call needs fresh generation for its spec.
      await dispatchTask({ body: { ...taskBody, mode: taskBody.mode || 'code', useCache: false } }, mockRes);

      if (!captured || captured.code !== 200 || !captured.data?.ok) {
        const errMsg = captured?.data?.error || 'Council call failed';
        const detail = captured?.data?.detail;
        const httpStatus = typeof captured?.code === 'number' && captured.code >= 400 && captured.code < 600 ? captured.code : 500;
        return res.status(httpStatus).json({
          ok: false,
          error: errMsg,
          ...(detail ? { detail } : {}),
          ...(captured?.data?.gap_recommendation ? { gap_recommendation: captured.data.gap_recommendation } : {}),
        });
      }
      generatedOutput = captured.data.output;
      placement = captured.data.placement;
      model_used = captured.data.model_used;
      routing_key = captured.data.routing_key;
      domain_context_loaded = captured.data.domain_context_loaded;
      domain = captured.data.domain;
    } catch (err) {
      const gapRecommendation = await recordBuilderGap({
        domain: taskBody.domain || null,
        task: taskBody.task,
        status: 'failed',
        stage: 'dispatch',
        reason: err.message,
        targetFile: target_file || null,
        routingKey: 'council.builder.code',
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      return res.status(500).json({
        ok: false,
        error: `Generation failed: ${err.message}`,
        gap_recommendation: gapRecommendation,
      });
    }

    // Step 2: Resolve target file
    const resolvedTarget = target_file || placement?.target_file;
    if (!resolvedTarget) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'needs_target',
        stage: 'placement',
        reason: 'target_file not in placement metadata and not provided',
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      // Return output without committing — caller must supply target_file
      return res.json({
        ok: true,
        output: generatedOutput,
        placement,
        model_used,
        domain_context_loaded,
        domain,
        committed: false,
        note: 'target_file not in placement metadata and not provided — pass target_file to commit',
        gap_recommendation: gapRecommendation,
      });
    }

    // Step 3: Commit
    // For HTML targets: strip any markdown preamble the model wrote before <!DOCTYPE / <html
    if (/\.html$/i.test(resolvedTarget)) {
      const extracted = extractHtmlFromOutput(generatedOutput);
      if (extracted !== generatedOutput) {
        log.info({ resolvedTarget, stripped: generatedOutput.length - extracted.length }, '[BUILDER] Stripped markdown preamble from HTML output');
        generatedOutput = extracted;
      }
    }
    if (/\.(js|mjs|cjs)$/i.test(resolvedTarget)) {
      const extractedJs = extractJavaScriptFromOutput(generatedOutput);
      if (extractedJs !== generatedOutput) {
        log.info(
          { resolvedTarget, stripped: generatedOutput.length - extractedJs.length },
          '[BUILDER] Stripped HTML/markdown wrapper from JS output before syntax gate',
        );
        generatedOutput = extractedJs;
      }
    }
    const validationError = validateGeneratedOutputForTarget(resolvedTarget, generatedOutput);
    if (validationError) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'failed',
        stage: 'validation',
        reason: validationError,
        targetFile: resolvedTarget,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      if (memorySvc && model_used) {
        try {
          await memorySvc.recordProtocolViolation({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            violationType: 'unverifiable_output',
            severity: 'medium',
            details: validationError,
            evidenceText: `Target file ${resolvedTarget} failed build validation before commit`,
            detectedBy: 'builder_validation',
            sourceRoute: '/api/v1/lifeos/builder/build',
            autoAction: 'watch',
          });
          await memorySvc.recordAgentPerformance({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            outcome: 'incorrect',
            notes: validationError,
          });
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message, model_used }, '[BUILDER] could not persist protocol violation');
        }
      }
      return res.status(422).json({
        ok: false,
        error: validationError,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: false,
        gap_recommendation: gapRecommendation,
      });
    }

    // ── Pre-commit syntax gate (JS/MJS only) ──────────────────────────────────
    // Prevents the builder from committing syntactically broken code.
    // A model is never trusted because it's smart — it must be checked.
    const isJsFile = /\.(js|mjs|cjs)$/.test(resolvedTarget);
    if (isJsFile) {
      const chk = await verifyGeneratedJavaScriptWithNodeCheck(generatedOutput, resolvedTarget);
      const syntaxOk = chk.ok;
      const syntaxError = chk.error || null;

      if (!syntaxOk) {
        log.error({ resolvedTarget, model_used, syntaxError }, '[BUILDER] pre-commit syntax check FAILED — blocking commit');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'syntax',
          reason: syntaxError || 'node --check failed',
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        if (memorySvc && model_used) {
          try {
            await memorySvc.recordProtocolViolation({
              agentId: model_used,
              taskType: routing_key || 'council.builder.code',
              violationType: 'syntax_error',
              severity: 'high',
              details: `node --check failed on ${resolvedTarget}`,
              evidenceText: syntaxError,
              detectedBy: 'builder_pre_commit_gate',
              sourceRoute: '/api/v1/lifeos/builder/build',
              autoAction: 'watch',
            });
            await memorySvc.recordAgentPerformance({
              agentId: model_used,
              taskType: routing_key || 'council.builder.code',
              outcome: 'incorrect',
              notes: `Syntax error in generated ${resolvedTarget}: ${syntaxError.slice(0, 200)}`,
            });
          } catch (memErr) {
            log.warn({ err: memErr.message }, '[BUILDER] could not record syntax violation');
          }
        }
        return res.status(422).json({
          ok: false,
          error: `Pre-commit syntax check failed — commit blocked`,
          syntax_error: syntaxError,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          fix: 'Review the generated output for syntax errors and re-run or fix manually',
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] pre-commit syntax check passed');
    }

    // ── SQL validation gate ───────────────────────────────────────────────────
    const isSqlFile = /\.sql$/.test(resolvedTarget);
    if (isSqlFile) {
      const sqlContent = generatedOutput.trim();
      const sqlKeywords = /\b(CREATE|ALTER|INSERT|UPDATE|DELETE|SELECT|DROP|GRANT|REVOKE|TRUNCATE|WITH)\b/i;
      if (!sqlContent || !sqlKeywords.test(sqlContent)) {
        log.error({ resolvedTarget }, '[BUILDER] SQL validation failed — no valid SQL keywords');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'sql',
          reason: 'SQL validation failed — content does not contain recognizable SQL keywords',
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        return res.status(422).json({
          ok: false,
          error: 'SQL validation failed — content does not contain recognizable SQL keywords',
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] SQL validation passed');
    }

    // ── HTML validation gate ──────────────────────────────────────────────────
    const isHtmlFile = /\.html$/.test(resolvedTarget);
    if (isHtmlFile) {
      const missingTags = ['<html', '<head', '<body'].filter(t => !generatedOutput.includes(t));
      if (missingTags.length > 0) {
        log.error({ resolvedTarget, missingTags }, '[BUILDER] HTML validation failed — missing required tags');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'html',
          reason: `HTML validation failed — missing required tags: ${missingTags.join(', ')}`,
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        return res.status(422).json({
          ok: false,
          error: `HTML validation failed — missing required tags: ${missingTags.join(', ')}`,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] HTML validation passed');
    }

    const msg = commit_message || `[system-build] ${resolvedTarget}`;
    try {
      await commitToGitHub(resolvedTarget, generatedOutput, msg, branch || undefined);
      log.info({ resolvedTarget, msg, model_used }, '[BUILDER] /build committed generated file to GitHub');
      const mirrorBuild = await mirrorCommittedContentToRepoRoot(resolvedTarget, generatedOutput);
      if (!mirrorBuild.ok) {
        log.warn({ resolvedTarget, reason: mirrorBuild.reason }, '[BUILDER] Runtime repo mirror failed after /build — chained files[] may be stale until redeploy');
      }
      await insertBuilderAudit({
        domain,
        task: taskBody.task,
        model_used,
        rawOutput: generatedOutput,
        cache_hit: false,
        placement: { target_file: resolvedTarget },
        status: 'committed',
        committed: true,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      if (memorySvc && model_used) {
        try {
          await memorySvc.recordAgentPerformance({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            outcome: isJsFile ? 'correct' : 'partial', // JS passed syntax gate; others still need downstream verify
            notes: isJsFile
              ? `Builder output committed to ${resolvedTarget}; syntax verified pre-commit`
              : `Builder output committed to ${resolvedTarget}; downstream verification still required`,
          });
          // Record ci_pass evidence for the syntax fact (JS files only — already passed the gate above)
          if (isJsFile) {
            const syntaxFact = await pool?.query(
              `SELECT id FROM epistemic_facts WHERE text = $1`,
              [`${resolvedTarget} passes node --check (valid JavaScript syntax)`],
            ).catch(() => null);
            if (syntaxFact?.rows?.[0]) {
              await memorySvc.addEvidence(syntaxFact.rows[0].id, {
                eventType: 'ci_pass',
                result: 'confirmed',
                evidenceText: `Pre-commit node --check passed on ${resolvedTarget} (model: ${model_used})`,
                source: 'builder/pre-commit-gate',
                sourceIsIndependent: false,
              });
            }
          }
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message, model_used }, '[BUILDER] could not persist agent performance');
        }
      }
      // ── Auto-wire routes to register-runtime-routes.js ───────────────────────
      // If the committed file is a LifeOS routes file, automatically add the import
      // and app.use() to startup/register-runtime-routes.js so the builder wires itself.
      let routeWired = null;
      const isNewRoutesFile = /^routes\/lifeos-.*-routes\.js$/.test(resolvedTarget);
      if (isNewRoutesFile) {
        try {
          routeWired = await autoWireRoute(resolvedTarget, generatedOutput, mount_path || null);
          if (routeWired?.ok && !routeWired?.skipped) {
            log.info({ resolvedTarget, mountPath: routeWired.mountPath }, '[BUILDER] Route auto-wired');
          } else if (routeWired?.skipped) {
            log.info({ resolvedTarget }, '[BUILDER] Route already wired — skipped');
          } else {
            log.warn({ resolvedTarget, reason: routeWired?.reason }, '[BUILDER] Route auto-wire failed (non-fatal)');
          }
        } catch (wireErr) {
          log.warn({ err: wireErr.message, resolvedTarget }, '[BUILDER] Route auto-wire threw (non-fatal)');
          routeWired = { ok: false, reason: wireErr.message };
        }
      }

      res.json({
        ok: true,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: true,
        commit_message: msg,
        model_used,
        domain_context_loaded,
        domain,
        ...(routeWired ? { route_wired: routeWired } : {}),
      });
    } catch (err) {
      log.error({ err: err.message, resolvedTarget }, '[BUILDER] /build commit failed');
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'failed',
        stage: 'commit',
        reason: err.message,
        targetFile: resolvedTarget,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      // Still return the generated output so the caller can apply manually
      res.status(500).json({
        ok: false,
        error: `Commit failed: ${err.message}`,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: false,
        gap_recommendation: gapRecommendation,
      });
    }
  }

  // ── GET /history ─────────────────────────────────────────────────────────────
  // Returns the conductor_builder_audit trail — what was built, by whom, success/fail.
  // Query params: limit (default 50, max 200), domain (filter), since (ISO timestamp), status

  async function getBuilderHistory(req, res) {
    if (!pool?.query) {
      return res.status(503).json({ ok: false, error: 'No DB pool available' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const domain = req.query.domain || null;
      const since = req.query.since || null;
      const status = req.query.status || null;

      const conditions = [];
      const params = [];

      if (domain) {
        params.push(domain);
        conditions.push(`domain = $${params.length}`);
      }
      if (since) {
        params.push(since);
        conditions.push(`created_at >= $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`placement_json->>'status' = $${params.length}`);
      }

      params.push(limit);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await pool.query(
        `SELECT id, created_at, domain, task_preview, model_used, output_chars, cache_hit, placement_json
         FROM conductor_builder_audit
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params,
      );

      res.json({
        ok: true,
        count: rows.length,
        history: rows.map(r => ({
          id: r.id,
          created_at: r.created_at,
          domain: r.domain,
          task_preview: r.task_preview,
          model_used: r.model_used,
          output_chars: r.output_chars,
          cache_hit: r.cache_hit,
          status: r.placement_json?.status || null,
          failure_stage: r.placement_json?.failure_stage || null,
          failure_reason: r.placement_json?.failure_reason || null,
          gap_recommendation: r.placement_json?.gap_recommendation || null,
          routing_key: r.placement_json?.routing_key || null,
          mode: r.placement_json?.mode || null,
          execution_only: r.placement_json?.execution_only ?? null,
          target_file: r.placement_json?.target_file || null,
          committed: r.placement_json?.committed ?? null,
        })),
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /history query failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async function getBuilderGaps(req, res) {
    if (!pool?.query) {
      return res.status(503).json({ ok: false, error: 'No DB pool available' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
      const domain = req.query.domain || null;
      const params = [];
      const conditions = [
        `COALESCE(placement_json->>'status', '') IN ('failed', 'blocked', 'needs_target')`,
      ];

      if (domain) {
        params.push(domain);
        conditions.push(`domain = $${params.length}`);
      }

      params.push(limit);
      const { rows } = await pool.query(
        `SELECT id, created_at, domain, task_preview, model_used, placement_json
         FROM conductor_builder_audit
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params,
      );

      res.json({
        ok: true,
        count: rows.length,
        gaps: rows.map(r => ({
          id: r.id,
          created_at: r.created_at,
          domain: r.domain,
          task_preview: r.task_preview,
          model_used: r.model_used,
          status: r.placement_json?.status || null,
          failure_stage: r.placement_json?.failure_stage || null,
          failure_reason: r.placement_json?.failure_reason || null,
          target_file: r.placement_json?.target_file || null,
          routing_key: r.placement_json?.routing_key || null,
          gap_recommendation: r.placement_json?.gap_recommendation || null,
        })),
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /gaps query failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return function mount(app) {
    const base = '/api/v1/lifeos/builder';
    app.get(`${base}/ready`, requireKey, getBuilderReady);
    app.get(`${base}/domains`, requireKey, getDomains);
    app.get(`${base}/domain/:name`, requireKey, getDomain);
    app.get(`${base}/next-task`, requireKey, getNextTask);
    app.post(`${base}/task`, requireKey, dispatchTask);
    app.post(`${base}/review`, requireKey, reviewCode);
    app.get(`${base}/model-map`, requireKey, getModelMap);
    app.get(`${base}/lcl-stats`, requireKey, getLCLStats);
    app.get(`${base}/history`, requireKey, getBuilderHistory);
    app.get(`${base}/gaps`, requireKey, getBuilderGaps);
    // §2.11 execution endpoints — the system writes and commits code
    app.post(`${base}/execute`, requireKey, executeOutput);
    app.post(`${base}/build`, requireKey, buildAndCommit);
    log.info('✅ [LIFEOS-BUILDER] Council builder routes mounted at /api/v1/lifeos/builder (incl. /execute + /build + /history + /gaps)');
  };
}
