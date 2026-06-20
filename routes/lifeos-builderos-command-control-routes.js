// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT } from '../factory-staging/factory-core/builder/run-step.js';
import { verifyToken } from '../services/lifeos-auth.js';
import {
  createCommandControlJob,
  getCommandControlJob,
  listCommandControlJobs,
  cancelCommandControlJob,
  setCommandControlHalt,
  getCommandControlHaltState,
  updateCommandControlJobExecution,
} from '../services/builderos-command-control-service.js';
import { executeCommandControlJob } from '../services/builderos-governed-loop-executor.js';

export function createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey }) {
  const router = express.Router();

  const EXECUTE_ALLOWED_ROLES = new Set(['founder_admin', 'operator', 'admin']);

  function getForwardedOperatorKey(req) {
    return req.headers['x-command-key']
      || req.headers['x-command-center-key']
      || req.headers['x-lifeos-key']
      || req.headers['x-api-key']
      || null;
  }

  function readCookie(req, name) {
    const raw = String(req.headers.cookie || '');
    if (!raw) return '';
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const [k, ...rest] = pair.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return '';
  }

  function getTokenFromRequest(req) {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
    const alt = String(req.headers['x-lifeos-token'] || '').trim();
    if (alt) return alt;
    return readCookie(req, 'lifeos_access_token');
  }

  function keyFallbackAllowed() {
    return process.env.NODE_ENV !== 'production'
      || String(process.env.FOUNDER_INTERFACE_ALLOW_KEY_FALLBACK || '').toLowerCase() === 'true';
  }

  function requireFounderInterfaceAuth(req, res, next) {
    const token = getTokenFromRequest(req);
    if (token) {
      try {
        req.lifeosUser = verifyToken(token);
        req.auth_mode = 'account_jwt';
        return next();
      } catch (error) {
        return res.status(401).json({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          reason: 'AUTH_INVALID_TOKEN',
          error: error.message,
        });
      }
    }

    const fallbackAllowed = keyFallbackAllowed();
    if (fallbackAllowed && requireKey) {
      return requireKey(req, res, () => {
        req.lifeosUser = {
          sub: 'emergency-key',
          handle: 'emergency_key_operator',
          role: 'founder_admin',
          tier: 'core',
        };
        req.auth_mode = 'command_key_fallback';
        next();
      });
    }

    return res.status(401).json({
      ok: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      reason: 'AUTH_REQUIRED',
      error: 'Login required for Founder Interface',
      redirect: '/overlay/lifeos-login.html?next=%2Flifeos%3Fdirect_system%3D1',
    });
  }

  function requireExecuteRole(req, res, next) {
    const role = String(req.lifeosUser?.role || '').toLowerCase();
    if (!EXECUTE_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({
        ok: false,
        pass_fail: 'FAIL',
        command_truth: 'NO_COMMAND_RAN',
        reason: 'ROLE_FORBIDDEN_EXECUTE',
        error: `Role ${role || 'unknown'} cannot execute BuilderOS commands`,
      });
    }
    next();
  }

  function buildFounderIntakeCommand({ text, textFile, stage, missionId, force }) {
    const script = path.join(REPO_ROOT, 'scripts', 'run-founder-intake-direct.mjs');
    const args = [script];
    if (text) args.push('--text', String(text));
    if (textFile) args.push('--text-file', String(textFile));
    if (stage) args.push('--stage', String(stage));
    if (missionId) args.push('--mission-id', String(missionId));
    if (force === true) args.push('--force');
    return {
      command: process.execPath,
      args,
      pretty: `${process.execPath} ${args.map((a) => JSON.stringify(a)).join(' ')}`,
    };
  }

  function parseBridgeStdout(stdout) {
    const text = String(stdout || '').trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // best effort: parse final JSON object from noisy output
      const idx = text.lastIndexOf('\n{');
      if (idx >= 0) {
        try {
          return JSON.parse(text.slice(idx + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  function summarizeBridgeResult({ exitCode, parsed, commandRan }) {
    if (!commandRan) {
      return {
        status: 'FAIL',
        reason: 'NO_COMMAND_RAN',
        human_summary: 'No terminal command was executed.',
      };
    }
    if (!parsed) {
      return {
        status: 'FAIL',
        reason: 'NO_RECEIPT',
        human_summary: 'Command ran but no parseable receipt JSON was produced.',
      };
    }
    const ok = exitCode === 0 && parsed.ok === true;
    if (!ok) {
      return {
        status: 'FAIL',
        reason: parsed.first_blocker || 'COMMAND_FAILED',
        human_summary: parsed.first_blocker
          ? `BuilderOS failed at first blocker: ${parsed.first_blocker}`
          : 'BuilderOS command failed.',
      };
    }
    return {
      status: 'PASS',
      reason: null,
      human_summary: `BuilderOS ${parsed.stage || 'development'} path passed for ${parsed.mission_id}.`,
    };
  }

  async function buildDisplayBundle({ scope = 'overview', missionId = null }) {
    const jobs = pool ? await listCommandControlJobs(pool, { limit: 20 }) : [];
    const haltState = pool ? await getCommandControlHaltState(pool) : null;
    const scoped = String(scope || 'overview').toLowerCase();
    const missionJobs = missionId
      ? jobs.filter((job) => String(job.instruction || '').includes(String(missionId)))
      : [];
    return {
      scope: scoped,
      mission_id: missionId || null,
      halt_state: haltState,
      recent_jobs: jobs,
      mission_jobs: missionJobs,
      queue_summary: {
        queued: jobs.filter((j) => j.status === 'queued').length,
        running: jobs.filter((j) => j.status === 'running').length,
        blocked: jobs.filter((j) => j.status === 'blocked').length,
        failed: jobs.filter((j) => j.status === 'failed').length,
        done: jobs.filter((j) => j.status === 'done').length,
      },
    };
  }

  function summarizeDisplayRequest(text = '') {
    const t = String(text || '').toLowerCase();
    if (/\b(queue|jobs|backlog|status)\b/.test(t)) return 'queue';
    if (/\b(blocker|fail|failed)\b/.test(t)) return 'blockers';
    if (/\breceipt|artifact|path\b/.test(t)) return 'receipts';
    return 'overview';
  }

  function hasHandoffStructure(text = '') {
    const t = String(text || '');
    const requiredMarkers = [
      /problem:/i,
      /desired outcome:/i,
      /scope boundary:/i,
      /success metric:/i,
      /failure metric:/i,
      /constraints:/i,
      /founder success test:/i,
    ];
    let found = 0;
    for (const marker of requiredMarkers) {
      if (marker.test(t)) found += 1;
    }
    return found >= 3;
  }

  function isLikelyExecuteIntent(text = '') {
    return /\b(add|change|update|modify|edit|fix|remove|create|implement|wire|route|redirect|patch|refactor|build|ship)\b/i
      .test(String(text || ''));
  }

  function normalizeFounderExecuteIntent(text = '') {
    const clean = String(text || '').trim();
    if (!clean) return '';
    if (hasHandoffStructure(clean)) return clean;
    if (!isLikelyExecuteIntent(clean)) return clean;
    return [
      'Problem:',
      clean,
      '',
      'Desired Outcome:',
      clean,
      '',
      'Scope Boundary:',
      'Only the minimum files required to complete this exact request.',
      '',
      'Constraints:',
      '- No theater, no simulation, no fake success',
      '- Keep behavior fail-closed and reversible where possible',
      '',
      'Success Metric:',
      'Requested change is visible/real in the live target surface or endpoint.',
      '',
      'Failure Metric:',
      'No real change, or missing execution evidence/receipts.',
      '',
      'Unacceptable Result:',
      'Claiming completion without runtime-verifiable evidence.',
      '',
      'Founder Success Test:',
      'Founder can verify the requested change directly in the app/runtime.',
      '',
      'Acceptance Command:',
      'Return command_truth, pass_fail, exit_code, commit_sha, changed_files, receipt_paths, first_blocker.',
    ].join('\n');
  }

  async function runTerminalBridgeIntake({ text, textFile, stage, missionId, force }) {
    const cmd = buildFounderIntakeCommand({
      text: text || null,
      textFile: textFile || null,
      stage,
      missionId,
      force,
    });

    const startedAt = Date.now();
    const child = spawn(cmd.command, cmd.args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let commandRan = true;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      commandRan = false;
      stderr += `\n${err.message}`;
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', (code) => resolve(Number.isInteger(code) ? code : 1));
    });
    const parsed = parseBridgeStdout(stdout);
    const summary = summarizeBridgeResult({ exitCode, parsed, commandRan });
    const receiptPaths = [];
    const artifactPaths = [];
    if (parsed?.entrypoint_receipt_path) receiptPaths.push(parsed.entrypoint_receipt_path);
    if (parsed?.pre_handoff_report_path) receiptPaths.push(parsed.pre_handoff_report_path);
    if (parsed?.chair_handoff_receipt_path) receiptPaths.push(parsed.chair_handoff_receipt_path);
    if (parsed?.founder_packet_path) artifactPaths.push(parsed.founder_packet_path);
    if (parsed?.intent_baseline_path) artifactPaths.push(parsed.intent_baseline_path);

    return {
      ok: summary.status === 'PASS',
      status: summary.status,
      reason: summary.reason,
      command_ran: commandRan,
      command_truth: commandRan ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
      command_executed: cmd.pretty,
      exit_code: exitCode,
      duration_ms: Date.now() - startedAt,
      pass_fail: summary.status,
      first_blocker: parsed?.first_blocker || summary.reason || null,
      mission_id: parsed?.mission_id || null,
      mission_folder: parsed?.mission_folder || null,
      receipt_paths: receiptPaths,
      artifact_paths: artifactPaths,
      receipt_truth: receiptPaths.length > 0 ? 'RECEIPT_PRESENT' : 'NO_RECEIPT',
      human_summary: summary.human_summary,
      stdout,
      stderr,
      parsed_output: parsed,
    };
  }

  router.post('/jobs', requireKey, async (req, res, next) => {
    try {
      const job = await createCommandControlJob(pool, req.body || {});
      res.status(201).json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs', requireKey, async (req, res, next) => {
    try {
      const jobs = await listCommandControlJobs(pool, {
        limit: req.query.limit,
        status: req.query.status,
      });
      res.json({ ok: true, jobs });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs/:id', requireKey, async (req, res, next) => {
    try {
      const job = await getCommandControlJob(pool, req.params.id);
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/jobs/:id/cancel', requireKey, async (req, res, next) => {
    try {
      const job = await cancelCommandControlJob(pool, req.params.id, req.body || {});
      if (!job) return res.status(409).json({ ok: false, error: 'job_not_cancellable' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/jobs/:id/execute', requireKey, async (req, res, next) => {
    try {
      const jobId = req.params.id;
      const existing = await getCommandControlJob(pool, jobId);
      if (!existing) return res.status(404).json({ ok: false, error: 'job_not_found' });
      if (existing.status !== 'queued') {
        return res.status(409).json({ ok: false, error: 'job_not_executable', job_status: existing.status });
      }

      // Return immediately — Railway/proxy 502s when execute holds connection through full /build.
      res.status(202).json({
        ok: true,
        accepted: true,
        job_id: jobId,
        poll_url: `/api/v1/lifeos/builderos/command-control/jobs/${jobId}`,
      });

      setImmediate(async () => {
        try {
          await executeCommandControlJob(pool, jobId, {
            baseUrl: req.body?.base_url,
            commandKey: getForwardedOperatorKey(req),
          });
        } catch (error) {
          console.error('[command-control] async execute failed for job', jobId, error?.message);
          try {
            await updateCommandControlJobExecution(pool, jobId, {
              status: 'failed',
              blocker: error?.message || 'EXECUTE_ASYNC_CRASH',
            });
          } catch {
            // best-effort
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/halt', requireKey, async (req, res, next) => {
    try {
      const haltState = await setCommandControlHalt(pool, req.body || {});
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  router.get('/halt', requireKey, async (_req, res, next) => {
    try {
      const haltState = await getCommandControlHaltState(pool);
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  router.post('/terminal-bridge/intake', requireFounderInterfaceAuth, requireExecuteRole, async (req, res, next) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const textFile = typeof req.body?.text_file === 'string' ? req.body.text_file.trim() : '';
      const stage = String(req.body?.stage || 'development').toLowerCase();
      const missionId = req.body?.mission_id ? String(req.body.mission_id) : null;
      const force = req.body?.force === true;

      if (!text && !textFile) {
        return res.status(400).json({
          ok: false,
          status: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'text or text_file is required',
        });
      }
      if (!['development', 'system'].includes(stage)) {
        return res.status(400).json({
          ok: false,
          status: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'stage must be development or system',
        });
      }

      const result = await runTerminalBridgeIntake({
        text,
        textFile,
        stage,
        missionId,
        force,
      });
      res.status(200).json({
        auth_mode: req.auth_mode || 'unknown',
        user_role: req.lifeosUser?.role || null,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/founder-interface/message', requireFounderInterfaceAuth, async (req, res, next) => {
    try {
      const originalText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const stage = String(req.body?.stage || 'development').toLowerCase();
      const missionId = req.body?.mission_id ? String(req.body.mission_id) : null;
      const force = req.body?.force === true;
      const dictateThenSend = req.body?.dictate_then_send === true;
      const conversationalMode = req.body?.conversational_mode !== false;
      const sourceMode = String(req.body?.source_mode || 'text').toLowerCase();
      const action = String(req.body?.action || 'auto').toLowerCase();

      if (!originalText && !req.body?.text_file) {
        return res.status(400).json({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          reason: 'NO_COMMAND_RAN',
          error: 'text or text_file is required',
        });
      }

      const inferredDisplayScope = summarizeDisplayRequest(originalText);
      const executeIntent = isLikelyExecuteIntent(originalText);
      const shouldDisplayOnly = action === 'display'
        || (action === 'auto'
          && !executeIntent
          && /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt)\b/i.test(originalText));
      const normalizedText = shouldDisplayOnly ? originalText : normalizeFounderExecuteIntent(originalText);
      const intakeNormalized = normalizedText !== originalText;

      if (!shouldDisplayOnly) {
        const role = String(req.lifeosUser?.role || '').toLowerCase();
        if (!EXECUTE_ALLOWED_ROLES.has(role)) {
          return res.status(403).json({
            ok: false,
            interface: 'LifeOS Founder Interface',
            action: 'execute',
            command_truth: 'NO_COMMAND_RAN',
            pass_fail: 'FAIL',
            reason: 'ROLE_FORBIDDEN_EXECUTE',
            error: `Role ${role || 'unknown'} cannot execute BuilderOS commands`,
            auth_mode: req.auth_mode || 'unknown',
            user_role: req.lifeosUser?.role || null,
          });
        }
      }

      const modelRouting = {
        route: shouldDisplayOnly ? 'cheap_display_path' : 'execution_path',
        complexity: shouldDisplayOnly ? 'low' : 'high',
        estimated_cost_tier: shouldDisplayOnly ? 'cheap' : 'medium',
      };

      if (shouldDisplayOnly) {
        const displayBundle = await buildDisplayBundle({
          scope: req.body?.display_scope || inferredDisplayScope,
          missionId,
        });
        return res.status(200).json({
          ok: true,
          interface: 'LifeOS Founder Interface',
          action: 'display',
          source_mode: sourceMode,
          dictate_then_send: dictateThenSend,
          conversational_mode: conversationalMode,
          model_routing: modelRouting,
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'NO_COMMAND_RAN',
          reason: 'Display request only; no BuilderOS execution requested.',
          command_executed: null,
          exit_code: null,
          receipt_truth: 'NO_RECEIPT',
          receipt_paths: [],
          artifact_paths: [],
          first_blocker: null,
          human_summary: `Rendered ${displayBundle.scope} display from live system data.`,
          display: displayBundle,
          auth_mode: req.auth_mode || 'unknown',
          user_role: req.lifeosUser?.role || null,
          intake_normalized: false,
        });
      }

      if (!['development', 'system'].includes(stage)) {
        return res.status(400).json({
          ok: false,
          interface: 'LifeOS Founder Interface',
          action: 'execute',
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'stage must be development or system',
        });
      }

      const result = await runTerminalBridgeIntake({
        text: normalizedText,
        textFile: req.body?.text_file || null,
        stage,
        missionId,
        force,
      });
      return res.status(200).json({
        interface: 'LifeOS Founder Interface',
        action: 'execute',
        source_mode: sourceMode,
        dictate_then_send: dictateThenSend,
        conversational_mode: conversationalMode,
        model_routing: modelRouting,
        auth_mode: req.auth_mode || 'unknown',
        user_role: req.lifeosUser?.role || null,
        intake_normalized: intakeNormalized,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
