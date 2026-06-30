/**
 * SYNOPSIS: LifeRE sales coaching simulator — AI plays the client, real-time coaching, objection mastery.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB_PATH = path.join(ROOT, 'config/lifere-objection-library.json');

function loadLibrary() {
  return JSON.parse(readFileSync(LIB_PATH, 'utf8'));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function firstSentence(value, fallback) {
  const clean = normalizeText(value);
  if (!clean) return fallback;
  const parts = clean.split(/(?<=[.!?])\s+/);
  return parts[0] || clean || fallback;
}

function inferQuadrantFromMessage(message) {
  const text = normalizeText(message).toLowerCase();
  if (!text) return null;
  if (/\b(numbers?|data|stats?|market|analy[sz]e|compare|specific)\b/.test(text)) return 'Analytical';
  if (/\b(let'?s|book|meet|today|now|direct|fast|quick|specific)\b/.test(text)) return 'Driver';
  if (/\b(feel|story|excited|family|love|dream|chapter)\b/.test(text)) return 'Expressive';
  if (/\b(understand|help|comfortable|together|open|appreciate)\b/.test(text)) return 'Amiable';
  return null;
}

function chooseObjection(library, scenario, turnCount) {
  const targetIds = Array.isArray(scenario.target_objections)
    ? scenario.target_objections
    : library.objections.map((entry) => entry.id);
  const objectionId = targetIds[(turnCount - 1) % targetIds.length] || targetIds[0];
  return library.objections.find((entry) => entry.id === objectionId) || library.objections[0];
}

function buildFallbackClientResponse({ library, scenario, turnCount, quadrant }) {
  const objection = chooseObjection(library, scenario, turnCount);
  const responseKey = String(quadrant || '').toLowerCase();
  const response =
    objection?.responses?.[responseKey] ||
    objection?.responses?.universal ||
    `I still need more clarity before I feel comfortable moving forward.`;
  return firstSentence(response, response);
}

function buildFallbackCoachingNote({ agentMessage, clientResponse, quadrant }) {
  const agent = normalizeText(agentMessage).toLowerCase();
  const client = normalizeText(clientResponse);
  if (/\b(what|how|when|where|why)\b/.test(agent)) {
    return `GOOD — you asked a diagnostic question | Stay with their pain and mirror their exact words before presenting your solution.`;
  }
  if (/\b(meet|appointment|20-minute|20 minute|next step|listing)\b/.test(agent)) {
    return `CLOSE NOW — you are moving toward commitment | Slow down for one beat, validate the concern, then re-ask for the meeting with a concrete next step.`;
  }
  return `ADJUST — the client is still guarded${quadrant ? ` (${quadrant})` : ''} | Use one short validation, one question, and tie your next line to what they just said: "${firstSentence(client, client)}"`;
}

function buildFallbackDebrief(turns, quadrant) {
  const agentTurns = turns.filter((turn) => turn.role === 'agent');
  const questionCount = agentTurns.filter((turn) => /\?/.test(turn.text || '')).length;
  const closeCount = agentTurns.filter((turn) => /\b(meet|appointment|next step|work together|list)\b/i.test(turn.text || '')).length;
  const empathyCount = agentTurns.filter((turn) => /\b(understand|hear you|makes sense|frustrat)\b/i.test(turn.text || '')).length;
  const talkRatio = Math.min(10, 4 + questionCount + (empathyCount > 0 ? 1 : 0));
  const questionQuality = Math.min(10, 3 + questionCount * 2);
  const objectionHandling = Math.min(10, 3 + empathyCount * 2 + (questionCount > 0 ? 1 : 0));
  const closeTiming = Math.min(10, 2 + closeCount * 3);
  const quadrantAdaptation = quadrant ? 7 : 4;
  const overall = Math.round((talkRatio + questionQuality + objectionHandling + closeTiming + quadrantAdaptation) / 5);

  return {
    scores: {
      talk_ratio: talkRatio,
      question_quality: questionQuality,
      objection_handling: objectionHandling,
      close_timing: closeTiming,
      quadrant_adaptation: quadrantAdaptation,
      overall,
    },
    did_well: questionCount > 0
      ? 'You asked questions instead of steamrolling the seller, which kept the conversation diagnostic.'
      : 'You kept the conversation moving and stayed in the scenario instead of freezing.',
    must_change: empathyCount > 0
      ? 'After validating the concern, tighten your next question so the seller gives you a more precise problem to solve.'
      : 'Validate the emotion before you pitch. Sellers will resist if they feel you are skipping over their frustration.',
    turning_point: closeCount > 0
      ? 'The turning point came when you asked for the next step instead of staying in endless explanation.'
      : 'The turning point was delayed because the conversation stayed exploratory without a concrete ask.',
    _fallback: {
      mode: 'deterministic_fallback',
      quadrant: quadrant || null,
    },
  };
}

const QUADRANT_DETECTION_PROMPT = `Based on the following agent message, infer which personality quadrant the speaker is in:
- Analytical: data-driven, asks many questions, methodical
- Driver: direct, results-focused, impatient, concise
- Expressive: enthusiastic, emotion-led, storytelling, relationship-first
- Amiable: conflict-averse, needs safety, deferential, warm

Message: "{message}"

Reply with ONE word only: Analytical, Driver, Expressive, or Amiable.`;

const CLIENT_PROMPT = `You are playing a real estate client in a sales training simulator. Stay in character.

SCENARIO: {scenario_setup}
YOUR PERSONA: {client_persona}
CURRENT TURN: {turn}

Conversation so far:
{history}

Agent just said: "{agent_message}"

Respond as the client in 1-3 sentences. Stay true to your persona. If the agent is handling you well, warm up slightly. If they're being pushy or generic, dig in harder. Never break character.`;

const COACHING_PROMPT = `You are a real-time sales coach monitoring a training call. Be terse and tactical.

SCENARIO: {scenario_id}
AGENT SAID: "{agent_message}"
CLIENT RESPONDED: "{client_message}"
DETECTED QUADRANT: {quadrant}
TURN: {turn} of session

Your job: Give ONE specific coaching note (max 40 words). Pick the highest-value insight only.

Format: [Observation] | [What to do next]

If the agent is doing well, say: GOOD — [what's working].
If they're losing, say: ADJUST — [specific fix].
If it's a close moment, say: CLOSE NOW — [suggested close].`;

const DEBRIEF_PROMPT = `You are a sales training analyst. Give a post-session debrief.

SCENARIO: {scenario_id}
TURNS: {turns}
TOTAL EXCHANGES: {turn_count}

Full conversation:
{history}

Score the agent across these dimensions (0-10 each):
- talk_ratio (did they listen more than they talked? 10 = listened well)
- question_quality (were questions diagnostic or generic?)
- objection_handling (did they validate before redirecting?)
- close_timing (did they attempt close at the right moments?)
- quadrant_adaptation (did they adapt style to the client's signals?)
- overall (holistic impression)

Then identify:
- 1 thing they did really well
- 1 thing they must change before the next call
- The exact moment the sale was won or lost

Respond in this JSON structure:
{
  "scores": {
    "talk_ratio": X,
    "question_quality": X,
    "objection_handling": X,
    "close_timing": X,
    "quadrant_adaptation": X,
    "overall": X
  },
  "did_well": "...",
  "must_change": "...",
  "turning_point": "..."
}`;

export function createLifeRESalesSimulator({ pool, callAI }) {
  const library = loadLibrary();

  async function safeCallAI(prompt) {
    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : String(raw?.content || raw?.text || raw?.message || '');
      const clean = normalizeText(text);
      if (!clean) throw new Error('empty_ai_response');
      return clean;
    } catch (error) {
      return { __fallbackError: String(error?.message || error) };
    }
  }

  function getScenario(scenarioId) {
    const scenario = library.scenarios[scenarioId];
    if (!scenario) throw Object.assign(new Error(`Unknown scenario: ${scenarioId}`), { statusCode: 400 });
    return scenario;
  }

  function historyToText(turns) {
    return turns
      .filter((t) => t.role !== 'coach')
      .map((t) => `${t.role === 'agent' ? 'Agent' : 'Client'}: ${t.text}`)
      .join('\n');
  }

  async function startSession({ ownerId, scenarioId }) {
    const scenario = getScenario(scenarioId);
    const sessionId = randomUUID();
    await pool.query(
      `INSERT INTO lifere_coaching_sessions
         (id, owner_id, scenario_id, status, turns, created_at)
       VALUES ($1, $2, $3, 'active', '[]'::jsonb, NOW())`,
      [sessionId, ownerId, scenarioId]
    );
    return {
      sessionId,
      scenario: {
        id: scenario.id,
        label: scenario.label,
        difficulty: scenario.difficulty,
        setup: scenario.setup,
      },
      opening: `You're about to practice: ${scenario.label}. Scenario: ${scenario.setup}. Start whenever you're ready — type what you'd say to open.`,
    };
  }

  async function agentTurn({ sessionId, ownerId, agentMessage }) {
    const { rows } = await pool.query(
      `SELECT * FROM lifere_coaching_sessions WHERE id = $1 AND owner_id = $2 AND status = 'active'`,
      [sessionId, ownerId]
    );
    if (!rows.length) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

    const session = rows[0];
    const scenario = getScenario(session.scenario_id);
    const turns = session.turns || [];
    const turnCount = turns.filter((t) => t.role === 'agent').length + 1;

    // Detect quadrant from agent's first message
    let quadrant = session.quadrant;
    if (!quadrant && turnCount === 1) {
      const raw = await safeCallAI(QUADRANT_DETECTION_PROMPT.replace('{message}', agentMessage));
      if (typeof raw === 'string') {
        const q = raw.trim().split(/\s/)[0].replace(/[^a-zA-Z]/g, '');
        if (['Analytical', 'Driver', 'Expressive', 'Amiable'].includes(q)) quadrant = q;
      }
      if (!quadrant) quadrant = inferQuadrantFromMessage(agentMessage);
    }

    // Client responds
    const clientPrompt = CLIENT_PROMPT
      .replace('{scenario_setup}', scenario.setup)
      .replace('{client_persona}', scenario.client_persona)
      .replace('{turn}', String(turnCount))
      .replace('{history}', historyToText(turns))
      .replace('{agent_message}', agentMessage);

    const clientRaw = await safeCallAI(clientPrompt);
    const clientResponse = typeof clientRaw === 'string'
      ? clientRaw
      : buildFallbackClientResponse({ library, scenario, turnCount, quadrant });

    // Real-time coaching
    const coachPrompt = COACHING_PROMPT
      .replace('{scenario_id}', session.scenario_id)
      .replace('{agent_message}', agentMessage)
      .replace('{client_message}', clientResponse)
      .replace('{quadrant}', quadrant || 'Unknown')
      .replace('{turn}', String(turnCount));

    const coachRaw = await safeCallAI(coachPrompt);
    const coachingNote = typeof coachRaw === 'string'
      ? coachRaw
      : buildFallbackCoachingNote({ agentMessage, clientResponse, quadrant });

    // Append turns
    const newTurns = [
      ...turns,
      { role: 'agent', text: agentMessage, ts: new Date().toISOString() },
      { role: 'client', text: clientResponse, ts: new Date().toISOString() },
      { role: 'coach', text: coachingNote, ts: new Date().toISOString() },
    ];

    await pool.query(
      `UPDATE lifere_coaching_sessions
       SET turns = $2::jsonb, quadrant = $3, updated_at = NOW()
       WHERE id = $1`,
      [sessionId, JSON.stringify(newTurns), quadrant || session.quadrant]
    );

    return {
      clientResponse,
      coachingNote,
      turnNumber: turnCount,
      detectedQuadrant: quadrant,
    };
  }

  async function endSession({ sessionId, ownerId }) {
    const { rows } = await pool.query(
      `SELECT * FROM lifere_coaching_sessions WHERE id = $1 AND owner_id = $2`,
      [sessionId, ownerId]
    );
    if (!rows.length) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

    const session = rows[0];
    const turns = session.turns || [];
    const scenario = getScenario(session.scenario_id);

    const agentTurns = turns.filter((t) => t.role === 'agent');
    const history = historyToText(turns);

    const debriefPrompt = DEBRIEF_PROMPT
      .replace('{scenario_id}', session.scenario_id)
      .replace('{turns}', JSON.stringify(agentTurns))
      .replace('{turn_count}', String(agentTurns.length))
      .replace('{history}', history);

    let debrief;
    try {
      const raw = await safeCallAI(debriefPrompt);
      if (typeof raw !== 'string') throw new Error(raw.__fallbackError || 'debrief_unavailable');
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}') + 1;
      debrief = JSON.parse(raw.slice(jsonStart, jsonEnd));
    } catch {
      debrief = buildFallbackDebrief(turns, session.quadrant);
    }

    await pool.query(
      `UPDATE lifere_coaching_sessions
       SET status = 'completed', scores = $2::jsonb, debrief = $3::jsonb, completed_at = NOW()
       WHERE id = $1`,
      [sessionId, JSON.stringify(debrief.scores || {}), JSON.stringify(debrief)]
    );

    return {
      sessionId,
      scenario: { id: scenario.id, label: scenario.label },
      turnsCompleted: agentTurns.length,
      debrief,
    };
  }

  function listScenarios() {
    return Object.values(library.scenarios).map((s) => ({
      id: s.id,
      label: s.label,
      difficulty: s.difficulty,
      setup: s.setup,
    }));
  }

  return { startSession, agentTurn, endSession, listScenarios };
}
