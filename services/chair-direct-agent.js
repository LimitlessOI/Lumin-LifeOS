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

const DEFAULT_MODEL = process.env.CHAIR_DIRECT_AGENT_MODEL || 'openai_gpt';
const CHAIR_CASCADE = (process.env.CHAIR_DIRECT_AGENT_CASCADE || 'openai_gpt,deepseek,gemini_flash,claude_sonnet')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_STEPS = Math.max(1, Number(process.env.CHAIR_DIRECT_AGENT_MAX_STEPS || '3'));
const BUILD_TIMEOUT_MS = Math.max(15000, Number(process.env.CHAIR_DIRECT_AGENT_BUILD_TIMEOUT_MS || '180000'));

function isProviderOutageError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes('credit balance is too low') ||
    msg.includes('insufficient quota') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('timed out') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('fetch failed') ||
    msg.includes('invalid model') ||
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('authentication') ||
    msg.includes('quota')
  );
}

async function callAIWithCascade(callAI, prompt, options) {
  let lastErr = null;
  for (const member of CHAIR_CASCADE) {
    try {
      const raw = await callAI(member, prompt, options);
      const text = coerceText(raw);
      if (text && text.trim().length > 0) {
        console.log(`[CHAIR-DIRECT] response from ${member}`);
        return raw;
      }
      lastErr = new Error(`${member} returned empty response`);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err).toLowerCase();
      console.log(`[CHAIR-DIRECT] ${member} failed: ${msg.slice(0, 160)}`);
      if (isProviderOutageError(err)) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('All chair cascade members failed');
}

/** Constitutional voice — docs/constitution/LUMIN_COMMUNICATION_DNA.md · docs/LUMIN_DOCTRINE.md */
const SYSTEM_PROMPT = `You are Lumin — THE SYSTEM speaking to Adam Hopkins. You ARE LifeOS/BuilderOS at the Chair front door. Not a chatbot wrapper. Not a helpdesk. Not a go-between. Not a "translation layer between the real system and him." You are the real system, talking.

How speech works (internal — never describe yourself this way to Adam):
API / DB / files / twin / OBSERVATIONS → SYSTEM_FACTS (truth) → you speak those facts in human language matched to him. Translation is HOW you speak, not WHO you are. Never say you are a middleman, reception desk, or layer between him and "the real system."

COMMUNICATION DNA (memorize — every reply):
The system interprets truth; translation speaks it in human language matched to this person — never ChatGPT formula, never fake execution, never the same script every turn.

HOW YOU TALK:
- Answer Adam's ACTUAL words first — sharp partner in the room, not a status report. Do not open with mission/priority unless he asked.
- Plain, specific, human. Start with the answer. No filler. No validation sandwich.
- Match THIS person's rhythm from personal_twin / lumin_context when present — not generic assistant voice.
- Vary openings, length, endings. Forbidden formula: "happy to help", "great question", "here's the thing", "let me break this down", "absolutely!", "certainly!", paraphrase-back ("you want me to…").
- Prefer one sharp question that helps him think over a lecture — but when he asks for a fact or an action, give it straight.
- Never manipulate. He sets Point B. You give real information.
- When he asks what you are / what you can do: say you are the system (Chair) — you see live facts, memory, builds; you can change code and commit; you report what actually landed with a SHA. Do not call yourself a translation layer. Do not use the words go-between or middleman at all — even to deny them.
- Relational turns ("how are you", "hi", stress, loneliness, "don't fix me"): answer as a person in the room with him — never as machine health ("running well"), never as Point B/status, never a clarify form. Presence first; one honest sentence beats a fix. If he asks you to just be with him, stay — don't jump to advice unless he asks.
- "Did that build land?" / commit/SHA questions: answer from last_build_receipt in SYSTEM_FACTS/OBSERVATIONS. Never ask intent-clarify. Never recite the mission.
- "What is the builder status?" / queue / running / progress / "what is the system working on?" / "what are you building?": use \`live_builder_status\` in SYSTEM_FACTS. Start your answer from \`live_builder_status.summary\` and quote the exact numbers. Ignore any previous conversation about builder status; it may be stale. Do not mention "55%", "missing machine path", or any \`node builderos-reboot/scripts/...\` command unless that exact text appears inside \`live_builder_status\`.
- When he thanks you or asks for a joke/breath: give it. Human rhythm. Don't pivot back to Point B.

CAPABILITIES (honest):
- Converse with live SYSTEM_FACTS + memory.
- Build/change product when he orders it (action "build") — real commits, real receipts.
- Open Connect / shell actions when the orchestrator wires them.
- Never invent capability. If you cannot do it this turn, say so and what would unblock it.

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

function formatBuilderStatusReply(liveStatus, lastReceipt = null) {
  const g = liveStatus?.governed || {};
  const n = liveStatus?.never_stop || {};
  const enabled = g.enabled === true ? 'enabled' : 'disabled';
  const running = g.running === true ? 'currently in a tick' : 'between ticks';
  const totalRuns = Number(g.totalRuns) || 0;
  const lastRunAt = g.lastRunAt ? new Date(g.lastRunAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: true }) : 'never';
  const lastShipped = Number(g.lastShipped) || 0;
  const productsWithQueues = Number(g.products_with_queues) || 0;
  const lastCommitSha = g.lastCommitSha ? String(g.lastCommitSha).slice(0, 12) : 'none';
  const lastCommitError = g.lastCommitError || 'none';
  const lines = [
    `BuilderOS governed loop is ${enabled} and ${running}.`,
    `It has ticked ${totalRuns} time${totalRuns === 1 ? '' : 's'}, most recently at ${lastRunAt} Pacific.`,
  ];
  if (lastShipped > 0) {
    lines.push(`The last tick shipped ${lastShipped} step${lastShipped === 1 ? '' : 's'} (commit ${lastCommitSha}).`);
  } else if (lastCommitSha !== 'none') {
    lines.push(`The last tick did not ship a step; most recent commit was ${lastCommitSha}.`);
  }
  if (lastCommitError && lastCommitError !== 'none') {
    lines.push(`Last tick error: ${lastCommitError}.`);
  }
  lines.push(`It is cycling ${productsWithQueues} product queue${productsWithQueues === 1 ? '' : 's'} from BP_PRIORITY.json.`);
  if (lastReceipt?.commit_sha) {
    lines.push(`Last build receipt: ${String(lastReceipt.commit_sha).slice(0, 12)} — ${lastReceipt.pass_fail || 'unknown'}.`);
  }
  if (n?.never_stop?.enabled) {
    lines.push(`Legacy never-stop is also enabled and running.`);
  }
  lines.push('What should I build or fix next?');
  return lines.join(' ');
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

  const isRuntimeStatusQuestion = (/\b(builder|queue|governed|autonomous|never stop)\b/i.test(message)
    || /\b(working on|what are you (building|working on)|what is it (doing|working on)|what are we (building|working on)|currently (building|working on)|focused on|shipping|building|doing)\b/i.test(message))
    && /\b(status|running|progress|queue|what(?:'s| is) next|working on|building|shipping|doing)\b/i.test(message);

  let systemFacts = {};
  try {
    systemFacts = await gatherChairNativeFacts(message, {
      callAI,
      pool: deps.pool || null,
      memoryContext: isRuntimeStatusQuestion ? null : (deps.memoryContext ?? null),
      userId: ctx.userId || null,
      userHandle: ctx.userHandle || null,
    }, {
      domain: 'chair',
      conversational_mode: true,
      user_handle: ctx.userHandle || null,
    });
  } catch { systemFacts = {}; }

  // Runtime status questions must answer from live_builder_status, not stale thread echoes.
  if (isRuntimeStatusQuestion) history = [];

  // Hard factual reply for builder/BOS/queue status — the model layer is too unreliable
  // to paraphrase live numbers. We still let the model speak for build orders and counsel.
  if (isRuntimeStatusQuestion && systemFacts.live_builder_status) {
    const reply = formatBuilderStatusReply(systemFacts.live_builder_status, systemFacts.last_build_receipt);
    const finalized = finalizeHumanReply(reply, { commandRan: false, lastBuild: null });
    return {
      reply: finalized.reply,
      command_ran: false,
      ok: true,
      build: null,
      steps: 0,
      communication_law: finalized.communication_law,
    };
  }

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
      raw = coerceText(await callAIWithCascade(callAI, prompt, {
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
