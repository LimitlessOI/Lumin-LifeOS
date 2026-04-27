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
 *   GET  /api/v1/lifeos/builder/ready           server-side builder readiness (commit + council + pool + auth mode)
 *   GET  /api/v1/lifeos/builder/domains         list available domain prompt files
 *   GET  /api/v1/lifeos/builder/domain/:name    read a specific domain prompt file
 *   GET  /api/v1/lifeos/builder/next-task      cold-start packet excerpts + read order
 *   POST /api/v1/lifeos/builder/task            dispatch a task to the council (body `files[]` = repo-relative paths → **server reads and injects file contents** into prompt; optional `target_file` improves HTML full-file hints; code mode passes scaled `maxOutputTokens` to the council)
 *   POST /api/v1/lifeos/builder/review          ask the council to review code/diff
 *   GET  /api/v1/lifeos/builder/model-map       show task-to-model routing table
 *
 * Task body autonomy controls (optional):
 *   autonomy_mode: 'max' | 'normal' (default: 'max')
 *   internet_research: boolean (default: true)
 *   execution_only: boolean (default: false) — when true with mode=code and no explicit `model`, routes to
 *     `council.builder.code_execute` (fast literal codegen). Use only after a frozen spec (see prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { readdir, readFile, writeFile, unlink, mkdtemp } from 'fs/promises';
import { join, dirname, resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { getModelForTask, getCandidateModelsForTask, TASK_MODEL_MAP } from '../config/task-model-routing.js';
import { createMemoryIntelligenceService } from '../services/memory-intelligence-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');
const REPO_ROOT = join(__dirname, '..');

const METADATA_SEP = '\n---METADATA---\n';

/** Max chars injected per file / total into council prompt (large overlays like lifeos-chat.html). */
const BUILDER_FILE_INJECT_MAX_PER = 120_000;
const BUILDER_FILE_INJECT_MAX_TOTAL = 280_000;

/** Grounding rules — paired with `prompts/00-SSOT-READ-SEQUENCE.md`. */
const BUILDER_EPISTEMIC_LAWS = [
  'EPISTEMIC LAWS (this call):',
  '- Ground outputs in DOMAIN CONTEXT, SPECIFICATION, and injected REPO FILE CONTENTS only; do not invent features, routes, env vars, or DB tables not supported there.',
  '- If the spec is incomplete or contradictory, state that in one line before ---METADATA--- and set a low confidence value in the JSON.',
  '- When both apply, injected file bodies override vague task wording.',
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
  if (closeIdx <= firstNl) return s;
  h = h.slice(firstNl + 1, closeIdx).trim();
  return h + tail;
}

/** Builder codegen: estimate output token budget from injected repo files (full-file replacement). */
function estimateBuilderMaxOutputTokens(summaries, filesContentBlock) {
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
  const estimated = Math.ceil(totalChars / 2.5) + 4096;
  // Cap at 16384 — above this, providers reject or produce degraded output.
  return Math.min(16384, Math.max(4096, estimated));
}

function builderTargetsHtml(files, targetFile) {
  const paths = Array.isArray(files) ? files : [];
  if (paths.some(p => String(p).toLowerCase().endsWith('.html'))) return true;
  if (String(targetFile || '').toLowerCase().endsWith('.html')) return true;
  return false;
}

function htmlFullFileCodegenHints() {
  return [
    'HTML FULL FILE (critical): Emit a complete document from <!DOCTYPE html> or opening <html through closing </html>.',
    'Do not emit a fragment, stub, or a single-line doctype only.',
    'Do not wrap the HTML in markdown fences.',
    'The first character of your code output must be "<" (start of <!DOCTYPE or <html).',
  ].join('\n');
}

function splitBuilderOutput(raw) {
  const text = stripLeadingMarkdownFenceBeforeMetadata(String(raw || ''));
  const i = text.lastIndexOf(METADATA_SEP);
  if (i === -1) return { output: text.trim(), placement: null };
  const main = text.slice(0, i).trim();
  try {
    const placement = JSON.parse(text.slice(i + METADATA_SEP.length).trim());
    return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
  } catch {
    return { output: text.trim(), placement: null };
  }
}

function validateGeneratedOutputForTarget(targetFile, output) {
  const target = String(targetFile || '').toLowerCase();
  const text = String(output || '').trim();
  if (!text) return 'generated output is empty';
  if (target.endsWith('.html')) {
    if (text.length < 1000) return 'generated HTML is too short; refusing to commit likely truncated output';
    if (!/^[\s]*</.test(text)) return 'generated HTML must start with <!DOCTYPE or <html (no preamble or markdown)';
    if (!/<html[\s>]/i.test(text) || !/<\/html>/i.test(text)) {
      return 'generated HTML is missing required <html> / </html> document markers';
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
    const anyAuthKey = Boolean(
      process.env.API_KEY || process.env.LIFEOS_KEY || process.env.COMMAND_CENTER_KEY
    );
    res.json({
      ok: true,
      builder: {
        commitToGitHub: typeof commitToGitHub === 'function',
        /** Token present on the server; without it, commitToGitHub usually throws on use. */
        github_token: Boolean(process.env.GITHUB_TOKEN),
        callCouncilMember: typeof callCouncilMember === 'function',
        pool: Boolean(pool?.query),
        lclMonitor: Boolean(lclMonitor),
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

  async function insertBuilderAudit({ domain, task, model_used, rawOutput, cache_hit, placement }) {
    if (!pool?.query) return;
    const preview = String(task || '').slice(0, 500);
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
          placement ? JSON.stringify(placement) : null,
        ]
      )
      .catch(() => {});
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
    const preferredModel = model || getModelForTask(routingKey) || 'gemini_flash';
    const candidateModels = model ? [model] : getCandidateModelsForTask(routingKey);
    let routingRecommendation = {
      selectedModel: preferredModel,
      blockedCandidates: [],
      reason: 'Using static routing map',
    };
    if (memorySvc) {
      try {
        routingRecommendation = await memorySvc.getRoutingRecommendation({
          taskType: routingKey,
          proposedModel: preferredModel,
          candidateModels,
        });
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message, routingKey }, '[BUILDER] Memory routing unavailable — falling back to static map');
        routingRecommendation.reason = 'Memory routing unavailable; using static routing map';
      }
    }
    const memberKey = routingRecommendation.selectedModel;
    if (!memberKey) {
      return res.status(409).json({
        ok: false,
        error: 'No authorized model is currently allowed for this builder task',
        routing_key: routingKey,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
        detail: routingRecommendation.reason,
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

      const maxOutputTokens = mode === 'code' ? estimateBuilderMaxOutputTokens(filesInjectSummaries, filesContentBlock) : undefined;
      const result = await callCouncilMember(memberKey, fullPrompt, {
        useCache: false,
        allowModelDowngrade: false,
        taskType: mode === 'code' ? 'codegen' : mode,
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
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
        ...(mode === 'code' ? { max_output_tokens_requested: maxOutputTokens } : {}),
      });
    } catch (err) {
      log.error({ err: err.message, domain, mode }, '[BUILDER] Task dispatch failed');
      res.status(500).json({ ok: false, error: 'Council call failed', detail: err.message });
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
      return res.status(503).json({ ok: false, error: 'commitToGitHub not available — GITHUB_TOKEN may be missing' });
    }

    const validationError = validateGeneratedOutputForTarget(target_file, output);
    if (validationError) {
      return res.status(422).json({ ok: false, error: validationError, committed: false, target_file });
    }

    const msg = commit_message || `[system-build] ${target_file}`;
    try {
      await commitToGitHub(target_file, output, msg, branch || undefined);
      log.info({ target_file, msg }, '[BUILDER] /execute committed file to GitHub');
      await insertBuilderAudit({ domain: null, task: `execute: ${target_file}`, model_used: 'system', rawOutput: output, cache_hit: false, placement: { target_file } });
      res.json({ ok: true, committed: true, target_file, commit_message: msg });
    } catch (err) {
      log.error({ err: err.message, target_file }, '[BUILDER] /execute commit failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── POST /build ───────────────────────────────────────────────────────────────
  // Full §2.11-compliant autonomous flow: generate code → commit to GitHub → Railway deploys.
  // Body: same as /task PLUS target_file (required if not in placement metadata) + commit_message?
  // Returns: { ok, output, target_file, committed, model_used }

  async function buildAndCommit(req, res) {
    const { target_file, commit_message, branch, ...taskBody } = req.body || {};

    if (!taskBody.task) {
      return res.status(400).json({ ok: false, error: 'task is required' });
    }
    if (typeof commitToGitHub !== 'function') {
      return res.status(503).json({ ok: false, error: 'commitToGitHub not available — GITHUB_TOKEN may be missing' });
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
      await dispatchTask({ body: { ...taskBody, mode: taskBody.mode || 'code' } }, mockRes);

      if (!captured || captured.code !== 200 || !captured.data?.ok) {
        const errMsg = captured?.data?.error || 'Council call failed';
        const detail = captured?.data?.detail;
        const httpStatus = typeof captured?.code === 'number' && captured.code >= 400 && captured.code < 600 ? captured.code : 500;
        return res.status(httpStatus).json({ ok: false, error: errMsg, ...(detail ? { detail } : {}) });
      }
      generatedOutput = captured.data.output;
      placement = captured.data.placement;
      model_used = captured.data.model_used;
      routing_key = captured.data.routing_key;
      domain_context_loaded = captured.data.domain_context_loaded;
      domain = captured.data.domain;
    } catch (err) {
      return res.status(500).json({ ok: false, error: `Generation failed: ${err.message}` });
    }

    // Step 2: Resolve target file
    const resolvedTarget = target_file || placement?.target_file;
    if (!resolvedTarget) {
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
      });
    }

    // Step 3: Commit
    const validationError = validateGeneratedOutputForTarget(resolvedTarget, generatedOutput);
    if (validationError) {
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
      });
    }

    // ── Pre-commit syntax gate (JS/MJS only) ──────────────────────────────────
    // Prevents the builder from committing syntactically broken code.
    // A model is never trusted because it's smart — it must be checked.
    const isJsFile = /\.(js|mjs|cjs)$/.test(resolvedTarget);
    if (isJsFile) {
      let tmpFile = null;
      let syntaxOk = true;
      let syntaxError = null;
      try {
        const tmpDir = await mkdtemp(join(tmpdir(), 'builder-check-'));
        tmpFile = join(tmpDir, extname(resolvedTarget) || '.js');
        await writeFile(tmpFile, generatedOutput, 'utf8');
        execSync(`node --check "${tmpFile}"`, { stdio: 'pipe' });
      } catch (checkErr) {
        syntaxOk = false;
        syntaxError = (checkErr.stderr?.toString() || checkErr.message || 'syntax error').slice(0, 400);
      } finally {
        if (tmpFile) await unlink(tmpFile).catch(() => {});
      }

      if (!syntaxOk) {
        log.error({ resolvedTarget, model_used, syntaxError }, '[BUILDER] pre-commit syntax check FAILED — blocking commit');
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
        return res.status(422).json({
          ok: false,
          error: 'SQL validation failed — content does not contain recognizable SQL keywords',
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
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
        return res.status(422).json({
          ok: false,
          error: `HTML validation failed — missing required tags: ${missingTags.join(', ')}`,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] HTML validation passed');
    }

    const msg = commit_message || `[system-build] ${resolvedTarget}`;
    try {
      await commitToGitHub(resolvedTarget, generatedOutput, msg, branch || undefined);
      log.info({ resolvedTarget, msg, model_used }, '[BUILDER] /build committed generated file to GitHub');
      await insertBuilderAudit({ domain, task: taskBody.task, model_used, rawOutput: generatedOutput, cache_hit: false, placement: { target_file: resolvedTarget } });
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
      res.json({
        ok: true,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: true,
        commit_message: msg,
        model_used,
        domain_context_loaded,
        domain,
      });
    } catch (err) {
      log.error({ err: err.message, resolvedTarget }, '[BUILDER] /build commit failed');
      // Still return the generated output so the caller can apply manually
      res.status(500).json({
        ok: false,
        error: `Commit failed: ${err.message}`,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: false,
      });
    }
  }

  // ── GET /history ─────────────────────────────────────────────────────────────
  // Returns the conductor_builder_audit trail — what was built, by whom, success/fail.
  // Query params: limit (default 50, max 200), domain (filter), since (ISO timestamp)

  async function getBuilderHistory(req, res) {
    if (!pool?.query) {
      return res.status(503).json({ ok: false, error: 'No DB pool available' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const domain = req.query.domain || null;
      const since = req.query.since || null;

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
          target_file: r.placement_json?.target_file || null,
          committed: r.placement_json?.committed ?? null,
        })),
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /history query failed');
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
    // §2.11 execution endpoints — the system writes and commits code
    app.post(`${base}/execute`, requireKey, executeOutput);
    app.post(`${base}/build`, requireKey, buildAndCommit);
    log.info('✅ [LIFEOS-BUILDER] Council builder routes mounted at /api/v1/lifeos/builder (incl. /execute + /build + /history)');
  };
}
