#!/usr/bin/env node
/**
 * scripts/autonomy/builder-supervisor.js
 *
 * Headless multi-agent builder orchestrator.
 *
 * What it does:
 *   1. Pulls "safe" pending segments from project_segments
 *   2. Assigns each to an isolated git worktree
 *   3. Spawns Claude Code CLI headlessly in that worktree
 *      - Uses --output-format stream-json for structured event parsing
 *      - Prefers project-local binary (node_modules/.bin/claude) over global
 *   4. On success → commits changes and opens a GitHub PR
 *   5. On block/failure → writes to pending_adam for Adam to resolve
 *   6. Updates segment status in DB throughout
 *   7. Council review passes rootDir so Gemini 2.5 Pro can analyze the full codebase
 *
 * Safety gates (all must pass before ANY work starts):
 *   - LIFEOS_DIRECTED_MODE must NOT be 'true'
 *   - PAUSE_AUTONOMY must NOT be '1'
 *   - stability_class must be 'safe' (never 'needs-review' or 'high-risk')
 *   - Max MAX_CONCURRENT agents at once (default 3)
 *   - Each agent runs in its own git worktree (zero cross-agent file conflicts)
 *
 * Usage:
 *   node scripts/autonomy/builder-supervisor.js
 *   node scripts/autonomy/builder-supervisor.js --project command_center
 *   node scripts/autonomy/builder-supervisor.js --dry-run
 *   node scripts/autonomy/builder-supervisor.js --max-concurrent 2
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { reviewSegment, formatCouncilSummary } from '../../services/builder-council-review.js';
import { scoreOutcome } from '../../services/model-performance.js';
import { isAutonomyPaused, isDirectedMode } from '../../services/runtime-modes.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_CONCURRENT     = parseInt(process.env.BUILDER_MAX_CONCURRENT ?? '3', 10);
// Prefer the project-local npm binary (version-pinned) over the global install.
// The @anthropic-ai/claude-code npm package installs the binary at node_modules/.bin/claude.
const LOCAL_CLAUDE_BIN   = path.join(ROOT, 'node_modules', '.bin', 'claude');
const CLAUDE_BIN         = process.env.CLAUDE_BIN
  ?? (fs.existsSync(LOCAL_CLAUDE_BIN) ? LOCAL_CLAUDE_BIN : '/Users/adamhopkins/.local/bin/claude');
const ALLOWED_TOOLS      = 'Read,Edit,Write,Bash,Glob,Grep';
const MAX_TURNS          = parseInt(process.env.BUILDER_MAX_TURNS ?? '30', 10);
const WORKTREE_BASE      = path.resolve(ROOT, '..', 'builder-worktrees');
const GITHUB_TOKEN       = process.env.GITHUB_TOKEN;
const GITHUB_REPO        = process.env.GITHUB_REPO ?? 'adamhopkins/Lumin-LifeOS';
const LOG_DIR            = path.join(ROOT, 'scripts', 'autonomy', 'logs');

// Parse CLI args
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const projectFilter = (() => {
  const idx = args.indexOf('--project');
  return idx >= 0 ? args[idx + 1] : null;
})();

// ── Logging ───────────────────────────────────────────────────────────────────

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE  = path.join(LOG_DIR, `supervisor-${TIMESTAMP}.log`);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(level, msg, extra = '') {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}${extra ? ' ' + extra : ''}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const logger = {
  info:  (m, x) => log('INFO',  m, x),
  warn:  (m, x) => log('WARN',  m, x),
  error: (m, x) => log('ERROR', m, x),
  debug: (m, x) => log('DEBUG', m, x),
};

// ── DB ────────────────────────────────────────────────────────────────────────

function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL env var is required');
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
}

// ── Safety check ──────────────────────────────────────────────────────────────

function assertSafeToRun() {
  if (isDirectedMode()) {
    throw new Error('LIFEOS_DIRECTED_MODE=true — builder supervisor will not run in directed mode');
  }
  if (isAutonomyPaused()) {
    throw new Error('PAUSE_AUTONOMY=1 — builder supervisor paused');
  }
  if (!fs.existsSync(CLAUDE_BIN)) {
    throw new Error(`Claude Code CLI not found at ${CLAUDE_BIN} — set CLAUDE_BIN env var`);
  }
}

// ── Fetch pending work ────────────────────────────────────────────────────────

async function fetchPendingSegments(pool) {
  const params = [];
  let sql = `
    SELECT
      ps.id, ps.title, ps.description, ps.stability_class, ps.estimated_hours,
      ps.sort_order, ps.review_tier, ps.allowed_files, ps.exact_outcome, ps.required_checks,
      p.id AS project_id, p.slug AS project_slug, p.name AS project_name,
      p.amendment_path, p.council_persona, p.market_sensitive
    FROM project_segments ps
    JOIN projects p ON ps.project_id = p.id
    WHERE ps.status = 'pending'
      AND ps.stability_class = 'safe'
      AND p.status = 'active'
      AND p.build_ready = TRUE
  `;

  if (projectFilter) {
    params.push(projectFilter);
    sql += ` AND p.slug = $${params.length}`;
  }

  sql += ` ORDER BY
    CASE p.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
    ps.sort_order ASC, ps.id ASC
    LIMIT 20`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

// ── Segment status updates ────────────────────────────────────────────────────

async function markSegmentInProgress(pool, segmentId, projectId) {
  await pool.query(
    `UPDATE project_segments SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
    [segmentId]
  );
  await pool.query(
    `UPDATE projects SET last_worked_on = NOW() WHERE id = $1`,
    [projectId]
  );
}

async function markSegmentDone(pool, segmentId, projectId, actualHours) {
  await pool.query(
    `UPDATE project_segments SET status = 'done', completed_at = NOW(), actual_hours = $2 WHERE id = $1`,
    [segmentId, actualHours]
  );
  // Refresh counts
  const { rows: [counts] } = await pool.query(`
    SELECT COUNT(*) AS total, COUNT(CASE WHEN status = 'done' THEN 1 END) AS done
    FROM project_segments WHERE project_id = $1
  `, [projectId]);
  await pool.query(
    `UPDATE projects SET total_segments = $1, completed_segments = $2, last_worked_on = NOW() WHERE id = $3`,
    [counts.total, counts.done, projectId]
  );
}

async function markSegmentBlocked(pool, segmentId, blockerNote) {
  await pool.query(
    `UPDATE project_segments SET status = 'blocked', blocker_note = $2 WHERE id = $1`,
    [segmentId, blockerNote]
  );
}

async function markSegmentPending(pool, segmentId) {
  // Reset to pending if worktree setup failed before work began
  await pool.query(
    `UPDATE project_segments SET status = 'pending', started_at = NULL WHERE id = $1`,
    [segmentId]
  );
}

// ── pending_adam ──────────────────────────────────────────────────────────────

async function writePendingAdam(pool, { projectId, projectSlug, title, description, type = 'decision', priority = 'normal', context }) {
  const { rows: [item] } = await pool.query(`
    INSERT INTO pending_adam (project_id, project_slug, title, description, type, priority, context)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [projectId, projectSlug, title, description, type, priority, JSON.stringify(context)]);
  return item.id;
}

// ── Git worktree ──────────────────────────────────────────────────────────────

function worktreePath(segmentId) {
  return path.join(WORKTREE_BASE, `seg-${segmentId}`);
}

function branchName(segmentId, slug) {
  const safe = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `builder/seg-${segmentId}-${safe}`;
}

async function git(...args) {
  const { stdout, stderr } = await execFileAsync('git', args, { cwd: ROOT, encoding: 'utf8' }).catch(e => ({
    stdout: e.stdout || '', stderr: e.stderr || '', failed: true,
  }));
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function gitInWorktree(worktree, ...args) {
  const { stdout, stderr } = await execFileAsync('git', args, { cwd: worktree, encoding: 'utf8' }).catch(e => ({
    stdout: e.stdout || '', stderr: e.stderr || '',
  }));
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function createWorktree(segmentId, slugPart) {
  const wt  = worktreePath(segmentId);
  const br  = branchName(segmentId, slugPart);
  ensureDir(WORKTREE_BASE);

  // Remove stale worktree if it exists
  if (fs.existsSync(wt)) {
    await git('worktree', 'remove', '--force', wt);
  }

  await git('worktree', 'add', '-b', br, wt, 'HEAD');
  logger.info(`[WT] Created worktree ${wt} on branch ${br}`);
  return { wt, br };
}

async function removeWorktree(wt) {
  try {
    await git('worktree', 'remove', '--force', wt);
    logger.info(`[WT] Removed worktree ${wt}`);
  } catch (e) {
    logger.warn(`[WT] Could not remove worktree ${wt}: ${e.message}`);
  }
}

async function deleteBranch(br) {
  try {
    await git('branch', '-D', br);
  } catch (_) { /* branch may already be pushed */ }
}

// ── Build the task prompt ─────────────────────────────────────────────────────

function buildPrompt(segment) {
  const amendmentHint = segment.amendment_path
    ? `\n\nSSoT Amendment: ${segment.amendment_path} — read this first to understand the project constraints.`
    : '';

  const outcomeSpec = segment.exact_outcome
    ? `\n\nSUCCESS CRITERION (this is what DONE looks like):\n${segment.exact_outcome}`
    : '';

  const fileScope = segment.allowed_files?.length
    ? `\n\nFILE SCOPE (you may ONLY write to these files — no others):\n${segment.allowed_files.map(f => `  - ${f}`).join('\n')}`
    : '';

  return `You are a headless AI builder working autonomously on the LifeOS project.

Project: ${segment.project_name} (${segment.project_slug})
Task: ${segment.title}
${segment.description ? `\nDetails:\n${segment.description}` : ''}${amendmentHint}${outcomeSpec}${fileScope}

RULES:
- Only modify files directly required by this task. Do not refactor or touch unrelated code.
- All new .js files must have a @ssot JSDoc tag pointing to the correct amendment.
- Never add code to server.js — use routes/, services/, startup/ per project architecture.
- Follow the CLAUDE.md project instructions at the root of the repository.
- After completing work, run: node --check <file> for every JS file you created or modified.
- If you cannot complete this task without a human decision (credentials, approvals, ambiguous requirements), output exactly: NEEDS_HUMAN: <reason>

Complete the task now.`.trim();
}

// ── Spawn Claude Code headlessly (structured JSON output) ─────────────────────
//
// Uses --output-format stream-json so each stdout line is a typed JSON event:
//   { type: 'system', subtype: 'init', ... }
//   { type: 'assistant', message: { content: [{ type: 'text', text: '...' }] } }
//   { type: 'tool_use', name: 'Read', input: { file_path: '...' } }
//   { type: 'result', subtype: 'success', result: '...', is_error: false }
//
// This gives us:
//   - Clean final answer extraction from the result event (no stdout scraping)
//   - Real-time tool tracking logged line by line
//   - Structured NEEDS_HUMAN detection from the result text
//   - Tool use count + list for supervisor logs

function spawnClaude(prompt, cwd) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const stderrChunks = [];
    const events = [];
    let lineBuffer = '';

    const child = spawn(CLAUDE_BIN, [
      '--print',
      '--dangerously-skip-permissions',
      '--allowedTools', ALLOWED_TOOLS,
      '--max-turns', String(MAX_TURNS),
      '--output-format', 'stream-json',
      prompt,
    ], {
      cwd,
      env: { ...process.env, CLAUDE_NONINTERACTIVE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Parse structured JSON events line by line
    child.stdout.on('data', (chunk) => {
      lineBuffer += chunk.toString('utf8');
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop(); // keep incomplete line in buffer
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          events.push(event);
          // Log tool use events in real time for supervisor logs
          if (event.type === 'tool_use') {
            logger.debug(`[CLAUDE] tool: ${event.name} — ${JSON.stringify(event.input).slice(0, 120)}`);
          }
        } catch { /* non-JSON line — log as raw */ }
      }
    });

    child.stderr.on('data', (d) => stderrChunks.push(d));

    child.on('close', (code) => {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

      // Extract final result from structured events
      const resultEvent = events.findLast(e => e.type === 'result');
      const finalText = resultEvent?.result
        ?? events.filter(e => e.type === 'assistant').flatMap(e =>
            e.message?.content?.filter(b => b.type === 'text').map(b => b.text) ?? []
          ).join('\n')
        ?? '';

      const toolsUsed = events.filter(e => e.type === 'tool_use').map(e => e.name);
      const isError = resultEvent?.is_error === true || code !== 0;

      resolve({
        exitCode: isError ? (code ?? 1) : 0,
        stdout: finalText,
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        elapsedMinutes: parseFloat(elapsed),
        toolsUsed,
        eventCount: events.length,
      });
    });

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: `Failed to spawn claude: ${err.message}`,
        elapsedMinutes: 0,
        toolsUsed: [],
        eventCount: 0,
      });
    });
  });
}

// ── GitHub PR ─────────────────────────────────────────────────────────────────

async function openPullRequest({ branch, title, body }) {
  if (!GITHUB_TOKEN) {
    logger.warn('[PR] GITHUB_TOKEN not set — skipping PR creation');
    return null;
  }

  // Push branch
  const { stderr: pushErr } = await git('push', 'origin', branch);
  if (pushErr && !pushErr.includes('Branch') && !pushErr.includes('up-to-date')) {
    logger.warn(`[PR] Push warning: ${pushErr}`);
  }

  // Create PR via GitHub API
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LifeOS-BuilderSupervisor/1.0',
      },
      body: JSON.stringify({
        title,
        body,
        head: branch,
        base: 'main',
        draft: false,
      }),
    });
    const json = await res.json();
    if (json.html_url) {
      logger.info(`[PR] Opened: ${json.html_url}`);
      return json.html_url;
    }
    logger.warn(`[PR] GitHub API error: ${JSON.stringify(json)}`);
    return null;
  } catch (e) {
    logger.warn(`[PR] fetch failed: ${e.message}`);
    return null;
  }
}

// ── Commit changes in worktree ────────────────────────────────────────────────

async function commitWorktreeChanges(wt, segmentTitle, segmentId) {
  const { stdout: statusOut } = await gitInWorktree(wt, 'status', '--short');
  if (!statusOut.trim()) {
    logger.info(`[GIT] No changes to commit in worktree for segment ${segmentId}`);
    return false;
  }

  await gitInWorktree(wt, 'add', '-A');
  const msg = `feat: [builder] ${segmentTitle}\n\nAuto-built by LifeOS Builder Supervisor\nSegment ID: ${segmentId}\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`;
  const { stderr } = await gitInWorktree(wt, 'commit', '-m', msg);
  if (stderr && !stderr.includes('master') && !stderr.includes('main')) {
    logger.warn(`[GIT] Commit warning: ${stderr}`);
  }
  logger.info(`[GIT] Committed changes for segment ${segmentId}`);
  return true;
}

// ── Process a single segment ──────────────────────────────────────────────────

async function processSegment(pool, segment) {
  const { id, title, project_id, project_slug, project_name } = segment;
  logger.info(`[TASK] Starting: [${project_slug}] ${title} (seg-${id})`);

  // Build worktree slug from title
  const slugPart = title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);

  let wt = null;
  let br = null;
  const startTime = Date.now();

  try {
    // Mark in progress
    await markSegmentInProgress(pool, id, project_id);

    // Segment spec validation — skip segments missing required execution contract fields
    // Without exact_outcome and allowed_files, the builder is operating on prose not a contract.
    if (!segment.exact_outcome || !segment.allowed_files || segment.allowed_files.length === 0) {
      logger.warn(`[SPEC] seg-${id} missing required spec fields (exact_outcome or allowed_files) — skipping`);
      await markSegmentPending(pool, id); // reset so it shows up in queue with warning
      await writePendingAdam(pool, {
        projectId: project_id,
        projectSlug: project_slug,
        title: `Segment spec incomplete: ${title}`,
        description: `Segment seg-${id} cannot be built autonomously because it is missing:\n${!segment.exact_outcome ? '- exact_outcome (what done looks like)\n' : ''}${(!segment.allowed_files || segment.allowed_files.length === 0) ? '- allowed_files (which files the builder may write)\n' : ''}\nAdd these to the segment spec in the manifest or DB before this segment can be built.`,
        type: 'review',
        priority: 'normal',
        context: { segmentId: id, missingSpec: true },
      });
      return { segmentId: id, status: 'spec_incomplete' };
    }

    if (DRY_RUN) {
      logger.info(`[DRY-RUN] Would process: ${title}`);
      await markSegmentPending(pool, id);
      return { segmentId: id, status: 'dry-run' };
    }

    // ── Council Review ──────────────────────────────────────────────────────
    // Before touching a single file, the council applies lenses based on review_tier.
    // tier_0=skip, tier_1=consequences+Adam, tier_2=full 5-lens, tier_3=full+debate+human
    // This runs on free-tier models only. ~30-60 seconds. Worth every second.
    const personaKey = segment.council_persona || 'musk';
    logger.info(`[COUNCIL] Reviewing seg-${id} with ${personaKey} persona (${segment.review_tier || 'tier_2'})...`);

    let councilGuidance = '';
    try {
      const review = await reviewSegment({
        segment,
        project: {
          slug: project_slug,
          name: project_name,
          amendment_path: segment.amendment_path,
        },
        personaKey,
        pool,
        withSearch: true,
        rootDir: ROOT, // enables Gemini 2.5 Pro codebase coherence lens
        reviewTier: segment.review_tier || 'tier_2',
        marketSensitive: segment.market_sensitive || false,
      });

      logger.info(formatCouncilSummary(review));

      if (review.verdict === 'STOP') {
        await markSegmentBlocked(pool, id, `Council voted STOP: ${review.guidance?.slice(0, 300)}`);
        await writePendingAdam(pool, {
          projectId: project_id,
          projectSlug: project_slug,
          title: `Council stopped: ${title}`,
          description: `The pre-build council unanimously voted to not proceed with this segment.\n\nGuidance:\n${review.guidance}\n\nReview the council perspectives and either modify the plan or override the STOP.`,
          type: 'decision',
          priority: 'normal',
          context: { segmentId: id, verdict: 'STOP', review },
        });
        return { segmentId: id, status: 'council_stop', guidance: review.guidance };
      }

      if (review.verdict === 'NEEDS_HUMAN') {
        await markSegmentBlocked(pool, id, `Council: NEEDS_HUMAN — ${review.humanReason?.slice(0, 300)}`);
        await writePendingAdam(pool, {
          projectId: project_id,
          projectSlug: project_slug,
          title: `Council needs your input: ${title}`,
          description: `The council could not reach consensus on this segment.\n\nQuestion for Adam: ${review.humanReason}\n\nFull guidance:\n${review.guidance}`,
          type: 'decision',
          priority: 'normal',
          context: { segmentId: id, verdict: 'NEEDS_HUMAN', humanReason: review.humanReason },
        });
        return { segmentId: id, status: 'council_needs_human', reason: review.humanReason };
      }

      // CAUTION: inject guidance into builder prompt
      if (review.verdict === 'CAUTION') {
        councilGuidance = `\n\nCOUNCIL GUIDANCE (read and address these):\n${review.guidance}`;
        logger.warn(`[COUNCIL] CAUTION — injecting ${councilGuidance.length} chars of guidance into prompt`);
      }

    } catch (reviewErr) {
      // Council failure never blocks the build — log and continue
      logger.warn(`[COUNCIL] Review failed (non-fatal): ${reviewErr.message} — proceeding without review`);
    }

    // Create isolated worktree
    ({ wt, br } = await createWorktree(id, slugPart));

    // Build and run prompt (with any council guidance appended)
    const prompt = buildPrompt(segment) + councilGuidance;
    logger.info(`[TASK] Spawning Claude Code for seg-${id}...`);
    const result = await spawnClaude(prompt, wt);

    const elapsedHours = parseFloat((result.elapsedMinutes / 60).toFixed(3));
    logger.info(`[TASK] seg-${id} finished in ${result.elapsedMinutes}min, exit=${result.exitCode}, tools=[${(result.toolsUsed || []).join(',')}]`);

    // Log stdout to file
    const taskLogPath = path.join(LOG_DIR, `seg-${id}-${TIMESTAMP}.log`);
    fs.writeFileSync(taskLogPath, `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`);

    // Check if agent needs human input
    if (result.stdout.includes('NEEDS_HUMAN:')) {
      const reason = result.stdout.split('NEEDS_HUMAN:').pop().split('\n')[0].trim();
      await markSegmentBlocked(pool, id, `Agent needs human: ${reason}`);
      await writePendingAdam(pool, {
        projectId: project_id,
        projectSlug: project_slug,
        title: `Builder blocked on: ${title}`,
        description: `The builder agent could not complete this task autonomously.\n\nReason: ${reason}\n\nSegment: seg-${id} in ${project_name}`,
        type: 'decision',
        priority: 'normal',
        context: { segmentId: id, projectSlug: project_slug, reason, logPath: taskLogPath },
      });
      logger.warn(`[TASK] seg-${id} blocked — needs human: ${reason}`);
      await removeWorktree(wt);
      await deleteBranch(br);
      return { segmentId: id, status: 'needs_human', reason };
    }

    // Check exit code
    if (result.exitCode !== 0) {
      const errSummary = result.stderr.slice(-500) || result.stdout.slice(-500);
      await markSegmentBlocked(pool, id, `Agent exited ${result.exitCode}: ${errSummary.slice(0, 300)}`);
      await writePendingAdam(pool, {
        projectId: project_id,
        projectSlug: project_slug,
        title: `Builder failed: ${title}`,
        description: `Claude Code exited with code ${result.exitCode} for segment seg-${id}.\n\nError:\n${errSummary}`,
        type: 'review',
        priority: 'normal',
        context: { segmentId: id, exitCode: result.exitCode, logPath: taskLogPath },
      });
      await removeWorktree(wt);
      await deleteBranch(br);
      return { segmentId: id, status: 'failed', exitCode: result.exitCode };
    }

    // Protected file enforcement — verify builder only touched allowed files
    if (segment.allowed_files && segment.allowed_files.length > 0) {
      const { stdout: diffOut } = await gitInWorktree(wt, 'diff', '--name-only', 'HEAD');
      const { stdout: untracked } = await gitInWorktree(wt, 'ls-files', '--others', '--exclude-standard');
      const changedFiles = [
        ...diffOut.split('\n').filter(Boolean),
        ...untracked.split('\n').filter(Boolean),
      ];
      const allowedSet = new Set(segment.allowed_files);
      const violations = changedFiles.filter(f => !allowedSet.has(f));

      if (violations.length > 0) {
        logger.warn(`[ENFORCE] seg-${id} wrote to ${violations.length} file(s) outside allowed_files: ${violations.join(', ')}`);
        await markSegmentBlocked(pool, id, `Protected file violation: wrote to ${violations.join(', ')}`);
        await writePendingAdam(pool, {
          projectId: project_id,
          projectSlug: project_slug,
          title: `Builder violated file boundary: ${title}`,
          description: `The builder wrote to files outside the segment's allowed_files list:\n\nViolations: ${violations.join('\n')}\n\nAllowed: ${segment.allowed_files.join('\n')}\n\nReview the changes and either approve the violations or reset the segment.`,
          type: 'review',
          priority: 'high',
          context: { segmentId: id, violations, allowedFiles: segment.allowed_files },
        });
        await removeWorktree(wt);
        await deleteBranch(br);
        return { segmentId: id, status: 'file_violation', violations };
      }
      logger.info(`[ENFORCE] seg-${id} file boundary check passed (${changedFiles.length} files, all allowed)`);
    }

    // Post-build verification gate — all checks must pass before PR
    const { stdout: jsFilesOut } = await gitInWorktree(wt, 'diff', '--name-only', 'HEAD');
    const changedJsFiles = [...jsFilesOut.split('\n').filter(f => f.endsWith('.js'))];

    const checksToRun = segment.required_checks || ['node --check'];
    const checkResults = [];
    let verificationPassed = true;

    for (const check of checksToRun) {
      try {
        if (check === 'node --check' && changedJsFiles && changedJsFiles.length > 0) {
          // Run node --check on each changed JS file
          for (const jsFile of changedJsFiles) {
            const { stdout: _out, stderr: checkErr } = await execFileAsync('node', ['--check', path.join(wt, jsFile)], { cwd: wt }).catch(e => ({ stdout: '', stderr: e.message }));
            if (checkErr) {
              checkResults.push({ check: `node --check ${jsFile}`, passed: false, output: checkErr });
              verificationPassed = false;
              logger.error(`[VERIFY] FAIL: node --check ${jsFile}: ${checkErr.slice(0, 200)}`);
            } else {
              checkResults.push({ check: `node --check ${jsFile}`, passed: true });
              logger.info(`[VERIFY] PASS: node --check ${jsFile}`);
            }
          }
        } else {
          // Run the check command as-is in the worktree
          const parts = check.split(' ');
          const { stderr: checkErr } = await execFileAsync(parts[0], parts.slice(1), { cwd: wt }).catch(e => ({ stderr: e.message }));
          const passed = !checkErr;
          checkResults.push({ check, passed, output: checkErr || '' });
          if (!passed) { verificationPassed = false; logger.error(`[VERIFY] FAIL: ${check}: ${checkErr?.slice(0, 200)}`); }
          else logger.info(`[VERIFY] PASS: ${check}`);
        }
      } catch (e) {
        checkResults.push({ check, passed: false, output: e.message });
        verificationPassed = false;
      }
    }

    if (!verificationPassed) {
      const failedChecks = checkResults.filter(c => !c.passed).map(c => c.check).join(', ');
      await markSegmentBlocked(pool, id, `Verification failed: ${failedChecks}`);
      await writePendingAdam(pool, {
        projectId: project_id,
        projectSlug: project_slug,
        title: `Build verification failed: ${title}`,
        description: `Post-build checks failed for seg-${id}:\n\n${checkResults.filter(c => !c.passed).map(c => `FAIL: ${c.check}\n${c.output?.slice(0, 200)}`).join('\n\n')}`,
        type: 'review',
        priority: 'high',
        context: { segmentId: id, checkResults },
      });
      await removeWorktree(wt);
      await deleteBranch(br);
      return { segmentId: id, status: 'verification_failed', failedChecks: checkResults.filter(c => !c.passed) };
    }
    logger.info(`[VERIFY] All ${checkResults.length} verification checks passed for seg-${id}`);

    // Commit changes
    const hadChanges = await commitWorktreeChanges(wt, title, id);

    // Open PR if there were changes
    let prUrl = null;
    if (hadChanges) {
      prUrl = await openPullRequest({
        branch: br,
        title: `[Builder] ${title}`,
        body: `## Auto-built by LifeOS Builder Supervisor\n\n**Project:** ${project_name}\n**Segment:** seg-${id}\n**Task:** ${title}\n\n${segment.description || ''}\n\n---\n🤖 Generated by LifeOS Builder Supervisor`,
      });
    }

    // Mark done
    await markSegmentDone(pool, id, project_id, elapsedHours);

    // Record build outcome and score council verdicts against it
    try {
      const outcomeRow = await pool.query(
        `INSERT INTO build_outcomes
           (segment_id, project_id, shipped_cleanly, had_regression, checks_passed, pr_url)
         VALUES ($1, $2, true, false, true, $3)
         RETURNING id`,
        [id, project_id, prUrl || null]
      );
      const outcomeId = outcomeRow.rows[0]?.id;
      if (outcomeId) {
        await scoreOutcome(pool, outcomeId, id);
      }
    } catch (_) { /* non-fatal */ }

    // Clean up worktree (branch stays for the PR)
    if (fs.existsSync(wt)) {
      try { await git('worktree', 'remove', '--force', wt); } catch (_) {}
    }

    logger.info(`[TASK] seg-${id} DONE${prUrl ? ` — PR: ${prUrl}` : ' (no file changes)'}`);
    return { segmentId: id, status: 'done', prUrl, elapsedMinutes: result.elapsedMinutes };

  } catch (err) {
    logger.error(`[TASK] seg-${id} threw: ${err.message}`);

    try { await markSegmentBlocked(pool, id, err.message.slice(0, 300)); } catch (_) {}
    try {
      await writePendingAdam(pool, {
        projectId: project_id,
        projectSlug: project_slug,
        title: `Builder error: ${title}`,
        description: `Unexpected error in builder supervisor for seg-${id}:\n${err.message}`,
        type: 'review',
        priority: 'normal',
        context: { segmentId: id, error: err.message },
      });
    } catch (_) {}

    if (wt && fs.existsSync(wt)) {
      try { await git('worktree', 'remove', '--force', wt); } catch (_) {}
    }
    if (br) {
      try { await deleteBranch(br); } catch (_) {}
    }

    return { segmentId: id, status: 'error', error: err.message };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  ensureDir(LOG_DIR);
  logger.info('══════════════════════════════════════════════════');
  logger.info('  LifeOS Builder Supervisor starting');
  logger.info(`  max-concurrent=${MAX_CONCURRENT} | max-turns=${MAX_TURNS} | dry-run=${DRY_RUN}`);
  if (projectFilter) logger.info(`  project-filter=${projectFilter}`);
  logger.info('══════════════════════════════════════════════════');

  // Safety gates
  try {
    assertSafeToRun();
  } catch (e) {
    logger.warn(`[SAFETY] ${e.message} — exiting cleanly`);
    process.exit(0);
  }

  const pool = createPool();

  try {
    const segments = await fetchPendingSegments(pool);
    if (segments.length === 0) {
      logger.info('[MAIN] No safe pending segments found — nothing to do');
      logger.info('[MAIN] Hint: projects must have build_ready=TRUE to be picked up.');
      logger.info('[MAIN] See docs/projects/AMENDMENT_READINESS_CHECKLIST.md to qualify a project,');
      logger.info('[MAIN] then call POST /api/v1/projects/:slug/readiness/mark-ready');
      return;
    }

    logger.info(`[MAIN] Found ${segments.length} pending segment(s)`);

    // Process in batches of MAX_CONCURRENT
    const results = [];
    for (let i = 0; i < segments.length; i += MAX_CONCURRENT) {
      const batch = segments.slice(i, i + MAX_CONCURRENT);
      logger.info(`[MAIN] Running batch ${Math.floor(i / MAX_CONCURRENT) + 1}: ${batch.map(s => `seg-${s.id}`).join(', ')}`);
      const batchResults = await Promise.all(batch.map(seg => processSegment(pool, seg)));
      results.push(...batchResults);
    }

    // Summary
    const done    = results.filter(r => r.status === 'done').length;
    const blocked = results.filter(r => r.status === 'needs_human' || r.status === 'blocked').length;
    const failed  = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    logger.info('══════════════════════════════════════════════════');
    logger.info(`  DONE: ${done}  |  NEEDS HUMAN: ${blocked}  |  FAILED: ${failed}`);
    logger.info(`  Log: ${LOG_FILE}`);
    logger.info('══════════════════════════════════════════════════');

    // Save summary for API to read
    const summaryPath = path.join(ROOT, 'scripts', 'autonomy', 'last-supervisor-run.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      runAt: new Date().toISOString(),
      dryRun: DRY_RUN,
      projectFilter,
      totalSegments: segments.length,
      done, blocked, failed,
      results,
      logFile: LOG_FILE,
    }, null, 2));

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  logger.error(`[MAIN] Fatal: ${err.message}`);
  process.exit(1);
});
