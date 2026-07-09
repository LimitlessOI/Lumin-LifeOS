/**
 * SYNOPSIS: Direct Chair agent — the founder talks straight to the Chair (the AI), which can ANSWER and ACT.
 * No keyword-router middle layer: the model decides, real tools execute, the reply reports what actually happened.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { gatherChairNativeFacts } from './chair-native-facts.js';
import { formatThreadForPrompt } from './lumin-thread-context.js';
import { formatExecutionTruthReply } from './lifeos-execution-truth.js';

const DEFAULT_MODEL = process.env.CHAIR_DIRECT_AGENT_MODEL || 'claude_sonnet';
const MAX_STEPS = Math.max(1, Number(process.env.CHAIR_DIRECT_AGENT_MAX_STEPS || '3'));
const BUILD_TIMEOUT_MS = Math.max(15000, Number(process.env.CHAIR_DIRECT_AGENT_BUILD_TIMEOUT_MS || '180000'));

const SYSTEM_PROMPT = `You are Lumin — THE CHAIR of Adam Hopkins' LifeOS/BuilderOS system. You are not a chatbot, not a relay, not a layer in front of "the real system." You ARE the AI in the Chair's seat, talking directly to Adam, and you can ACT on this system, not just talk about it.

HOW YOU TALK (Adam defined this himself — follow it):
- Answer Adam's ACTUAL words first, like a sharp partner who was in the room for every prior conversation — not a status report. If he asks a question, answer THAT question. Do not open by reciting the mission or current priority unless he asked about it.
- Direct, conversational, human. Translate between plain English and system reality both directions. Talk the way a trusted operator talks: plain, specific, no filler.
- Mirror his position first when he's reasoning something out; validate the thinking, not just the conclusion. Never make him wrong.
- Prefer questions that help him think over lectures ("What outcome were you hoping for?" over "Here's what to do") — but when he asks for a fact or an action, give it straight, no Socratic dodging.
- Give before you take: acknowledge what's real before asking anything.
- Vary your openings and rhythm. NO ChatGPT formula: no "happy to help", no "great question", no validation sandwich, no boilerplate, no reciting mission status unless he asked for status.
- Never manipulate. He sets the goal (Point B). You make sure he has the real information.

HONESTY CONTRACT (non-negotiable — he has been lied to and will not tolerate it again):
- Never claim you built, changed, committed, deployed, scheduled, or ran anything unless a real receipt in OBSERVATIONS proves it (with a commit SHA or explicit committed:true).
- If a tool failed, say so plainly and why. Do not perform success. Theater = deception.
- If you don't know, say "I'm not certain." Label guesses "Prediction:".

WHAT YOU CAN DO — you respond with EXACTLY ONE JSON object and nothing else. No markdown fences, no prose outside the JSON. One of:

1) Answer / converse (no system change needed):
{"action":"reply","message":"<your words to Adam>"}

2) Build or change the product (code / UI / behavior). Use this the moment Adam clearly asks to change something in the system:
{"action":"build","instruction":"<concrete, specific change to make>","target_file":"<repo path if you know it, else null>"}

Rules for choosing:
- If Adam asks a question, or is thinking out loud, or wants counsel → "reply".
- If Adam tells you to build/change/fix/recolor/add something to the system → "build". Do NOT ask permission for a clear directive; do it. Only ask a clarifying question (via "reply") if you genuinely cannot tell what to change.
- After a build runs, you will see its real result in OBSERVATIONS. Then respond with "reply" telling Adam exactly what happened — the commit, or the honest failure.`;

function coerceText(res) {
  if (typeof res === 'string') return res;
  if (res && typeof res === 'object') return res.content || res.text || res.message || '';
  return '';
}

function parseAgentJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  // strip code fences
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const candidates = [unfenced, text];
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === 'object' && obj.action) return obj;
    } catch { /* try substring */ }
  }
  // extract first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      if (obj && typeof obj === 'object' && obj.action) return obj;
    } catch { /* fall through */ }
  }
  return null;
}

async function withTimeout(promise, ms, onTimeout) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function summarizeBuildResult(result) {
  if (!result) return { committed: false, note: 'no result returned' };
  const sha = result.commit_sha || result.sha || result.exec_meta?.sha || null;
  const committed = result.committed === true || (result.ok === true && Boolean(sha));
  return {
    ok: result.ok === true,
    committed,
    commit_sha: sha,
    sha,
    target_file: result.target_file || null,
    deployed: result.deployed === true || result.deploy?.ok === true || null,
    execution_path: result.execution_path || null,
    pass_fail: result.pass_fail || (committed ? 'PASS' : (result.ok === false ? 'FAIL' : null)),
    command_truth: result.command_truth || (committed ? 'COMMITTED' : null),
    transport_status: result.transport_status || null,
    first_blocker: result.first_blocker || result.failure_code || (committed ? null : (result.error || 'build did not commit')),
    detail: result.human_summary || result.human_summary_technical || null,
    human_summary: result.human_summary || null,
  };
}

function formatBuildReply(summary) {
  if (!summary) return 'That build did not land: unknown reason. Nothing was committed. Tell me how you want to proceed.';
  if (summary.committed) {
    const structured = formatExecutionTruthReply({
      ...summary,
      action: 'build',
      pass_fail: summary.pass_fail || 'PASS',
      command_truth: summary.command_truth || 'COMMITTED',
      sha: summary.sha || summary.commit_sha,
      first_blocker: null,
    });
    if (/\bPASS\b/.test(structured) && (/Command:\s*COMMITTED/i.test(structured) || /Transport:/i.test(structured))) {
      return structured;
    }
    return `Done — that change committed${summary.commit_sha ? ` (${String(summary.commit_sha).slice(0, 12)})` : ''}${summary.target_file ? ` to ${summary.target_file}` : ''}. Give it a moment to deploy, then hard-refresh.\n\n${structured}`;
  }
  return `That build did not land: ${summary.first_blocker || 'unknown reason'}. Nothing was committed. Tell me how you want to proceed.`;
}

/**
 * Run the direct Chair agent.
 * @returns {Promise<{reply:string, command_ran:boolean, ok:boolean, build:object|null, steps:number}|null>}
 */
export async function runChairDirectAgent({ message, history = [], deps = {}, ctx = {} }) {
  const callAI = deps.callAI;
  if (typeof callAI !== 'function') return null;
  const routeToBuilder = typeof deps.routeToBuilder === 'function' ? deps.routeToBuilder : null;
  const operatorKey = deps.operatorKey || '';

  let systemFacts = {};
  try {
    systemFacts = await gatherChairNativeFacts(message, {
      callAI,
      pool: deps.pool || null,
      memoryContext: deps.memoryContext || null,
      userId: ctx.userId || null,
      userHandle: ctx.userHandle || null,
    }, { domain: 'chair', user_handle: ctx.userHandle || null });
  } catch { systemFacts = {}; }

  const threadBlock = history.length ? `\n\nRECENT CONVERSATION (continue it naturally — do not restart or summarize):\n${formatThreadForPrompt(history)}` : '';
  const factsJson = (() => {
    try { return JSON.stringify(systemFacts, null, 2).slice(0, 8000); } catch { return '{}'; }
  })();

  const observations = [];
  let lastBuild = null;
  let commandRan = false;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const obsBlock = observations.length
      ? `\n\nOBSERVATIONS (real results of tools you already ran this turn):\n${observations.join('\n')}`
      : '';
    const prompt = `${SYSTEM_PROMPT}

SYSTEM_FACTS (background context about the live system — grounding only, NOT a script to read back; use a fact only if it actually helps answer what Adam said):
${factsJson}${threadBlock}${obsBlock}

Adam: ${String(message || '').trim()}

Respond with exactly one JSON object:`;

    let raw;
    try {
      raw = coerceText(await callAI(DEFAULT_MODEL, prompt, {
        maxOutputTokens: 1600,
        taskType: 'lumin_chair_agent',
        founderComms: true,
        useCache: false,
      }));
    } catch (err) {
      return {
        reply: `I hit an error reaching my own model (${err.message}). Nothing ran. Say it again and I'll retry.`,
        command_ran: false,
        ok: false,
        build: null,
        steps: step,
      };
    }

    const decision = parseAgentJson(raw);

    if (!decision) {
      // Model spoke prose instead of JSON — treat as a direct reply so it still converses.
      const fallback = String(raw || '').trim();
      if (fallback) {
        return { reply: fallback, command_ran: commandRan, ok: true, build: lastBuild, steps: step + 1 };
      }
      continue;
    }

    if (decision.action === 'reply') {
      const prose = String(decision.message || '').trim() || 'What do you need?';
      // After a real commit, always surface the structured PASS receipt — model prose alone
      // fails founder-UI E2E (missing Command: COMMITTED / Transport lines).
      const reply = (commandRan && lastBuild?.committed) ? formatBuildReply(lastBuild) : prose;
      return {
        reply,
        command_ran: commandRan,
        ok: true,
        build: lastBuild,
        steps: step + 1,
      };
    }

    if (decision.action === 'build') {
      if (!routeToBuilder) {
        observations.push('build tool unavailable in this context — cannot change code right now.');
        continue;
      }
      const instruction = String(decision.instruction || message || '').trim();
      const targetFile = decision.target_file && decision.target_file !== 'null' ? String(decision.target_file) : null;
      const task = targetFile ? `do: ${instruction}\ntarget_file: ${targetFile}` : `do: ${instruction}`;
      const buildResult = await withTimeout(
        Promise.resolve(routeToBuilder(task, operatorKey, { confirmIntent: true })).catch((e) => ({ ok: false, committed: false, first_blocker: e.message })),
        BUILD_TIMEOUT_MS,
        { __timedOut: true },
      );
      if (buildResult && buildResult.__timedOut) {
        lastBuild = { committed: false, timed_out: true, note: `build exceeded ${Math.round(BUILD_TIMEOUT_MS / 1000)}s` };
        return {
          reply: `I dispatched that build but it's taking longer than ${Math.round(BUILD_TIMEOUT_MS / 1000)}s and hasn't confirmed a commit yet. I'm not going to pretend it landed. Ask me "did that build commit?" in a moment and I'll check the real status.`,
          command_ran: false,
          ok: false,
          build: lastBuild,
          steps: step + 1,
        };
      }
      const summary = summarizeBuildResult(buildResult);
      lastBuild = summary;
      if (summary.committed) commandRan = true;
      observations.push(`BUILD RESULT: ${JSON.stringify(summary)}`);
      // loop again so the model reports the real result to Adam
      continue;
    }

    // Unknown action — nudge the model to reply.
    observations.push(`Unknown action "${decision.action}". Respond with {"action":"reply",...} to Adam now.`);
  }

  // Loop exhausted — synthesize an honest final reply from what really happened.
  if (lastBuild) {
    const reply = formatBuildReply(lastBuild);
    return {
      reply,
      command_ran: lastBuild.committed === true,
      ok: lastBuild.committed === true,
      build: lastBuild,
      steps: MAX_STEPS,
    };
  }
  return {
    reply: 'I could not settle on a clear response. Say that again more directly and I will answer or act.',
    command_ran: false,
    ok: false,
    build: null,
    steps: MAX_STEPS,
  };
}

export default runChairDirectAgent;
