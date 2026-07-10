/**
 * SYNOPSIS: Direct Chair agent — talks + acts; human prose obeys Lumin Communication DNA (not theater).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { gatherChairNativeFacts } from './chair-native-facts.js';
import { formatThreadForPrompt } from './lumin-thread-context.js';
import { formatExecutionTruthReply } from './lifeos-execution-truth.js';
import {
  enforceCommunicationLaw,
  loadLuminCommunicationLaw,
  isLuminCommunicationLawEnforced,
} from './lumin-communication-guard.js';

const DEFAULT_MODEL = process.env.CHAIR_DIRECT_AGENT_MODEL || 'claude_sonnet';
const MAX_STEPS = Math.max(1, Number(process.env.CHAIR_DIRECT_AGENT_MAX_STEPS || '3'));
const BUILD_TIMEOUT_MS = Math.max(15000, Number(process.env.CHAIR_DIRECT_AGENT_BUILD_TIMEOUT_MS || '180000'));

/** Constitutional voice — docs/constitution/LUMIN_COMMUNICATION_DNA.md */
const SYSTEM_PROMPT = `You are Lumin — THE CHAIR of Adam Hopkins' LifeOS/BuilderOS system. Not a chatbot wrapper. Not theater. You interpret real system truth and speak it in human language; you can also ACT (build) when he orders a change.

COMMUNICATION DNA (memorize — every reply):
The system interprets truth; translation speaks it in human language matched to this person — never ChatGPT formula, never fake execution, never the same script every turn.

STACK (non-negotiable):
API / DB / files / twin / OBSERVATIONS → SYSTEM_FACTS (truth) → your words (translation). You are the translation layer + the hands. You are not a separate personality inventing a world.

HOW YOU TALK:
- Answer Adam's ACTUAL words first — sharp partner in the room, not a status report. Do not open with mission/priority unless he asked.
- Plain, specific, human. Start with the answer. No filler. No validation sandwich.
- Match THIS person's rhythm from personal_twin / lumin_context when present — not generic assistant voice.
- Vary openings, length, endings. Forbidden formula: "happy to help", "great question", "here's the thing", "let me break this down", "absolutely!", "certainly!", paraphrase-back ("you want me to…").
- Prefer one sharp question that helps him think over a lecture — but when he asks for a fact or an action, give it straight.
- Never manipulate. He sets Point B. You give real information.

HONESTY (theater = deception):
- Never claim you built, changed, committed, deployed, scheduled, or ran anything THIS turn unless OBSERVATIONS prove it (commit SHA or committed:true).
- EXCEPTION — recall: if SYSTEM_FACTS.last_build_receipt has commit_sha (or committed:true), cite that SHA when he asks if it landed. Do NOT deny a receipt that is present.
- If a tool failed, say so plainly. If you don't know: "I'm not certain." Label guesses "Prediction:".

WHAT YOU CAN DO — respond with EXACTLY ONE JSON object and nothing else. No markdown fences, no prose outside the JSON. One of:

1) Answer / converse (no system change needed):
{"action":"reply","message":"<your words to Adam — DNA voice, facts only>"}

2) Build or change the product (code / UI / behavior). Use this the moment Adam clearly asks to change something in the system:
{"action":"build","instruction":"<concrete, specific change to make>","target_file":"<repo path if you know it, else null>"}

Rules for choosing:
- Question / thinking out loud / counsel → "reply".
- "Did it land?" / "what's the sha?" → "reply" using last_build_receipt when present. Do not start a new build just to answer that.
- Clear build/change/fix order → "build". Do not ask permission for a clear directive; only clarify if you cannot tell what to change.
- After a build runs, OBSERVATIONS has the real result — then "reply" with the commit or the honest failure.`;

function communicationLawBlock() {
  if (!isLuminCommunicationLawEnforced()) return '';
  try {
    const law = loadLuminCommunicationLaw();
    const principles = (law.supreme_principles || [])
      .map((p) => `- ${p.id}: ${p.text}`)
      .join('\n');
    const selfVoice = (law.self_voice?.principles || [])
      .map((p) => `- ${p.id}: ${p.text}`)
      .join('\n');
    const parts = [];
    if (principles) {
      parts.push(`[LUMIN COMMUNICATION LAW — mandatory floor]\n${principles}`);
    }
    if (selfVoice) {
      parts.push(`[HOW I SPEAK — self (intent above the floor)]\n${selfVoice}`);
    }
    if (!parts.length) return '';
    return `\n\n${parts.join('\n\n')}\nAuthority: docs/constitution/LUMIN_COMMUNICATION_DNA.md`;
  } catch {
    return '';
  }
}

function finalizeHumanReply(text, { commandRan = false, lastBuild = null } = {}) {
  if (commandRan && lastBuild?.committed) {
    return {
      reply: formatBuildReply(lastBuild),
      communication_law: { skipped: true, reason: 'structured_build_receipt' },
    };
  }
  const prose = String(text || '').trim() || 'What do you need?';
  const enforced = enforceCommunicationLaw(prose);
  const body = enforced.text && enforced.text.trim().length >= 8
    ? enforced.text.trim()
    : prose;
  return { reply: body, communication_law: enforced.receipt };
}

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
      memoryContext: deps.memoryContext ?? null,
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

  const priorReceipt = systemFacts?.last_build_receipt;
  if (priorReceipt?.commit_sha || priorReceipt?.pass_fail) {
    observations.push(`LAST BUILD RECEIPT (prior turn — cite when Adam asks if it landed / for the SHA): ${JSON.stringify(priorReceipt)}`);
  }

  const lawBlock = communicationLawBlock();

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const obsBlock = observations.length
      ? `\n\nOBSERVATIONS (real tool/receipt facts — same-turn builds AND last_build_receipt when present):\n${observations.join('\n')}`
      : '';
    const prompt = `${SYSTEM_PROMPT}${lawBlock}

SYSTEM_FACTS (truth only — grounding, NOT a script to recite; use a fact only if it answers what Adam said):
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
      const failed = finalizeHumanReply(
        `I hit an error reaching my own model (${err.message}). Nothing ran. Say it again and I'll retry.`,
      );
      return {
        reply: failed.reply,
        command_ran: false,
        ok: false,
        build: null,
        steps: step,
        communication_law: failed.communication_law,
      };
    }

    const decision = parseAgentJson(raw);

    if (!decision) {
      const fallback = String(raw || '').trim();
      if (fallback) {
        const finalized = finalizeHumanReply(fallback, { commandRan, lastBuild });
        return {
          reply: finalized.reply,
          command_ran: commandRan,
          ok: true,
          build: lastBuild,
          steps: step + 1,
          communication_law: finalized.communication_law,
        };
      }
      continue;
    }

    if (decision.action === 'reply') {
      const prose = String(decision.message || '').trim() || 'What do you need?';
      const finalized = finalizeHumanReply(prose, { commandRan, lastBuild });
      return {
        reply: finalized.reply,
        command_ran: commandRan,
        ok: true,
        build: lastBuild,
        steps: step + 1,
        communication_law: finalized.communication_law,
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
        const finalized = finalizeHumanReply(
          `I dispatched that build but it's taking longer than ${Math.round(BUILD_TIMEOUT_MS / 1000)}s and hasn't confirmed a commit yet. I'm not going to pretend it landed. Ask me "did that build commit?" in a moment and I'll check the real status.`,
        );
        return {
          reply: finalized.reply,
          command_ran: false,
          ok: false,
          build: lastBuild,
          steps: step + 1,
          communication_law: finalized.communication_law,
        };
      }
      const summary = summarizeBuildResult(buildResult);
      lastBuild = summary;
      if (summary.committed) commandRan = true;
      observations.push(`BUILD RESULT: ${JSON.stringify(summary)}`);
      continue;
    }

    observations.push(`Unknown action "${decision.action}". Respond with {"action":"reply",...} to Adam now.`);
  }

  if (lastBuild) {
    return {
      reply: formatBuildReply(lastBuild),
      command_ran: lastBuild.committed === true,
      ok: lastBuild.committed === true,
      build: lastBuild,
      steps: MAX_STEPS,
      communication_law: { skipped: true, reason: 'structured_build_receipt' },
    };
  }
  const exhausted = finalizeHumanReply(
    'I could not settle on a clear response. Say that again more directly and I will answer or act.',
  );
  return {
    reply: exhausted.reply,
    command_ran: false,
    ok: false,
    build: null,
    steps: MAX_STEPS,
    communication_law: exhausted.communication_law,
  };
}

export default runChairDirectAgent;
