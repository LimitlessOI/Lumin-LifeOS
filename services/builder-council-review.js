/**
 * services/builder-council-review.js
 *
 * Pre-build council review. Runs BEFORE the builder agent starts any segment.
 *
 * Five lenses applied in parallel:
 *   1. Consequences Scout    — unintended side effects, what could go wrong (Groq, free)
 *   2. Time Traveler         — 2-year retrospective (DeepSeek R1, free)
 *   3. Trend Scout           — industry direction (Perplexity/Gemini, free)
 *   4. Great Minds + Adam    — persona filter + Adam Decision Profile (Claude Sonnet + extended thinking)
 *   5. Codebase Coherence    — feeds entire relevant codebase to Gemini 2.5 Pro (1M ctx window)
 *                              finds conflicts, duplication, pattern violations BEFORE a line is written
 *
 * Conflict resolution:
 *   - 3+ lenses say PROCEED → go, inject any CAUTION notes into builder prompt
 *   - 2+ lenses say STOP    → adversarial debate (DeepSeek R1, free) → Claude Opus fallback
 *   - Still no consensus    → NEEDS_HUMAN → logged to pending_adam
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { logVerdict as _logVerdict } from './model-performance.js';

// Maps provider label → canonical model ID for the performance ledger
const PROVIDER_MODEL_MAP = {
  'groq': 'llama-3.3-70b-versatile',
  'deepseek-r1': 'deepseek-r1-distill-llama-70b',
  'gemini': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'cerebras': 'llama3.1-70b',
  'perplexity': 'sonar',
  'claude-3-7-sonnet-thinking': 'claude-3-7-sonnet-20250219',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'skipped': 'none',
  'none': 'none',
};

function providerToGroup(provider) {
  if (provider.startsWith('claude')) return 'anthropic';
  if (provider.startsWith('gemini') || provider === 'gemini-2.5-pro') return 'gemini';
  if (provider === 'deepseek-r1') return 'groq'; // served via Groq API
  if (provider === 'perplexity') return 'perplexity';
  if (provider === 'cerebras') return 'cerebras';
  return 'groq';
}

// ── Personas ──────────────────────────────────────────────────────────────────

export const PERSONAS = {
  edison: {
    name: 'Thomas Edison',
    philosophy: `Iterate relentlessly. Fail cheap, fail fast, learn faster. Protect the core invention.
Test everything — no assumption is too small to verify. 1% inspiration, 99% perspiration.
Success is systematic elimination of what doesn't work.`,
    lens: 'Is this approach testable and iterative? Are we solving the core problem or the surface one? What would we find if we tested every assumption here?',
  },
  tesla: {
    name: 'Nikola Tesla',
    philosophy: `Think 50 years ahead. The elegant solution often seems impossible first.
Convention is the enemy of progress. The best design has no redundant parts.
Visualize the complete system before writing a single line. Problems solved at the architecture level are never solved at the code level.`,
    lens: 'Are we thinking too small? What is the theoretical ideal ignoring current constraints? What are we building that will look embarrassingly wrong in a decade?',
  },
  musk: {
    name: 'Elon Musk',
    philosophy: `First principles only — physics limits only, everything else is overhead.
Delete before you add. The best part is no part. The best process is no process.
Speed and simplicity win. Complexity is a tax on the future.
If you're not embarrassed by v1, you shipped too late.`,
    lens: 'What can we delete from this plan? Are we adding complexity that physics doesn\'t require? Is there a 10x simpler version of this that solves 90% of the problem?',
  },
  jobs: {
    name: 'Steve Jobs',
    philosophy: `The user experience IS the product. Simplicity is the ultimate sophistication.
Say no to 1000 things. Focus is knowing what not to do.
People don't know what they want until you show it to them.
Design is not what it looks like — it's how it works.`,
    lens: 'Is this beautiful and inevitable? Would a user love this or just use it? Are we building what users asked for or what they actually need?',
  },
};

// ── Adam Decision Profile ─────────────────────────────────────────────────────
// Seed knowledge about Adam's known patterns.
// Over time, adam_decision_profile DB table will augment this with real data.

const ADAM_SEED_PROFILE = `
Adam Hopkins — Known Decision Patterns:

ALWAYS prioritizes:
- System automation over manual steps. If a human has to click it, it should be an API call.
- Zero waste. No AI token burns without proven useful work.
- Revenue impact first. Does this generate money or save significant time?
- Real estate / TC domain work is the current highest priority.
- Working code shipped fast beats perfect code shipped slow.
- Adaptability and longevity — builds that flex when the market moves.

CONSISTENTLY avoids:
- Feature bloat — one focused thing done excellently beats five half-baked things.
- Over-engineering. If three lines do the job, don't write a class.
- Touching server.js. Ever.
- Building things the system can already do.
- Asking Adam to manually operate any UI the system has an API for.

WHEN IN DOUBT, Adam chooses:
- The path that removes him from the execution loop entirely.
- The approach that compounds — each build makes the next build faster.
- The option that would make sense to a senior developer with no context.
`.trim();

// ── Model routing: best model for each job ────────────────────────────────────
//
// Consequences Scout  → Groq Llama              (fast scan, high throughput, free)
// Time Traveler       → DeepSeek R1 via Groq    (deep reasoning, free — beats Gemini here)
// Trend Scout         → Perplexity              (live web search) → Gemini fallback
// Great Minds + Adam  → Claude Sonnet + extended thinking  (persona + reasoning scratchpad)
// Adversarial Debate  → DeepSeek R1 via Groq    primary (free Opus-level reasoning)
//                     → Claude Opus             fallback (paid, if DeepSeek unavailable)
//
// Cost optimizations active:
//   Prompt caching: static system content (personas, Adam profile) cached at ~10% token cost
//   Extended thinking: Sonnet reasons through scratchpad before answering — deeper than direct
//   DeepSeek R1: free, matches Opus on reasoning benchmarks, strips <think> tags automatically

// ── Anthropic caller — prompt caching + optional extended thinking ────────────

async function callAnthropic(prompt, systemPrompt = '', model = null, opts = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const selectedModel = model || process.env.COUNCIL_REVIEW_MODEL || 'claude-sonnet-4-6';
  const useThinking = opts.extendedThinking && selectedModel.includes('3-7');
  const thinkingBudget = opts.thinkingBudget || 8000;

  const headers = {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };

  const betas = [];
  if (opts.cache) betas.push('prompt-caching-2024-07-31');
  if (useThinking) betas.push('thinking-2025-02-19');
  if (betas.length) headers['anthropic-beta'] = betas.join(',');

  const body = {
    model: selectedModel,
    max_tokens: useThinking ? thinkingBudget + 2000 : 1200,
    temperature: useThinking ? 1 : 0.3, // extended thinking requires temp: 1
    messages: [{
      role: 'user',
      content: opts.cache
        ? [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }]
        : prompt,
    }],
  };

  if (systemPrompt) {
    // Cache static system content (personas, Adam profile) — ~90% savings on repeat calls
    body.system = opts.cache
      ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
      : systemPrompt;
  }

  if (useThinking) body.thinking = { type: 'enabled', budget_tokens: thinkingBudget };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Extended thinking returns both a thinking block and a text block — return text only
  const textBlock = data.content?.find(b => b.type === 'text');
  return textBlock?.text ?? data.content?.[0]?.text ?? '';
}

// ── DeepSeek R1 via Groq — free Opus-level reasoning ─────────────────────────
//
// deepseek-r1-distill-llama-70b matches Claude Opus on reasoning benchmarks.
// Available free on Groq. Routes to Time Traveler and Adversarial Debate —
// tasks that need genuine multi-step reasoning, not just fast token generation.
// Strips <think>...</think> reasoning blocks automatically; returns final answer only.

async function callDeepSeek(prompt, systemPrompt = '') {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-r1-distill-llama-70b',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek/Groq API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content ?? '';
  // Strip R1 reasoning scratchpad — keep only the final answer
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return text;
}

async function callPerplexity(prompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not set');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Free-tier API caller ──────────────────────────────────────────────────────

async function callGroq(prompt, systemPrompt = '') {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(prompt) {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_KEY not set');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Gemini 2.5 Pro — 1M token context for full-codebase analysis ──────────────
//
// Gemini 2.5 Pro's 1M token context window lets us feed the entire relevant
// codebase (amendment + route files + service files) into a single call.
// This powers the Codebase Coherence lens — the only lens that can see
// conflicts, duplicates, and pattern violations before a line is written.

async function callGeminiPro(prompt, systemInstruction = '') {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_KEY not set');

  const model = process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: 0.2 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Gemini Pro API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Build codebase context for Gemini 2.5 Pro ────────────────────────────────
// Reads the amendment + all route/service files matching the project slug.
// Trims to 400k chars (well within 1M token budget, leaves room for analysis).

function buildCodebaseContext(projectSlug, amendmentPath, rootDir, maxChars = 400_000) {
  const files = [];

  // 1. Amendment file (highest priority — defines all the rules)
  if (amendmentPath) {
    try {
      const content = fs.readFileSync(path.join(rootDir, amendmentPath), 'utf8');
      files.push({ name: amendmentPath, content: content.slice(0, 30_000), priority: 0 });
    } catch { /* not fatal */ }
  }

  // 2. CLAUDE.md — project-wide rules the builder must follow
  try {
    const content = fs.readFileSync(path.join(rootDir, 'CLAUDE.md'), 'utf8');
    files.push({ name: 'CLAUDE.md', content: content.slice(0, 15_000), priority: 1 });
  } catch { /* not fatal */ }

  // 3. Source files matching the project slug (routes + services + core + startup)
  const slugVariants = [
    projectSlug,
    projectSlug.replace(/_/g, '-'),
    projectSlug.replace(/-/g, '_'),
  ];
  const srcDirs = ['routes', 'services', 'core', 'startup'];
  for (const dir of srcDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.js')) continue;
      if (slugVariants.some(v => file.includes(v))) {
        try {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
          files.push({ name: `${dir}/${file}`, content: content.slice(0, 20_000), priority: 2 });
        } catch { /* not fatal */ }
      }
    }
  }

  // Sort by priority, build context string, stop when we hit the char limit
  files.sort((a, b) => a.priority - b.priority);
  let total = 0;
  const parts = [];
  for (const f of files) {
    if (total + f.content.length > maxChars) break;
    parts.push(`${'='.repeat(60)}\nFILE: ${f.name}\n${'='.repeat(60)}\n${f.content}`);
    total += f.content.length;
  }
  return { context: parts.join('\n\n'), fileCount: parts.length, charCount: total };
}

async function callCerebras(prompt, systemPrompt = '') {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('CEREBRAS_API_KEY not set');

  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CEREBRAS_MODEL || 'llama3.1-8b',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Cerebras API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Pick a caller based on what keys are available, with fallback chain
async function callFreeModel(prompt, systemPrompt = '', preferredProvider = 'groq') {
  const providers = [preferredProvider, 'groq', 'gemini', 'cerebras'].filter(Boolean);
  for (const p of [...new Set(providers)]) {
    try {
      if (p === 'groq')     return { text: await callGroq(prompt, systemPrompt), provider: 'groq' };
      if (p === 'gemini')   return { text: await callGemini(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt), provider: 'gemini' };
      if (p === 'cerebras') return { text: await callCerebras(prompt, systemPrompt), provider: 'cerebras' };
    } catch (e) {
      // try next provider
    }
  }
  throw new Error('All free-tier providers failed or no API keys configured');
}

// ── Web search (optional, used by Trend Scout) ────────────────────────────────

async function webSearch(query) {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!braveKey) return null;

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveKey,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.web?.results || [])
      .map(r => `${r.title}: ${r.description}`)
      .join('\n');
  } catch { return null; }
}

// ── Parse verdict from model response ────────────────────────────────────────

function parseVerdict(text) {
  const upper = text.toUpperCase();
  if (upper.includes('VERDICT: STOP') || upper.includes('VERDICT:STOP'))   return 'STOP';
  if (upper.includes('VERDICT: CAUTION') || upper.includes('VERDICT:CAUTION')) return 'CAUTION';
  if (upper.includes('VERDICT: PROCEED') || upper.includes('VERDICT:PROCEED')) return 'PROCEED';
  // Fallback: scan for strong language
  if (upper.includes('DO NOT PROCEED') || upper.includes('SHOULD NOT BUILD')) return 'STOP';
  if (upper.includes('SIGNIFICANT RISK') || upper.includes('MAJOR CONCERN'))  return 'CAUTION';
  return 'PROCEED'; // default: trust the model's positive framing
}

// ── Load Adam profile (live twin DB → seed fallback) ─────────────────────────
// Priority order:
//   1. Live adam_profile (built by twin-auto-ingest.js from all conversations)
//   2. Recent decisions from adam_decision_profile (builder-specific patterns)
//   3. ADAM_SEED_PROFILE constants (always included as baseline)

async function loadAdamProfile(pool) {
  if (!pool) return ADAM_SEED_PROFILE;

  let liveProfileText = '';
  let decisionPatternText = '';

  // 1. Pull the live twin profile (synthesized from all conversations)
  try {
    const { rows: [profileRow] } = await pool.query(`
      SELECT profile, summary, decision_count, created_at
      FROM adam_profile WHERE is_current = TRUE LIMIT 1
    `);
    if (profileRow) {
      const p = typeof profileRow.profile === 'string'
        ? JSON.parse(profileRow.profile)
        : (profileRow.profile || {});

      liveProfileText = `
LIVE DIGITAL TWIN PROFILE (synthesized from ${profileRow.decision_count} real interactions, built ${new Date(profileRow.created_at).toLocaleDateString()}):

Summary: ${profileRow.summary || 'Not yet synthesized'}
Core Values: ${(p.core_values || []).join(', ')}
Decision Patterns: ${(p.decision_patterns || []).join(' | ')}
Priorities: ${(p.priorities_order || []).join(' → ')}
Red Lines: ${(p.red_lines || []).join(' | ')}
Simulation Heuristics: ${(p.simulation_heuristics || []).join(' | ')}`.trim();
    }
  } catch { /* non-fatal — fall through to seed */ }

  // 2. Pull recent builder-specific decision patterns (approve/reject/override)
  try {
    const { rows } = await pool.query(`
      SELECT context, predicted_choice, actual_choice, was_correct
      FROM adam_decision_profile
      WHERE actual_choice IS NOT NULL
      ORDER BY created_at DESC LIMIT 15
    `);
    if (rows.length > 0) {
      const correct = rows.filter(r => r.was_correct).length;
      const accuracy = Math.round((correct / rows.length) * 100);
      decisionPatternText = `\n\nBUILDER DECISION ACCURACY: ${accuracy}% (${correct}/${rows.length} correct predictions)\nRecent: ${
        rows.slice(0, 5).map(r =>
          `"${r.context?.slice(0, 60)}" → Adam chose: ${r.actual_choice}`
        ).join(' | ')
      }`;
    }
  } catch { /* non-fatal */ }

  // Compose: live twin first (most accurate), then builder patterns, then seed
  const sections = [ADAM_SEED_PROFILE];
  if (liveProfileText) sections.push(liveProfileText);
  if (decisionPatternText) sections.push(decisionPatternText);
  return sections.join('\n\n');
}

// ── The Four Lenses ───────────────────────────────────────────────────────────

async function lensConsequences(taskContext) {
  const prompt = `You are a CONSEQUENCES SCOUT. Your only job is to find what could go wrong that the builders haven't thought of.

TASK BEING EVALUATED:
${taskContext}

Analyze this task for:
1. Unintended technical consequences (what breaks elsewhere when this is built?)
2. Unintended user consequences (how might a real user misuse or be frustrated by this?)
3. Unintended business consequences (what if this works exactly as planned but causes a problem?)
4. What's NOT in this plan that will definitely come up once it's built?

Be specific. Not "it could fail" but "if X happens, then Y breaks because Z."

End your response with exactly one line:
VERDICT: PROCEED | CAUTION | STOP`;

  const { text, provider } = await callFreeModel(prompt, '', 'groq');
  return {
    lens: 'consequences',
    provider,
    response: text,
    verdict: parseVerdict(text),
    notes: text.split('\n').filter(l => l.trim()).slice(0, 6).join(' | '),
  };
}

async function lensTimeTravel(taskContext) {
  const prompt = `You are a TIME TRAVELER looking back from 2028 at a software decision made in early 2026.

TASK THAT WAS BUILT IN 2026:
${taskContext}

From 2028, answer:
1. What did the team wish they had included from day one that they had to retrofit later?
2. What did they build that turned out to be unnecessary overhead?
3. What assumption baked into this that turned out to be wrong?
4. What technology or competitor move in 2026-2028 made this approach look dated?
5. The ONE change they could have made in 2026 that would have saved the most pain.

Be specific and concrete. You know how this played out.

End your response with exactly one line:
VERDICT: PROCEED | CAUTION | STOP`;

  // DeepSeek R1 — free, matches Opus on reasoning. Ideal for the deep
  // multi-step analysis this lens requires. Gemini fallback if unavailable.
  let text, provider;
  try {
    text = await callDeepSeek(prompt);
    provider = 'deepseek-r1';
  } catch {
    const r = await callFreeModel(prompt, '', 'gemini');
    text = r.text; provider = r.provider;
  }
  return {
    lens: 'time_traveler',
    provider,
    response: text,
    verdict: parseVerdict(text),
    notes: text.split('\n').filter(l => l.trim()).slice(0, 6).join(' | '),
  };
}

async function lensTrendScout(taskContext, searchResults = null) {
  const searchContext = searchResults
    ? `\nCURRENT WEB SEARCH RESULTS (live data):\n${searchResults}\n`
    : '';

  const prompt = `You are a TREND SCOUT. Your job is to know where an industry is going and whether a given approach leads or lags.
${searchContext}
TASK BEING EVALUATED:
${taskContext}

Analyze:
1. Is this approach aligned with where the industry is heading in 2026-2028?
2. Are there newer, better approaches to this problem emerging?
3. Will competitors be doing something similar in 6-12 months that makes this look dated?
4. Does this position the product as a leader or a follower in this space?
5. What ONE thing could be changed to make this more future-proof?

End your response with exactly one line:
VERDICT: PROCEED | CAUTION | STOP`;

  // Perplexity has live web access — best for trend research. Gemini fallback.
  let text, provider;
  try {
    text = await callPerplexity(prompt);
    provider = 'perplexity';
  } catch {
    const r = await callFreeModel(prompt, '', 'gemini');
    text = r.text; provider = r.provider;
  }
  return {
    lens: 'trend_scout',
    provider,
    response: text,
    verdict: parseVerdict(text),
    notes: text.split('\n').filter(l => l.trim()).slice(0, 6).join(' | '),
  };
}

async function lensGreatMinds(taskContext, personaKey, adamProfile) {
  const persona = PERSONAS[personaKey] || PERSONAS.musk;

  const prompt = `You are applying two filters to evaluate a software build decision.

FILTER 1 — ${persona.name}:
${persona.philosophy}
Question: ${persona.lens}

FILTER 2 — Adam Hopkins (the product owner):
${adamProfile}

TASK BEING EVALUATED:
${taskContext}

Respond in this exact JSON format (no markdown, raw JSON only):
{
  "risk": "one specific risk this approach creates",
  "upside": "the strongest argument for proceeding",
  "missing_assumption": "the most dangerous unverified assumption in this plan",
  "concrete_change": "one specific change that would make this significantly better",
  "verdict": "PROCEED|CAUTION|STOP"
}`;

  // Claude 3.7 Sonnet with extended thinking — the reasoning scratchpad makes
  // persona simulation dramatically more accurate than a direct completion.
  // Falls back to standard Sonnet (no thinking), then Groq if no Anthropic key.
  let text, provider;
  try {
    text = await callAnthropic(prompt, '', 'claude-3-7-sonnet-20250219', {
      extendedThinking: true,
      thinkingBudget: 6000,
      cache: true, // persona + Adam profile are static — cache for 90% savings
    });
    provider = 'claude-3-7-sonnet-thinking';
  } catch {
    try {
      text = await callAnthropic(prompt, '', 'claude-sonnet-4-6', { cache: true });
      provider = 'claude-sonnet-4-6';
    } catch {
      const r = await callFreeModel(prompt, '', 'groq');
      text = r.text; provider = r.provider;
    }
  }

  // Parse structured JSON response; fall back to text parsing on failure
  let structured = null;
  let verdict;
  let notes;
  try {
    // Strip any accidental markdown fences before parsing
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    structured = JSON.parse(cleaned);
    verdict = (structured.verdict || 'PROCEED').toUpperCase();
    if (!['PROCEED', 'CAUTION', 'STOP'].includes(verdict)) verdict = 'PROCEED';
    notes = [
      structured.risk && `RISK: ${structured.risk}`,
      structured.upside && `UPSIDE: ${structured.upside}`,
      structured.missing_assumption && `ASSUMPTION: ${structured.missing_assumption}`,
      structured.concrete_change && `CHANGE: ${structured.concrete_change}`,
    ].filter(Boolean).join(' | ');
  } catch {
    // JSON parse failed — fall back to plain text verdict extraction
    verdict = parseVerdict(text);
    notes = text.split('\n').filter(l => l.trim()).slice(0, 6).join(' | ');
  }

  return {
    lens: 'great_minds',
    persona: persona.name,
    provider,
    response: text,
    structured,
    verdict,
    notes,
  };
}

// ── Lens 5: Codebase Coherence — Gemini 2.5 Pro full-codebase analysis ────────
//
// This lens is unique: it feeds the ENTIRE relevant codebase into Gemini 2.5 Pro
// and asks "does this task fit what's already built?"
//
// What the other 4 lenses can't see:
//   - That a function called `buildSiteContext()` already exists and does half this task
//   - That a table called `prospect_sites` already has a column the builder would create again
//   - That this route pattern doesn't match the existing route file structure
//
// This lens catches those things before the builder writes a single file.
// Requires rootDir to read filesystem. Skipped gracefully if not provided.

async function lensCodebaseCoherence(taskContext, { projectSlug, amendmentPath, rootDir }) {
  if (!rootDir) throw new Error('rootDir required for codebase coherence lens');

  const { context, fileCount, charCount } = buildCodebaseContext(projectSlug, amendmentPath, rootDir);
  if (!context) throw new Error('No codebase files found for coherence analysis');

  const prompt = `You are a CODEBASE COHERENCE ANALYST. You have access to the full project source code below.

CODEBASE (${fileCount} files, ${Math.round(charCount / 1000)}k chars):
${context}

TASK BEING EVALUATED:
${taskContext}

Analyze with the full codebase in front of you:

1. CONFLICTS: Will this task conflict with existing code? Name specific files, functions, and line ranges.
2. DUPLICATION: What existing code overlaps with this task? What should be reused instead of rewritten?
3. PATTERN VIOLATIONS: Does this task follow the existing patterns in routes/, services/, amendments?
4. INTEGRATION POINTS: What existing functions, tables, and routes must this task connect to?
5. MISSING DEPENDENCIES: What does the builder need that isn't mentioned in the task description?

Be surgical. Name exact file paths, function names, and DB table/column names.

End your response with exactly one line:
VERDICT: PROCEED | CAUTION | STOP`;

  const text = await callGeminiPro(prompt);
  return {
    lens: 'codebase_coherence',
    provider: 'gemini-2.5-pro',
    filesAnalyzed: fileCount,
    charsAnalyzed: charCount,
    response: text,
    verdict: parseVerdict(text),
    notes: text.split('\n').filter(l => l.trim()).slice(0, 6).join(' | '),
  };
}

// ── Adversarial debate (conflict resolution) ──────────────────────────────────

async function adversarialDebate(taskContext, stopReasons, proceedReasons) {
  const prompt = `You are a DEBATE MODERATOR. Two sides are arguing about whether to build something.

TASK IN QUESTION:
${taskContext}

ARGUMENTS FOR STOPPING:
${stopReasons}

ARGUMENTS FOR PROCEEDING:
${proceedReasons}

Your job:
1. Have the PRO-STOP side argue the STRONGEST version of "we should proceed"
2. Have the PRO-PROCEED side argue the STRONGEST version of "we should stop"
3. After both have argued the opposite, what does the evidence actually say?
4. What is the SPECIFIC condition under which proceeding is safe vs. not safe?
5. What ONE modification to the approach would resolve the conflict?

Give your synthesis and end with exactly one line:
CONSENSUS: PROCEED | CAUTION | STOP | NEEDS_HUMAN

If NEEDS_HUMAN: briefly state what Adam needs to decide.`;

  // Adversarial debate needs genuine multi-step reasoning — not just fluency.
  // DeepSeek R1 via Groq: free, Opus-level reasoning benchmarks, ideal for this.
  // Claude Opus fallback if DeepSeek unavailable. Gemini as final fallback.
  let text, provider;
  try {
    text = await callDeepSeek(prompt);
    provider = 'deepseek-r1';
  } catch {
    try {
      text = await callAnthropic(prompt, '', 'claude-opus-4-6');
      provider = 'claude-opus-4-6';
    } catch {
      const r = await callFreeModel(prompt, '', 'gemini');
      text = r.text; provider = r.provider;
    }
  }
  const upper = text.toUpperCase();
  let consensus = 'NEEDS_HUMAN';
  if (upper.includes('CONSENSUS: PROCEED'))      consensus = 'PROCEED';
  else if (upper.includes('CONSENSUS: CAUTION')) consensus = 'CAUTION';
  else if (upper.includes('CONSENSUS: STOP'))    consensus = 'STOP';

  return { text, consensus, provider };
}

// ── Log decision prediction for Adam profile learning ────────────────────────

async function logAdamPrediction(pool, { segmentId, projectSlug, context, predictedChoice }) {
  if (!pool) return;
  try {
    await pool.query(`
      INSERT INTO adam_decision_profile (segment_id, project_slug, context, predicted_choice, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [segmentId, projectSlug, context, predictedChoice]);
  } catch { /* non-fatal */ }
}

// ── Store review result ───────────────────────────────────────────────────────

async function storeReview(pool, { segmentId, verdict, guidance, perspectives, consensusReached, debateRan, personaUsed }) {
  if (!pool) return;
  try {
    await pool.query(`
      INSERT INTO builder_council_reviews
        (segment_id, verdict, guidance, perspectives, consensus_reached, debate_ran, persona_used, reviewed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [segmentId, verdict, guidance, JSON.stringify(perspectives), consensusReached, debateRan, personaUsed]);
  } catch { /* non-fatal — never let storage failure block a build */ }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * reviewSegment — run the five-lens council review before building a segment.
 *
 * @param {object} opts
 * @param {object}  opts.segment         — project_segments row (id, title, description)
 * @param {object}  opts.project         — projects row (slug, name, amendment_path)
 * @param {string}  [opts.personaKey]    — 'edison'|'tesla'|'musk'|'jobs' (default: 'musk')
 * @param {object}  [opts.pool]          — pg pool for storing results (optional)
 * @param {boolean} [opts.withSearch]    — run web search for trend lens (default: true if BRAVE key)
 * @param {string}  [opts.rootDir]       — repo root path for codebase coherence lens (optional)
 * @param {string}  [opts.reviewTier]    — 'tier_0'|'tier_1'|'tier_2'|'tier_3' (default: 'tier_2')
 * @param {boolean} [opts.marketSensitive] — run Trend Scout on all tiers when true (default: false)
 * @returns {Promise<{
 *   verdict: 'PROCEED'|'CAUTION'|'STOP'|'NEEDS_HUMAN',
 *   guidance: string,
 *   perspectives: object[],
 *   consensusReached: boolean,
 *   humanReason?: string,
 * }>}
 */
export async function reviewSegment({ segment, project, personaKey = 'musk', pool = null, withSearch = true, rootDir = null, reviewTier = 'tier_2', marketSensitive = false, devilsAdvocate = false }) {
  // ── Tier 0: skip council entirely ────────────────────────────────────────────
  if (reviewTier === 'tier_0') {
    return {
      verdict: 'PROCEED',
      guidance: 'tier_0 — council skipped per segment spec',
      perspectives: [],
      consensusReached: true,
      tiered: true,
    };
  }

  // Devil's advocate preamble — forces every lens into adversarial mode.
  // Each model must lead with the strongest case AGAINST building before
  // considering reasons to proceed. Prevents groupthink on obvious wins.
  const devilsPreamble = devilsAdvocate ? `
⚠️  DEVIL'S ADVOCATE MODE ACTIVE ⚠️
Your PRIMARY job is to argue AGAINST building this. Start by assuming the team is too optimistic.
Find the strongest, most specific reasons this should NOT be built right now.
Do NOT be polite. Do NOT assume good intentions make up for bad design.
Only after exhausting every concern may you consider reasons to proceed.
Your verdict should default to STOP or CAUTION unless the case for proceeding is overwhelming.
---
` : '';

  const taskContext = `${devilsPreamble}Project: ${project.name} (${project.slug})
Task: ${segment.title}
Details: ${segment.description || '(none)'}
Amendment: ${project.amendment_path || '(none)'}`.trim();

  // Optionally run a web search for trend context
  const searchResults = withSearch && process.env.BRAVE_SEARCH_API_KEY
    ? await webSearch(`${project.name} ${segment.title} software trends 2026`).catch(() => null)
    : null;

  // Load Adam's profile (seed + DB learning)
  const adamProfile = await loadAdamProfile(pool);

  // ── Trend Scout gating: only run if market_sensitive OR tier_2+ ──────────────
  const runTrendScout = marketSensitive || reviewTier === 'tier_2' || reviewTier === 'tier_3';
  const trendScoutPromise = runTrendScout
    ? lensTrendScout(taskContext, searchResults)
    : Promise.resolve({ lens: 'trend_scout', verdict: 'PROCEED', provider: 'skipped', notes: 'Not market-sensitive — skipped', response: '' });

  // ── Tier 1: consequences + great minds only ───────────────────────────────────
  if (reviewTier === 'tier_1') {
    const [consequences, greatMinds] = await Promise.allSettled([
      lensConsequences(taskContext),
      lensGreatMinds(taskContext, personaKey, adamProfile),
    ]);
    const perspectives = [consequences, greatMinds]
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failedLenses = [consequences, greatMinds]
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message);
    if (failedLenses.length > 0) {
      console.warn(`[COUNCIL] tier_1: ${failedLenses.length} lens(es) failed: ${failedLenses.join('; ')}`);
    }

    if (perspectives.length === 0) {
      return { verdict: 'PROCEED', guidance: 'Council review skipped — no API keys available.', perspectives: [], consensusReached: false };
    }

    const stops   = perspectives.filter(p => p.verdict === 'STOP');
    const cautions = perspectives.filter(p => p.verdict === 'CAUTION');
    const proceeds = perspectives.filter(p => p.verdict === 'PROCEED');
    let verdict = stops.length >= 1 ? 'STOP' : cautions.length >= 1 ? 'CAUTION' : 'PROCEED';
    const guidance = verdict === 'STOP'
      ? `STOP: ${stops.map(p => p.notes).join(' | ')}`
      : verdict === 'CAUTION'
      ? `PROCEED WITH CAUTION: ${cautions.map(p => p.notes).join(' | ')}`
      : 'Proceed.';

    await storeReview(pool, { segmentId: segment.id, verdict, guidance, perspectives, consensusReached: true, debateRan: false, personaUsed: personaKey });
    return { verdict, guidance, perspectives, consensusReached: true };
  }

  // ── Tier 2: all five lenses (current behavior) ────────────────────────────────
  // ── Tier 3: all five lenses + always debate + PROCEED → NEEDS_HUMAN ───────────
  const coherenceArgs = { projectSlug: project.slug, amendmentPath: project.amendment_path, rootDir };
  const [consequences, timeTravel, trendScout, greatMinds, codebaseCoherence] = await Promise.allSettled([
    lensConsequences(taskContext),
    lensTimeTravel(taskContext),
    trendScoutPromise,
    lensGreatMinds(taskContext, personaKey, adamProfile),
    rootDir ? lensCodebaseCoherence(taskContext, coherenceArgs) : Promise.reject(new Error('rootDir not provided — coherence lens skipped')),
  ]);

  const perspectives = [consequences, timeTravel, trendScout, greatMinds, codebaseCoherence]
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  // Failed lenses don't block — log and continue
  const failedLenses = [consequences, timeTravel, trendScout, greatMinds]
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message);
  if (failedLenses.length > 0) {
    console.warn(`[COUNCIL] ${failedLenses.length} lens(es) failed: ${failedLenses.join('; ')}`);
  }

  if (perspectives.length === 0) {
    // All lenses failed (no API keys?) — default to proceed with warning
    return {
      verdict: 'PROCEED',
      guidance: 'Council review skipped — no free-tier API keys available. Configure GROQ_API_KEY, GOOGLE_AI_KEY, or CEREBRAS_API_KEY.',
      perspectives: [],
      consensusReached: false,
    };
  }

  // Tally verdicts
  const stops   = perspectives.filter(p => p.verdict === 'STOP');
  const cautions = perspectives.filter(p => p.verdict === 'CAUTION');
  const proceeds = perspectives.filter(p => p.verdict === 'PROCEED');

  let verdict;
  let guidance;
  let consensusReached = true;
  let debateRan = false;
  let humanReason;

  // Unknowns budget — if 4+ lenses flag issues, too many unknowns to proceed safely
  if (stops.length + cautions.length >= 4) {
    return {
      verdict: 'NEEDS_HUMAN',
      guidance: `UNKNOWNS BUDGET EXCEEDED: ${stops.length} STOP + ${cautions.length} CAUTION across ${perspectives.length} lenses. Too many unknowns to proceed autonomously.`,
      perspectives,
      consensusReached: false,
      humanReason: `${stops.length + cautions.length} of ${perspectives.length} lenses flagged issues. Requires human review before building.`,
    };
  }

  if (stops.length >= 2 || reviewTier === 'tier_3') {
    // Significant disagreement OR tier_3 always debates — run adversarial debate
    debateRan = true;
    const stopReasons = stops.map(p => p.notes).join('\n') || '(no explicit stops — tier_3 mandatory debate)';
    const proceedReasons = proceeds.concat(cautions).map(p => p.notes).join('\n') || '(no explicit proceeds)';
    const debate = await adversarialDebate(taskContext, stopReasons, proceedReasons).catch(() => ({
      consensus: 'NEEDS_HUMAN',
      text: 'Debate failed — escalating to human',
      provider: 'none',
    }));
    perspectives.push({ lens: 'adversarial_debate', ...debate });

    // tier_3: even a PROCEED verdict requires human sign-off
    if (reviewTier === 'tier_3' && debate.consensus === 'PROCEED') {
      verdict = 'NEEDS_HUMAN';
      consensusReached = false;
      humanReason = 'tier_3 segment — PROCEED verdict still requires human sign-off before building.';
    } else {
      verdict = debate.consensus;
      consensusReached = debate.consensus !== 'NEEDS_HUMAN';
    }

    if (verdict === 'NEEDS_HUMAN' && !humanReason) {
      const needsLine = debate.text.split('\n').find(l => l.toUpperCase().includes('NEEDS_HUMAN'));
      humanReason = needsLine?.replace(/NEEDS_HUMAN[:\s]*/i, '').trim()
        || 'Council could not reach consensus — human judgment required';
    }
    guidance = `DEBATE RESULT: ${debate.consensus}\n${debate.text.slice(0, 600)}`;

  } else if (stops.length === 1 || cautions.length >= 2) {
    // Cautionary — proceed but inject guidance
    verdict = 'CAUTION';
    const cautionNotes = [...stops, ...cautions]
      .map(p => `[${p.lens}] ${p.notes}`)
      .join('\n');
    guidance = `PROCEED WITH CAUTION. Council flagged the following — address these in your implementation:\n${cautionNotes}`;

  } else {
    verdict = 'PROCEED';
    guidance = proceeds.length > 0
      ? `All lenses agree: proceed. ${cautions.length > 0 ? `Minor notes: ${cautions.map(p => p.notes).join(' | ')}` : ''}`
      : 'Proceed.';
  }

  // Log Adam prediction for profile learning
  const adamLens = perspectives.find(p => p.lens === 'great_minds');
  if (adamLens && pool) {
    await logAdamPrediction(pool, {
      segmentId: segment.id,
      projectSlug: project.slug,
      context: `${segment.title}: ${segment.description || ''}`.slice(0, 500),
      predictedChoice: verdict === 'PROCEED' ? 'approve' : verdict === 'STOP' ? 'reject' : 'modify',
    });
  }

  // Store review
  await storeReview(pool, {
    segmentId: segment.id,
    verdict,
    guidance,
    perspectives,
    consensusReached,
    debateRan,
    personaUsed: personaKey,
  });

  // Log per-lens verdicts to model performance ledger (non-fatal)
  // Determine majority verdict so we can flag consensus vs dissent per model.
  // Majority = the verdict held by more than half of scored lenses (excl. debate/skipped).
  if (pool && segment.id) {
    const scoredPerspectives = perspectives.filter(
      p => p.lens && p.verdict && p.provider !== 'skipped' && p.lens !== 'adversarial_debate'
    );
    const verdictCounts = scoredPerspectives.reduce((acc, p) => {
      acc[p.verdict] = (acc[p.verdict] || 0) + 1;
      return acc;
    }, {});
    const majorityVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    for (const p of scoredPerspectives) {
      _logVerdict(pool, {
        segmentId: segment.id,
        lens: p.lens,
        model: PROVIDER_MODEL_MAP[p.provider] || p.provider,
        provider: providerToGroup(p.provider || ''),
        verdict: p.verdict,
        wasConsensusPosition: majorityVerdict ? p.verdict === majorityVerdict : null,
      }).catch(() => {});
    }
  }

  return { verdict, guidance, perspectives, consensusReached, humanReason };
}

/**
 * formatCouncilSummary — human-readable summary for logs
 */
export function formatCouncilSummary(review) {
  const icons = { PROCEED: '✅', CAUTION: '⚠️', STOP: '🛑', NEEDS_HUMAN: '🙋' };
  const lines = [
    `${icons[review.verdict] || '?'} Council verdict: ${review.verdict}`,
    review.perspectives.map(p =>
      `  [${p.lens}${p.persona ? '/' + p.persona : ''}] ${p.verdict || p.consensus} — ${(p.provider || '')}`
    ).join('\n'),
    `  Guidance: ${review.guidance?.slice(0, 200)}`,
  ];
  return lines.join('\n');
}
