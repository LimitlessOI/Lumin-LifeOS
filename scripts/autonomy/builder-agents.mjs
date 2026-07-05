/**
 * SYNOPSIS: scripts/autonomy/builder-agents.mjs — model-agnostic "hands" for the builder supervisor.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 *
 * The builder supervisor runs N concurrent build lanes, each in an isolated git
 * worktree. This module abstracts the coding agent that actually edits files in
 * a lane ("the hands") so a lane can run on a cheap OpenAI tool-loop instead of
 * the Claude Code CLI. Selecting a cheaper agent is the single biggest lever on
 * cost-per-product, which is why it is configurable per run.
 *
 * Every agent returns the SAME result contract as the legacy spawnClaude():
 *   { exitCode, stdout, stderr, elapsedMinutes, toolsUsed, eventCount, agent }
 * so the supervisor's downstream gates (file-boundary enforcement, verification,
 * commit, PR) are unchanged regardless of which agent produced the edits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const AGENT_CLAUDE_CLI = 'claude-cli';
export const AGENT_OPENAI = 'openai';

/**
 * Resolve which agent to use. Explicit BUILDER_AGENT wins; otherwise prefer the
 * cheap OpenAI hands when a key is present, and fall back to the Claude CLI.
 */
export function resolveAgentKind(env = process.env) {
  const explicit = String(env.BUILDER_AGENT || '').trim().toLowerCase();
  if (explicit === AGENT_OPENAI || explicit === AGENT_CLAUDE_CLI) return explicit;
  if (String(env.OPENAI_API_KEY || '').trim().length > 8) return AGENT_OPENAI;
  return AGENT_CLAUDE_CLI;
}

/** Human-readable availability check for a given agent kind (used by safety gate). */
export function agentAvailability(kind, { claudeBinExists = false, env = process.env } = {}) {
  if (kind === AGENT_OPENAI) {
    const ok = String(env.OPENAI_API_KEY || '').trim().length > 8;
    return { ok, reason: ok ? null : 'OPENAI_API_KEY missing — cannot run the OpenAI builder agent' };
  }
  if (kind === AGENT_CLAUDE_CLI) {
    return { ok: claudeBinExists, reason: claudeBinExists ? null : 'Claude Code CLI not found — set CLAUDE_BIN or switch BUILDER_AGENT=openai' };
  }
  return { ok: false, reason: `unknown builder agent kind: ${kind}` };
}

/**
 * Run the selected coding agent inside `cwd`.
 * @param {object} opts
 * @param {string} opts.kind          agent kind (claude-cli | openai)
 * @param {string} opts.prompt        the task prompt
 * @param {string} opts.cwd           worktree directory the agent may edit
 * @param {object} [opts.logger]      { info, warn, error, debug }
 * @param {string[]} [opts.allowedFiles]  optional repo-relative allowlist
 * @param {number} [opts.maxTurns]    max tool-loop turns
 * @param {Function} [opts.claudeRunner]  async (prompt, cwd) => result — supplied by the supervisor for the claude-cli agent
 */
export async function runBuilderAgent(opts = {}) {
  const { kind, prompt, cwd, claudeRunner } = opts;
  if (kind === AGENT_CLAUDE_CLI) {
    if (typeof claudeRunner !== 'function') {
      return errorResult('claude-cli agent selected but no claudeRunner provided', AGENT_CLAUDE_CLI);
    }
    const r = await claudeRunner(prompt, cwd);
    return { ...r, agent: AGENT_CLAUDE_CLI };
  }
  if (kind === AGENT_OPENAI) {
    return runOpenAiAgent(opts);
  }
  return errorResult(`unknown builder agent kind: ${kind}`, kind || 'unknown');
}

function errorResult(message, agent) {
  return { exitCode: 1, stdout: '', stderr: message, elapsedMinutes: 0, toolsUsed: [], eventCount: 0, agent };
}

// ── OpenAI tool-loop agent ────────────────────────────────────────────────────

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List files/directories at a repo-relative path (default: repo root).',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'repo-relative directory path' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a UTF-8 text file at a repo-relative path.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite a UTF-8 text file at a repo-relative path with full contents.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string', description: 'the complete file contents' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'node_check',
      description: 'Run `node --check` on a repo-relative .js/.mjs file to verify it parses.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description: 'Call when the task is complete. Provide a short summary of what changed.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'needs_human',
      description: 'Call when the task cannot be completed autonomously (credentials, approvals, ambiguous requirements).',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        required: ['reason'],
      },
    },
  },
];

function jailPath(cwd, relInput) {
  const rel = String(relInput || '').replace(/^\/+/, '');
  const abs = path.resolve(cwd, rel);
  const root = path.resolve(cwd);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return { ok: false, error: `path escapes worktree: ${relInput}` };
  }
  return { ok: true, abs, rel };
}

// Approximate USD per 1M tokens by model (input/output). Overridable via env so
// price changes never require a code edit. Unknown models fall back to the
// cheapest default so cost is estimated conservatively rather than dropped.
const COST_PER_1M = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4.1': { in: 2, out: 8 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
  'gpt-4.1-nano': { in: 0.1, out: 0.4 },
};

function estimateCostUsd(model, promptTokens, completionTokens, env = process.env) {
  const inRate = Number(env.BUILDER_OPENAI_COST_IN_PER_1M) || COST_PER_1M[model]?.in || COST_PER_1M['gpt-4o-mini'].in;
  const outRate = Number(env.BUILDER_OPENAI_COST_OUT_PER_1M) || COST_PER_1M[model]?.out || COST_PER_1M['gpt-4o-mini'].out;
  return parseFloat((((promptTokens / 1e6) * inRate) + ((completionTokens / 1e6) * outRate)).toFixed(5));
}

async function callOpenAi({ apiKey, model, messages }) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, tools: TOOL_DEFS, temperature: 0 }),
  });
  const raw = await res.json();
  if (!res.ok) {
    const msg = raw?.error?.message || `openai http ${res.status}`;
    throw new Error(msg);
  }
  return raw;
}

async function runOpenAiAgent({ prompt, cwd, logger, allowedFiles, maxTurns, env = process.env }) {
  const startTime = Date.now();
  const apiKey = String(env.OPENAI_API_KEY || '').trim();
  const model = String(env.BUILDER_OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  const turnBudget = Number.isFinite(maxTurns) && maxTurns > 0 ? maxTurns : 30;
  const allowSet = Array.isArray(allowedFiles) && allowedFiles.length ? new Set(allowedFiles) : null;

  if (!apiKey) return errorResult('OPENAI_API_KEY missing', AGENT_OPENAI);

  const toolsUsed = [];
  let events = 0;
  let needsHuman = null;
  let finished = null;
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, model, estimatedUsd: 0 };
  const withUsage = (r) => ({ ...r, usage: { ...usage, estimatedUsd: estimateCostUsd(model, usage.promptTokens, usage.completionTokens, env) } });
  const scopeNote = allowSet
    ? `\n\nYou may ONLY write to these files: ${[...allowSet].join(', ')}. Writes elsewhere are rejected.`
    : '';

  const messages = [
    {
      role: 'system',
      content:
        'You are a headless coding agent operating inside one git worktree. Use the provided tools to inspect and edit files. Make the smallest change that satisfies the task. Do not touch unrelated files. Every new .js/.mjs file must keep a @ssot JSDoc tag. When done, call finish. If you cannot proceed without a human decision, call needs_human.' +
        scopeNote,
    },
    { role: 'user', content: prompt },
  ];

  for (let turn = 0; turn < turnBudget; turn += 1) {
    let response;
    try {
      response = await callOpenAi({ apiKey, model, messages });
    } catch (err) {
      return withUsage({ ...errorResult(`openai call failed: ${err.message}`, AGENT_OPENAI), elapsedMinutes: elapsed(startTime), toolsUsed, eventCount: events });
    }
    events += 1;
    const u = response?.usage;
    if (u) {
      usage.promptTokens += u.prompt_tokens || 0;
      usage.completionTokens += u.completion_tokens || 0;
      usage.totalTokens += u.total_tokens || 0;
      usage.calls += 1;
    }
    const choice = response?.choices?.[0];
    const msg = choice?.message;
    if (!msg) {
      return withUsage({ ...errorResult('openai returned no message', AGENT_OPENAI), elapsedMinutes: elapsed(startTime), toolsUsed, eventCount: events });
    }

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      // Model produced a plain message with no tool call — treat as final text.
      finished = finished || (msg.content || '').trim();
      break;
    }

    // Push the assistant turn (with its tool calls) then answer each tool call.
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });

    for (const call of toolCalls) {
      const name = call.function?.name;
      let argsObj = {};
      try { argsObj = JSON.parse(call.function?.arguments || '{}'); } catch { argsObj = {}; }
      toolsUsed.push(name);
      logger?.debug?.(`[OPENAI-AGENT] tool: ${name} — ${JSON.stringify(argsObj).slice(0, 120)}`);

      let toolResult;
      if (name === 'finish') {
        finished = String(argsObj.summary || 'done');
        toolResult = 'ok';
      } else if (name === 'needs_human') {
        needsHuman = String(argsObj.reason || 'unspecified');
        toolResult = 'acknowledged';
      } else {
        toolResult = await execTool(name, argsObj, { cwd, allowSet });
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
      });
    }

    if (needsHuman || finished) break;
  }

  const elapsedMinutes = elapsed(startTime);
  if (needsHuman) {
    return withUsage({ exitCode: 0, stdout: `NEEDS_HUMAN: ${needsHuman}`, stderr: '', elapsedMinutes, toolsUsed, eventCount: events, agent: AGENT_OPENAI });
  }
  if (finished === null) {
    return withUsage({ exitCode: 1, stdout: '', stderr: `openai agent hit turn budget (${turnBudget}) without finishing`, elapsedMinutes, toolsUsed, eventCount: events, agent: AGENT_OPENAI });
  }
  return withUsage({ exitCode: 0, stdout: finished || 'done', stderr: '', elapsedMinutes, toolsUsed, eventCount: events, agent: AGENT_OPENAI });
}

async function execTool(name, args, { cwd, allowSet }) {
  try {
    if (name === 'list_dir') {
      const j = jailPath(cwd, args.path || '.');
      if (!j.ok) return `error: ${j.error}`;
      if (!fs.existsSync(j.abs)) return `error: not found: ${args.path || '.'}`;
      const entries = fs.readdirSync(j.abs, { withFileTypes: true })
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      return entries.slice(0, 500).join('\n') || '(empty)';
    }
    if (name === 'read_file') {
      const j = jailPath(cwd, args.path);
      if (!j.ok) return `error: ${j.error}`;
      if (!fs.existsSync(j.abs)) return `error: not found: ${args.path}`;
      const content = fs.readFileSync(j.abs, 'utf8');
      return content.length > 60000 ? `${content.slice(0, 60000)}\n... [truncated]` : content;
    }
    if (name === 'write_file') {
      const j = jailPath(cwd, args.path);
      if (!j.ok) return `error: ${j.error}`;
      if (allowSet && !allowSet.has(j.rel)) {
        return `error: ${j.rel} is outside the allowed_files list; write rejected. Allowed: ${[...allowSet].join(', ')}`;
      }
      fs.mkdirSync(path.dirname(j.abs), { recursive: true });
      fs.writeFileSync(j.abs, String(args.content ?? ''), 'utf8');
      return `wrote ${j.rel} (${String(args.content ?? '').length} bytes)`;
    }
    if (name === 'node_check') {
      const j = jailPath(cwd, args.path);
      if (!j.ok) return `error: ${j.error}`;
      const { stderr } = await execFileAsync('node', ['--check', j.abs], { cwd }).catch((e) => ({ stderr: e.message }));
      return stderr ? `FAIL: ${stderr.slice(0, 500)}` : 'PASS';
    }
    return `error: unknown tool ${name}`;
  } catch (err) {
    return `error: ${err.message}`;
  }
}

function elapsed(startTime) {
  return parseFloat(((Date.now() - startTime) / 1000 / 60).toFixed(2));
}
