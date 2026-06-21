// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import { buildContextForPrompt, storeMemory } from '../core/memory-system.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT } from '../factory-staging/factory-core/builder/run-step.js';
import { verifyToken } from '../services/lifeos-auth.js';
import { createLifeOSLumin } from '../services/lifeos-lumin.js';
import { resolveLifeOSUserId } from '../services/lifeos-user-resolver.js';
import { enforceExecutionTruth, formatExecutionTruthReply, sanitizeConversationReply } from '../services/lifeos-execution-truth.js';
import {
  extractPriorBuildTask,
  isRepairContinuationIntent,
  resolveFounderBuildTarget,
} from '../services/builder-instruction-target.js';
import { runFounderBuildWithSelfRepair } from '../services/founder-build-self-repair.js';
import {
  isMissionPipelineIntent,
  extractMissionIdFromText,
  runFoundationPipelineForFounder,
} from '../services/lifeos-mission-pipeline-executor.js';
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
  const luminPersist = pool
    ? createLifeOSLumin({ pool, callAI: null, logger: { info: () => {}, error: () => {}, warn: () => {} } })
    : null;

  const EXECUTE_ALLOWED_ROLES = new Set(['founder_admin', 'operator', 'admin']);

  async function persistFounderTurn(req, userMessage, replyText) {
    const reply = String(replyText || '').trim();
    if (!reply) return null;
    if (!luminPersist) return 'HISTORY_NOT_SAVED';
    try {
      let userId = null;
      const sub = req.lifeosUser?.sub;
      if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
        userId = parseInt(sub, 10);
      }
      if (!userId) {
        const handle = req.auth_mode === 'command_key_fallback'
          ? 'adam'
          : (req.lifeosUser?.handle || 'adam');
        userId = await resolveLifeOSUserId(pool, handle);
      }
      if (!userId) return 'HISTORY_NOT_SAVED';
      const thread = await luminPersist.getOrCreateDefaultThread(userId);
      await luminPersist.recordExchange(thread.id, userId, userMessage, reply);
      return null;
    } catch {
      return 'HISTORY_NOT_SAVED';
    }
  }

  async function resolveBuildTaskForFounder(req, cleanedInput) {
    if (!isRepairContinuationIntent(cleanedInput)) return cleanedInput;
    if (!luminPersist || !pool) return cleanedInput;
    try {
      let userId = null;
      const sub = req.lifeosUser?.sub;
      if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
        userId = parseInt(sub, 10);
      }
      if (!userId) {
        const handle = req.auth_mode === 'command_key_fallback'
          ? 'adam'
          : (req.lifeosUser?.handle || 'adam');
        userId = await resolveLifeOSUserId(pool, handle);
      }
      if (!userId) return cleanedInput;
      const thread = await luminPersist.getOrCreateDefaultThread(userId);
      const messages = await luminPersist.getMessages(thread.id, { limit: 24 });
      const prior = extractPriorBuildTask(messages, cleanedInput);
      if (prior) {
        return `${prior}\n\n[system: founder requested continue repair — never-stop until PASS or new blocker]`;
      }
    } catch {
      /* fail-open — use current text */
    }
    return cleanedInput;
  }

  function wrapBridgeResultAsTruth(result, task) {
    const hasCommit = result.committed === true || Boolean(result.sha || result.commit_sha);
    return enforceExecutionTruth({
      ok: result.pass_fail === 'PASS' || result.ok === true,
      committed: hasCommit,
      target_file: result.target_file || result.changed_files?.[0] || null,
      sha: result.sha || result.commit_sha || null,
      first_blocker: result.first_blocker || result.error || result.reason || null,
      execution_path: 'terminal_bridge',
      task_meta: { output_bytes: 0 },
      ...result,
    }, { action: 'execute', task });
  }

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
      return text ? String(text).trim().slice(0, 1200) : null;
    } catch {
      return null;
    }
  }

  function isExplicitExecuteCommand(text = '') {
    const t = String(text || '').trim();
    if (!t) return false;
    if (/^\s*(execute|run|go|ship)\s*[.!]?\s*$/i.test(t)) return true;
    return /\b(execute it|do it now|run it now|ship it|go ahead|make it happen|just do it|execute that|run that|do that now|get it done|execute this)\b/i.test(t);
  }

  function inferTargetFileFromTask(task = '') {
    return resolveFounderBuildTarget(task);
  }

  function buildBuildFailureReceipt(task, taskJson, execJson) {
    const blocker = execJson?.error || taskJson?.error || 'Builder failed with no error detail';
    let lesson = 'The build path ran but did not produce a committable change.';
    let fix = 'Retry with a smaller scope: name the exact file and the one change you want.';

    if (/target_file is required|target_file not in placement/i.test(blocker)) {
      lesson = 'Build reached execute without target_file — system should auto-infer UI surface and retry (never-stop).';
      const inferred = resolveFounderBuildTarget(task);
      fix = inferred
        ? `System will retry with target_file: ${inferred}. If you still see this, say "keep trying".`
        : 'Name target_file in the ask (e.g. public/overlay/lifeos-app.html) or say "keep trying" to resume.';
    } else if (/too short|truncated/i.test(blocker)) {
      lesson = 'Builder output was too short for the target file — commit was correctly refused to avoid corrupting live UI.';
      fix = 'Scope to a minimal patch (one CSS block, one function, one label) instead of rewriting a large HTML file.';
    } else if (/prose refusal|not code/i.test(blocker)) {
      lesson = 'Builder returned prose instead of code — usually means the target file was not injected into the prompt.';
      fix = 'Retry the same GAP-FILL prompt; founder-interface now auto-injects files[] when target_file is named.';
    } else if (taskJson?.cache_hit) {
      lesson = 'Builder returned cached stale output instead of fresh code for this task.';
      fix = 'System now disables cache on build route; retry the same request.';
    } else if (/blueprint|gate|forbidden|SNT/i.test(blocker)) {
      lesson = 'A governance gate blocked the change before commit.';
      fix = 'Ask for status of the blocker, or narrow scope to a GAP-FILL patch with explicit target_file.';
    } else if (!taskJson?.target_file && inferTargetFileFromTask(task)) {
      lesson = 'Large overlay files need explicit patch scope — whole-file regeneration usually fails validation.';
      fix = `Request a bounded change to ${inferTargetFileFromTask(task)} only (specific element or CSS class).`;
    }

    return {
      pass_fail: 'FAIL',
      blocker,
      lesson,
      fix,
      gap_recommendation: execJson?.gap_recommendation || null,
    };
  }

  function formatExecutionSummary({ pass_fail, action, command_truth, sha, first_blocker, execution_receipt, human_summary, execution_path }) {
    const lines = [];
    const icon = pass_fail === 'PASS' ? '✅' : pass_fail === 'FAIL' ? '❌' : 'ℹ️';
    lines.push(`${icon} ${pass_fail || 'UNKNOWN'} · ${action || 'execute'}`);
    if (command_truth) lines.push(`Command: ${command_truth}`);
    if (execution_path) lines.push(`Path: ${execution_path}`);
    if (sha) lines.push(`Commit: ${String(sha).slice(0, 12)}`);
    const blocker = first_blocker || execution_receipt?.blocker;
    if (blocker) lines.push(`Blocker: ${blocker}`);
    if (execution_receipt?.lesson) lines.push(`Lesson: ${execution_receipt.lesson}`);
    if (execution_receipt?.fix) lines.push(`Fix: ${execution_receipt.fix}`);
    const gap = execution_receipt?.gap_recommendation;
    if (gap?.next_platform_fix) lines.push(`Next: ${gap.next_platform_fix}`);
    const note = String(human_summary || '').trim();
    if (note) {
      lines.push('');
      lines.push(note);
    }
    return lines.join('\n');
  }

  function isBuildRequest(text) {
    return /\b(fix|change|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor)\b/i.test(text);
  }

  function isDisplayRequest(text) {
    return /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt|how many|what is|what are|list|count|tell me)\b/i.test(text);
  }

  async function loadLuminMemory() {
    try {
      const { default: fsp } = await import('fs/promises');
      const { join } = await import('path');
      const raw = JSON.parse(await fsp.readFile(join(process.cwd(), 'data', 'memories.json'), 'utf-8'));
      const parts = [];

      // Doctrine/directive facts — the core context Lumin needs
      const doctrineFacts = (raw.facts || [])
        .filter(f => ['lumin_doctrine', 'lumin_doctrine_wisdom', 'founder_directive'].includes(f?.content?.type))
        .slice(0, 3)
        .map(f => String(f?.content?.content || '').slice(0, 900))
        .filter(Boolean);
      if (doctrineFacts.length) parts.push(doctrineFacts.join('\n---\n'));

      // Goals (concise)
      const goals = (raw.goals || []).filter(g => (g.confidence || 0) >= 0.7).slice(0, 4);
      if (goals.length) {
        const gt = goals.map(g => {
          const c = g.content;
          return typeof c === 'string' ? c.slice(0, 120) : (c?.title || JSON.stringify(c).slice(0, 120));
        }).join('; ');
        parts.push(`Goals: ${gt}`);
      }

      // Recent conversation history — last 3 exchanges
      const hist = (raw.conversation_history || []).slice(-3);
      if (hist.length) {
        const ht = hist.map(h => {
          const u = String(h.content?.user || h.content || '').slice(0, 100);
          const l = String(h.content?.lumin || '').slice(0, 150);
          return `Adam: ${u}\nLumin: ${l}`;
        }).join('\n\n');
        parts.push(`Recent exchanges:\n${ht}`);
      }

      return parts.filter(Boolean).join('\n\n');
    } catch { return ''; }
  }

  async function luminConverse(userMessage) {
    if (typeof callCouncilMember !== 'function') return null;
    try {
      const memoryContext = await loadLuminMemory();

      // Detect role request — load role-specific authority context
      const roleMatch = userMessage.match(/\b(chair|cfo|cto|sentry|wisdom|architect|builder)\b/i);
      const roleMap = {
        chair: 'strategic direction, mission alignment, governance, priority calls, and blocking bad decisions',
        cfo: 'revenue, cost, ROI gates, financial health, spend decisions, and funded-vs-unfunded tracking',
        cto: 'technical architecture, stack decisions, scalability, and engineering quality',
        sentry: 'quality control, anti-pattern detection, proof verification, and exposing fake-green signals',
        wisdom: 'pattern recognition across time, prediction scoring vs real-world outcomes, founder drift detection, and long-term learning from what was predicted vs what actually happened',
        architect: 'system design, file structure, service boundaries, and load-bearing technical trade-offs',
        builder: 'BuilderOS pipeline — blueprints, missions, governed execution, SNT/CFO gates, and commit receipts',
      };
      const roleKey = roleMatch?.[1]?.toLowerCase();
      const roleContext = roleKey ? `\nACTIVE ROLE — ${roleKey.toUpperCase()}: You are operating with the authority and constraints of ${roleKey.toUpperCase()}. This means your focus is on ${roleMap[roleKey] || roleKey}. Apply that role's logic, not a generic answer.` : '';

      const systemPrompt = `You are Lumin — the operating intelligence of Adam Hopkins' LifeOS/BuilderOS system.

WHAT YOU ARE:
You are NOT a chatbot. You are the AI layer connecting LifeOS (Adam's cockpit) to BuilderOS (the execution engine). You have memory, you know the system deeply, and when needed you can act through real system paths. You speak like someone who has been in every meeting — direct, honest, no theater.

WHAT ADAM HAS BEEN BUILDING:
LifeOS is Adam's personal cockpit and command interface. BuilderOS is the engine — a governed AI execution platform with a council of AI models (Gemini, Anthropic, OpenAI), mission queue, blueprint gates, Sentry checks, and commit receipts. The whole system runs on Railway (Node.js), Neon PostgreSQL, and GitHub. The goal is a self-building, self-governing AI operating system that generates real revenue while protecting user dignity. Target: $500+/day validated revenue. North Star: speed to revenue without deception or theater.

HONESTY CONTRACT (non-negotiable):
- If a command ran: say COMMAND_RAN and show the receipt
- If no command ran: just answer in plain prose — no status codes in your text
- If uncertain: say "I'm not certain" — never present a guess as fact
- If making a prediction about what Adam would decide: label it "Prediction:" and explain why
- If Adam asks you to verify something: go check it, don't assume
- Theater = deception. Never perform. Either do it or say you can't.

ADAM'S DIGITAL TWIN (what you know about him):
- Values results over process. "The scoreboard is did we get from A to B."
- Deep distrust of AI theater — has been burned many times
- Wants the shortest honest path, not governance ceremony for its own sake
- Real estate background; strong product instincts; ADHD tendencies (exec function)
- Wants systems that build themselves — "don't cut the cocoon"
- Communicates directly, often via voice (expects misspellings/slang to be understood)
- Will call out deception immediately and hard; responds to honesty and follow-through
${roleContext}
${memoryContext ? `\nWHAT I KNOW FROM MEMORY:\n${memoryContext}` : ''}

HOW TO RESPOND:
- Answer Adam's actual question directly in conversational prose
- Draw on everything above naturally — don't dump fields, just talk like you know this person
- No preamble. No throat-clearing. Start with the answer.
- Be honest about what you know vs. don't know
- If Adam asks you to take a real system action, tell him to say it as a build/execute command — you cannot commit code yourself; the system will return PASS/FAIL with blocker, lesson, and fix
- Point B missions (LifeRE Alpha, PRODUCT-LIFERE-OS-V1-0001, foundation pipeline): you CANNOT claim executed/triggered/complete — only the foundation pipeline receipt counts
- Never claim a UI change shipped unless the system returned COMMITTED with a commit SHA
- Never say "successfully executed" or "build triggered" in conversation mode — that is theater`;

      const response = await callCouncilMember('gemini', `${systemPrompt}\n\nAdam: ${userMessage}\n\nLumin:`, {
        maxOutputTokens: 2000,
        taskType: 'chat',
        useCache: false,
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
    return runFounderBuildWithSelfRepair({
      task,
      commandKey,
      baseUrl: base,
      buildFailureReceipt: buildBuildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  function getForwardedOperatorKey(req) {
    return req.headers['x-command-key']
      || req.headers['x-command-center-key']
      || req.headers['x-lifeos-key']
      || req.headers['x-api-key']
      || null;
  }

  function founderBuildResponsePayload(builderResult) {
    if (!builderResult || typeof builderResult !== 'object') return builderResult;
    const { generated_output, exec_meta, ...rest } = builderResult;
    const safe = { ...rest };
    if (exec_meta && typeof exec_meta === 'object') {
      const { output, ...execRest } = exec_meta;
      safe.exec_meta = execRest;
    }
    return safe;
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
    const authHeader = String(req.headers.authorization || '');
    const alt = String(req.headers['x-lifeos-token'] || '').trim();
    const cookieTok = readCookie(req, 'lifeos_access_token');
    const candidates = [];
    if (authHeader.startsWith('Bearer ')) candidates.push(authHeader.slice(7).trim());
    if (alt) candidates.push(alt);
    if (cookieTok) candidates.push(cookieTok);

    for (const token of candidates) {
      if (!token) continue;
      try {
        req.lifeosUser = verifyToken(token);
        req.auth_mode = 'account_jwt';
        return next();
      } catch { /* try next */ }
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
      const explicitExecute = action === 'execute' || isExplicitExecuteCommand(cleanedInput);
      const executeIntent = isLikelyExecuteIntent(cleanedInput) || explicitExecute;
      const shouldDisplayOnly = !explicitExecute && (
        action === 'display'
        || (action === 'auto'
          && !executeIntent
          && /\b(show|display|view|status|queue|jobs|graph|chart|summary|blocker|receipt)\b/i.test(cleanedInput))
      );
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
        const displayReply = plainEnglish || displayResult.human_summary;
        const persistWarning = await persistFounderTurn(req, cleanedInput, displayReply);
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
          ...(persistWarning ? { persist_warning: persistWarning } : {}),
        });
      }

      // Point B / mission pipeline — run real foundation loop (not Lumin prose theater)
      if (!shouldDisplayOnly && isMissionPipelineIntent(cleanedInput)) {
        const pipelineMission = missionId || extractMissionIdFromText(cleanedInput);
        if (pipelineMission) {
          const pipelineResult = runFoundationPipelineForFounder(pipelineMission, { force: force || true });
          const pipelineReply = formatExecutionTruthReply({
            ...pipelineResult,
            action: 'mission_pipeline',
          });
          const persistWarning = await persistFounderTurn(req, cleanedInput, pipelineReply);
          return res.status(200).json({
            interface: 'LifeOS Founder Interface',
            action: 'mission_pipeline',
            source_mode: sourceMode,
            model_routing: { route: 'foundation_pipeline', complexity: 'high' },
            auth_mode: req.auth_mode || 'unknown',
            user_role: req.lifeosUser?.role || null,
            intake_normalized: intakeNormalized,
            ...pipelineResult,
            human_summary: pipelineReply,
            ...(persistWarning ? { persist_warning: persistWarning } : {}),
          });
        }
      }

      // Route build/fix/change requests directly to the builder — same channel the system uses
      const shouldRunFounderBuild = isBuildRequest(cleanedInput) || isRepairContinuationIntent(cleanedInput);
      if (!shouldDisplayOnly && shouldRunFounderBuild) {
        const operatorKey = getForwardedOperatorKey(req)
          || process.env.COMMAND_CENTER_KEY
          || process.env.LIFEOS_KEY
          || process.env.API_KEY;
        if (operatorKey) {
          const buildTask = await resolveBuildTaskForFounder(req, cleanedInput);
          const builderResult = await routeToBuilder(buildTask, operatorKey);
          const buildReply = formatExecutionTruthReply(builderResult);
          const persistWarning = await persistFounderTurn(req, cleanedInput, buildReply);
          return res.status(200).json({
            interface: 'LifeOS Founder Interface',
            action: 'build',
            build_task_resolved: buildTask !== cleanedInput,
            ...founderBuildResponsePayload(builderResult),
            human_summary: buildReply,
            ...(persistWarning ? { persist_warning: persistWarning } : {}),
          });
        }
        const missingKeyTruth = enforceExecutionTruth({
          ok: false,
          committed: false,
          failure_code: 'BUILDER_KEY_MISSING',
          first_blocker: 'Build request requires operator command key — cannot dispatch to builder.',
          execution_path: 'builder_task_execute',
        }, { action: 'build', task: cleanedInput });
        const missingKeyReply = formatExecutionTruthReply(missingKeyTruth);
        const persistWarning = await persistFounderTurn(req, cleanedInput, missingKeyReply);
        return res.status(503).json({
          interface: 'LifeOS Founder Interface',
          action: 'build',
          ...missingKeyTruth,
          human_summary: missingKeyReply,
          ...(persistWarning ? { persist_warning: persistWarning } : {}),
        });
      }

      // Explicit execute ("execute it", action=execute) → terminal bridge, not conversation theater
      if (!shouldDisplayOnly && explicitExecute && !isBuildRequest(cleanedInput)) {
        const result = await runTerminalBridgeIntake({
          text: normalizedText || cleanedInput,
          textFile: req.body?.text_file || null,
          stage,
          missionId,
          force,
        });
        const truth = wrapBridgeResultAsTruth(result, cleanedInput);
        const executeReply = formatExecutionTruthReply(truth);
        const persistWarning = await persistFounderTurn(req, cleanedInput, executeReply);
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
          ...truth,
          human_summary: executeReply,
          ...(persistWarning ? { persist_warning: persistWarning } : {}),
        });
      }

      // Conversation — questions, counsel, brainstorm (not execute/build commands)
      if (!explicitExecute && !isBuildRequest(cleanedInput)) {
      const luminReply = await luminConverse(cleanedInput);
      if (luminReply) {
        const safeReply = sanitizeConversationReply(luminReply, { command_truth: 'NO_COMMAND_RAN' });
        const persistWarning = await persistFounderTurn(req, cleanedInput, safeReply);
        return res.status(200).json({
          ok: true,
          interface: 'LifeOS Founder Interface',
          action: 'conversation',
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'NO_COMMAND_RAN',
          human_summary: safeReply,
          conversation_sanitized: safeReply !== luminReply,
          auth_mode: req.auth_mode || 'unknown',
          intake_normalized: intakeNormalized,
          ...(persistWarning ? { persist_warning: persistWarning } : {}),
        });
      }
      }

      // Default execution path for structured build/change intents
      if (!['development', 'system'].includes(stage)) {
        return res.status(400).json({
          ok: false,
          interface: 'LifeOS Founder Interface',
          action: 'execute',
          command_truth: 'NO_COMMAND_RAN',
          pass_fail: 'FAIL',
          reason: 'NO_COMMAND_RAN',
          error: 'stage must be development or system',
          human_summary: formatExecutionSummary({
            pass_fail: 'FAIL',
            action: 'execute',
            command_truth: 'NO_COMMAND_RAN',
            first_blocker: 'stage must be development or system',
            execution_receipt: {
              lesson: 'Execute requests require stage=system or stage=development.',
              fix: 'Resend with stage: system (default in dashboard chat).',
            },
          }),
        });
      }

      const result = await runTerminalBridgeIntake({
        text: normalizedText,
        textFile: req.body?.text_file || null,
        stage,
        missionId,
        force,
      });
      const truth = wrapBridgeResultAsTruth(result, cleanedInput);
      const terminalReply = formatExecutionTruthReply(truth);
      const persistWarning = await persistFounderTurn(req, cleanedInput, terminalReply);
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
        ...truth,
        human_summary: terminalReply,
        ...(persistWarning ? { persist_warning: persistWarning } : {}),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
