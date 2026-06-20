// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import { buildContextForPrompt, storeMemory } from '../core/memory-system.js';
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

export function createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  const EXECUTE_ALLOWED_ROLES = new Set(['founder_admin', 'operator', 'admin']);

  async function normalizeInputText(rawText) {
    if (typeof callCouncilMember !== 'function') return rawText;
    if (!rawText || rawText.trim().length < 3) return rawText;
    try {
      const response = await callCouncilMember(
        'gemini',
        `You are an input normalizer for a voice-first personal operating system called LifeOS.
The founder speaks or types commands — often with misspellings, voice-to-text errors, autocorrect mistakes, dropped words, or garbled phrasing.

Your job: figure out what they meant and rewrite it as a clean, clear English request.

Rules:
- Fix spelling, grammar, voice-to-text artifacts (e.g. "wanna" → "want to", "teh" → "the", "hwo" → "how")
- Preserve the original intent exactly — do not add, invent, or change what was asked
- If the input is already clean, return it unchanged
- Output ONLY the cleaned text. No explanation, no prefix, no quotes.

Input: ${rawText}`,
        { maxTokens: 300, taskType: 'chat' }
      );
      const cleaned = typeof response === 'string'
        ? response
        : response?.content || response?.text || null;
      return cleaned ? String(cleaned).trim() : rawText;
    } catch {
      return rawText;
    }
  }

  async function translateToPlainEnglish(originalText, result) {
    if (typeof callCouncilMember !== 'function') return null;
    try {
      const systemContext = [
        result.pass_fail === 'NO_COMMAND_RAN' ? `Status: No command was run. This was a read/display request.` : `Status: ${result.pass_fail}`,
        result.first_blocker ? `Blocker hit: ${result.first_blocker}` : '',
        result.human_summary ? `System summary: ${result.human_summary}` : '',
        result.display ? `Live data was returned: jobs=${result.display.recent_jobs?.length ?? 0}, halted=${result.display.halt_state?.halted ?? false}` : '',
      ].filter(Boolean).join('\n');

      const translationPrompt = `You are the plain-English voice of LifeOS, a personal operating system for the founder Adam.
The founder just sent this message to the system: "${originalText}"

Here is what the system actually did:
${systemContext}

Write 1-3 sentences in plain, direct English explaining exactly what happened and what it means for Adam.
Rules:
- Never lie. If it failed, say it failed and why in simple terms.
- If it succeeded, say what was done.
- If it was a status/display request, summarize the key info.
- Use plain English. No jargon. No "BuilderOS", "SNT", "receipt_paths". Say what it means in human terms.
- If blocked by a review step: explain that the system requires a formal approval process for changes, and plain-English questions work fine but build commands go through a gate.
- Be honest. Be brief.`;
      const response = await callCouncilMember('gemini', translationPrompt, { maxTokens: 200, taskType: 'chat' });

      const text = typeof response === 'string'
        ? response
        : response?.content || response?.text || response?.message || null;
      return text ? String(text).trim().slice(0, 600) : null;
    } catch {
      return null;
    }
  }

  function isBuildRequest(text) {
    return /\b(fix|change|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor)\b/i.test(text);
  }

  function isDisplayRequest(text) {
    return /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt|how many|what is|what are|list|count|tell me)\b/i.test(text);
  }

  async function luminConverse(userMessage) {
    if (typeof callCouncilMember !== 'function') return null;
    try {
      // Load live memory context — facts, goals, profile, recent history
      let memoryContext = '';
      try {
        const ctx = await buildContextForPrompt();
        if (ctx && typeof ctx === 'object') {
          const parts = [];
          // Load the doctrine/directive facts first (highest confidence)
          if (ctx.recent_facts?.length) {
            const doctrineFacts = ctx.recent_facts
              .filter(f => f?.content?.type && ['lumin_doctrine', 'lumin_doctrine_wisdom', 'founder_directive'].includes(f.content.type))
              .slice(0, 2);
            const systemFacts = ctx.recent_facts
              .filter(f => f?.content?.type === 'system_foundation')
              .slice(0, 1);
            const allFacts = [...doctrineFacts, ...systemFacts];
            if (allFacts.length) {
              const factTexts = allFacts.map(f => {
                const text = f?.content?.content || (typeof f?.content === 'string' ? f.content : null);
                return text ? String(text).slice(0, 800) : null;
              }).filter(Boolean);
              if (factTexts.length) parts.push(`What I know from memory:\n${factTexts.join('\n---\n')}`);
            }
          }
          if (ctx.goals?.length) {
            const goalTitles = ctx.goals.slice(0,3).map(g => g?.content?.title || g?.content).filter(Boolean);
            if (goalTitles.length) parts.push(`Active goals: ${goalTitles.join('; ')}`);
          }
          memoryContext = parts.join('\n\n');
        }
      } catch { /* memory load failure is non-fatal */ }

      const doctrine = `LUMIN DOCTRINE (canonical — 2026-06-20):
You are Lumin — the AI operating intelligence layer inside LifeOS/BuilderOS.
LifeOS is Adam's cockpit. BuilderOS is the execution engine. You are the intelligence that connects them.
You are NOT a chatbot. You are NOT performing role costumes.

You must have and use:
1. Conversational ability — real conversation, brainstorming, counsel
2. Memory — loaded before this response, saved after
3. Access to SSOTs, amendments, missions, receipts, and history
4. Real role context when asked — not roleplay
5. Permissioned ability to act through BuilderOS
6. Receipt-backed proof when you act

ROLE RULE: If Adam asks you to think as Chair, CFO, Sentry, Wisdom, Architect, or Builder —
you must load that role's actual authority/context/rules, inspect real system evidence, and produce
a real artifact, recommendation, blocker, or receipt. Never pretend. If you cannot load the real
context, say so and explain what is missing.

HONESTY CONTRACT:
- For pure conversation (no system action): just talk. Do NOT write "NO_COMMAND_RAN" in your response text. That is handled by the system metadata layer, not by you.
- If you take a real system action: say clearly what you did and what the result was.
- If uncertain: say "uncertain" explicitly.
- Predictions about Adam: label as "Prediction:" — never state as Adam's confirmed decision.

ADAM DIGITAL TWIN: You are building a model of Adam over time. You should predict what Adam would
likely think, choose, reject, or approve — always labeled as "Prediction:" — and compare predictions
to actual outcomes to improve. Goal: reduce repeated explanations, prevent drift, protect Adam's time.`;

      const systemPrompt = `${doctrine}

${memoryContext ? `LOADED MEMORY:\n${memoryContext}\n` : ''}
Adam is the founder. This is a real conversation. Be direct, honest, and useful.
Do not deflect. Do not over-route. Answer questions. Brainstorm when asked. Give real counsel.
Never be sycophantic. Never lie. Keep responses concise unless depth is requested.`;

      const response = await callCouncilMember('gemini', `${systemPrompt}\n\nAdam: ${userMessage}`, {
        maxTokens: 800,
        taskType: 'chat',
      });
      const text = typeof response === 'string'
        ? response
        : response?.content || response?.text || null;
      if (!text) return null;
      const reply = String(text).trim();

      // Save this exchange to conversation memory (non-blocking)
      storeMemory('conversation_history', {
        user: userMessage,
        lumin: reply,
        timestamp: new Date().toISOString(),
      }, { confidence: 0.8 }).catch(() => {});

      return reply;
    } catch {
      return null;
    }
  }

  async function routeToBuilder(task, commandKey) {
    const base = process.env.PUBLIC_BASE_URL
      ? process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
      : `http://localhost:${process.env.PORT || 3000}`;
    const headers = { 'Content-Type': 'application/json', 'x-command-key': commandKey };
    try {
      const taskRes = await fetch(`${base}/api/v1/lifeos/builder/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ task, mode: 'code' }),
      });
      const taskJson = await taskRes.json();
      if (!taskJson.ok || !taskJson.output) {
        return { ok: false, human_summary: null, error: taskJson.error || 'Builder task returned no output.' };
      }
      const execRes = await fetch(`${base}/api/v1/lifeos/builder/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          output: taskJson.output,
          target_file: taskJson.target_file || taskJson.placement?.target_file || null,
          commit_message: `[system-build] ${task.slice(0, 80)}`,
        }),
      });
      const execJson = await execRes.json();
      return {
        ok: execJson.ok === true,
        committed: execJson.committed === true,
        sha: execJson.sha || null,
        human_summary: null,
        pass_fail: execJson.ok ? 'PASS' : 'FAIL',
        first_blocker: execJson.error || null,
      };
    } catch (err) {
      return { ok: false, human_summary: null, error: err.message };
    }
  }

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
    // x-command-key (COMMAND_CENTER_KEY) is the master founder key — always sufficient
    return true;
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
      const stage = String(req.body?.stage || 'system').toLowerCase();
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
      const stage = String(req.body?.stage || 'system').toLowerCase();
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

      // Normalize input first: fix misspellings, voice-to-text errors, garbled phrasing
      const cleanedInput = await normalizeInputText(originalText);
      const inputWasCleaned = cleanedInput !== originalText;

      const inferredDisplayScope = summarizeDisplayRequest(cleanedInput);
      const executeIntent = isLikelyExecuteIntent(cleanedInput);
      const shouldDisplayOnly = action === 'display'
        || (action === 'auto'
          && !executeIntent
          && /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt)\b/i.test(cleanedInput));
      const normalizedText = shouldDisplayOnly ? cleanedInput : normalizeFounderExecuteIntent(cleanedInput);
      const intakeNormalized = inputWasCleaned || normalizedText !== cleanedInput;

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
        const displayResult = {
          pass_fail: 'NO_COMMAND_RAN',
          first_blocker: null,
          human_summary: `Rendered ${displayBundle.scope} display from live system data.`,
          display: displayBundle,
        };
        const plainEnglish = await translateToPlainEnglish(cleanedInput, displayResult);
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
          human_summary: plainEnglish || displayResult.human_summary,
          display: displayBundle,
          auth_mode: req.auth_mode || 'unknown',
          user_role: req.lifeosUser?.role || null,
          intake_normalized: false,
        });
      }

      // Route build/fix/change requests directly to the builder — same channel the system uses
      if (isBuildRequest(cleanedInput)) {
        const operatorKey = getForwardedOperatorKey(req)
          || process.env.COMMAND_CENTER_KEY
          || process.env.LIFEOS_KEY
          || process.env.API_KEY;
        if (operatorKey) {
          const builderResult = await routeToBuilder(cleanedInput, operatorKey);
          const plainEnglish = await translateToPlainEnglish(cleanedInput, {
            pass_fail: builderResult.ok ? 'PASS' : 'FAIL',
            first_blocker: builderResult.error || null,
            human_summary: builderResult.ok
              ? `Builder completed the task and committed the change.`
              : `Builder could not complete the task: ${builderResult.error || 'unknown error'}`,
          });
          return res.status(200).json({
            ok: builderResult.ok,
            interface: 'LifeOS Founder Interface',
            action: 'build',
            command_truth: builderResult.committed ? 'COMMITTED' : 'BUILD_ATTEMPTED',
            pass_fail: builderResult.ok ? 'PASS' : 'FAIL',
            sha: builderResult.sha || null,
            first_blocker: builderResult.error || null,
            human_summary: plainEnglish || (builderResult.ok ? 'Done — the change was made and deployed.' : `Could not complete: ${builderResult.error || 'builder error'}`),
            auth_mode: req.auth_mode || 'unknown',
            intake_normalized: intakeNormalized,
          });
        }
      }

      // Default: Lumin conversation — brainstorm, questions, counsel, information
      // BuilderOS terminal bridge is last resort only for structured execution commands
      const luminReply = await luminConverse(cleanedInput, getForwardedOperatorKey(req) || process.env.COMMAND_CENTER_KEY);
      if (luminReply) {
        return res.status(200).json({
          ok: true,
          interface: 'LifeOS Founder Interface',
          action: 'conversation',
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'PASS',
          human_summary: luminReply,
          auth_mode: req.auth_mode || 'unknown',
          intake_normalized: intakeNormalized,
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
      const plainEnglish = await translateToPlainEnglish(cleanedInput, result);
      return res.status(200).json({
        interface: 'LifeOS Founder Interface',
        action: 'execute',
        source_mode: sourceMode,
        dictate_then_send: dictateThenSend,
        conversational_mode: conversationalMode,
        model_routing: modelRouting,
        auth_mode: req.auth_mode || 'unknown',
        user_role: req.lifeosUser?.role || null,
        execution_path: 'terminal_bridge',
        intake_normalized: intakeNormalized,
        ...result,
        human_summary: plainEnglish || result.human_summary,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
