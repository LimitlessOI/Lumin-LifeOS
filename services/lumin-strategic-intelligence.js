/**
 * SYNOPSIS: Lumin Chair strategic intelligence — ideas, gaps, competitors, future simulations.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebSearchService } from './web-search-service.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { readMissionObjectiveVerdict } from './lifeos-mission-pipeline-executor.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREDICTION_LOG = path.join(REPO_ROOT, 'data/chair-strategic-predictions.jsonl');

export const CHAIR_STRATEGIC_DOCTRINE = {
  scoreboard: 'Reality is the scoreboard. Results are all that matter.',
  chair_offers: 'Ideas, gaps, missing pieces, competitive context, and future look-back — not listen-only.',
  horizons_months: [6, 12, 24, 36, 60, 120],
  diminishing_return_after_months: 36,
};

export function buildFutureLookBackPrompts(topic = '', productLabel = 'LifeOS / LifeRE') {
  const subject = topic || productLabel;
  return CHAIR_STRATEGIC_DOCTRINE.horizons_months.map((months) => {
    const label = months < 12 ? `${months} months`
      : months === 12 ? '1 year'
        : `${months / 12} years`;
    const confidence = months <= 24 ? 'THINK' : 'GUESS';
    return {
      horizon_months: months,
      horizon_label: label,
      confidence,
      prompts: [
        `In ${label}, what does ${subject} look like if we execute well today?`,
        `What will we wish we learned now?`,
        `What should we change now to avoid regret?`,
        `Are we ahead, behind, or wrong lane vs competitors and AI trajectory?`,
      ],
    };
  });
}

function readJsonIfExists(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

export function buildLocalStrategicNotes(cleanedInput = '', pointBTarget = null) {
  const text = String(cleanedInput || '');
  const pointB = pointBTarget || loadPointBTarget();
  const missionId = pointB?.mission_id || pointB?.target?.mission_id;
  const verdict = missionId ? readMissionObjectiveVerdict(missionId) : null;

  const ideas = [];
  const gaps = [];
  const missing = [];

  if (verdict && verdict.founder_usability_pass === false) {
    gaps.push(`Program Point B (${pointB?.label || 'LifeRE Alpha'}) — machine tests PASS but you have not confirmed usability yet.`);
    missing.push('Your founder success test sentence in plain English — what "done" looks like when you open the app.');
  }

  if (/\b(lifere|life.?re|daily command)\b/i.test(text)) {
    ideas.push('Auto-load daily command + BoldTrail strip on LifeRE open — reduces friction to Point B.');
    gaps.push('LifeRE may look built in receipts but not feel usable until you run one full daily cycle.');
  }

  if (/\b(lumin|chair|voice)\b/i.test(text)) {
    ideas.push('Chair could attach competitive + future brief on every CLARIFY turn (this module).');
    missing.push('Brave/Perplexity keys or LANE_INTEL_ENABLED for always-on online competitor scan.');
  }

  if (/\b(revenue|monetize|boldtrail|crm)\b/i.test(text)) {
    ideas.push('BoldTrail as SoR + LifeRE as daily command layer — competitors often pick one silo; fusion is the moat.');
  }

  if (!ideas.length) {
    ideas.push('State one falsifiable outcome for this ask — Chair can then simulate 6mo/1y/2y against it.');
  }

  return { ideas: ideas.slice(0, 4), gaps: gaps.slice(0, 4), missing: missing.slice(0, 3) };
}

async function loadLatestHorizonFindings(pool, limit = 3) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT f.title, f.body, f.created_at
       FROM lane_intel_findings f
       JOIN lane_intel_runs r ON r.id = f.run_id
       WHERE f.lane = 'horizon'
       ORDER BY f.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      title: r.title,
      snippet: String(r.body || '').slice(0, 500),
      at: r.created_at,
    }));
  } catch {
    return [];
  }
}

async function fetchCompetitiveSnippet(topic, callAI) {
  const search = createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI: callAI
      ? (prompt) => callAI('gemini', prompt, { taskType: 'research', maxOutputTokens: 800 })
      : null,
  });
  const query = `AI personal operating system life OS competitors ${topic} 2026 features`;
  try {
    const res = await search.search(query, { count: 4 });
    return {
      ok: true,
      source: res.source,
      snippets: (res.results || []).slice(0, 3).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: String(r.description || '').slice(0, 280),
      })),
    };
  } catch (err) {
    return { ok: false, error: err.message, snippets: [] };
  }
}

export function appendStrategicPrediction(entry) {
  try {
    fs.mkdirSync(path.dirname(PREDICTION_LOG), { recursive: true });
    fs.appendFileSync(PREDICTION_LOG, `${JSON.stringify({
      schema: 'chair_strategic_prediction_v1',
      at: new Date().toISOString(),
      ...entry,
    })}\n`);
  } catch {
    /* non-fatal */
  }
}

/**
 * Gather ideas, gaps, competitive snippets, and future horizons for Chair responses.
 */
export async function gatherStrategicBriefForChair({
  cleanedInput = '',
  pool = null,
  callAI = null,
  pointBTarget = null,
} = {}) {
  const topic = String(cleanedInput || '').slice(0, 200);
  const local = buildLocalStrategicNotes(cleanedInput, pointBTarget);
  const horizonCache = await loadLatestHorizonFindings(pool);
  const competitive = (process.env.BRAVE_SEARCH_API_KEY || process.env.PERPLEXITY_API_KEY)
    ? await fetchCompetitiveSnippet(topic.slice(0, 80), callAI)
    : { ok: false, skipped: true, reason: 'no_search_keys' };

  const futureHorizons = buildFutureLookBackPrompts(topic, pointBTarget?.label || 'LifeRE Alpha');

  appendStrategicPrediction({
    topic_excerpt: topic.slice(0, 120),
    prediction: `In 6 months: ${topic ? 'founder intent on this thread either shipped to Point B or blocked honestly' : 'program advances toward LifeRE Alpha'}`,
    confidence: 'THINK',
    resolve_by: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
  });

  return {
    doctrine: CHAIR_STRATEGIC_DOCTRINE,
    ideas: local.ideas,
    gaps: local.gaps,
    missing_pieces: local.missing,
    horizon_cache: horizonCache,
    competitive,
    future_horizons: futureHorizons,
    online_available: Boolean(competitive.ok || horizonCache.length),
  };
}

export function formatStrategicBriefSection(brief = {}) {
  if (!brief || (!brief.ideas?.length && !brief.gaps?.length)) return '';

  const lines = [
    '',
    '── Lumin offers (strategic — not just listening) ──',
    CHAIR_STRATEGIC_DOCTRINE.scoreboard,
  ];

  if (brief.ideas?.length) {
    lines.push('', 'Ideas:');
    for (const i of brief.ideas) lines.push(`• ${i}`);
  }
  if (brief.gaps?.length) {
    lines.push('', 'Gaps / risks:');
    for (const g of brief.gaps) lines.push(`• ${g}`);
  }
  if (brief.missing_pieces?.length) {
    lines.push('', 'Missing pieces I need from you:');
    for (const m of brief.missing_pieces) lines.push(`• ${m}`);
  }

  if (brief.competitive?.snippets?.length) {
    lines.push('', 'Competitive / landscape (online):');
    for (const s of brief.competitive.snippets) {
      lines.push(`• ${s.title || 'Finding'}: ${s.snippet || ''}`.trim());
    }
  } else if (brief.horizon_cache?.length) {
    lines.push('', 'Horizon intel (cached):');
    for (const h of brief.horizon_cache.slice(0, 2)) {
      lines.push(`• ${h.title}: ${h.snippet?.slice(0, 200) || ''}`);
    }
  } else if (brief.competitive?.skipped) {
    lines.push('', 'Online scan: set BRAVE_SEARCH_API_KEY or PERPLEXITY_API_KEY, or LANE_INTEL_ENABLED=1 for always-on horizon runs.');
  }

  const sixMo = brief.future_horizons?.find((h) => h.horizon_months === 6);
  const oneY = brief.future_horizons?.find((h) => h.horizon_months === 12);
  if (sixMo || oneY) {
    lines.push('', 'Future look-back (simulate now, score later vs reality):');
    if (sixMo) lines.push(`• 6mo [${sixMo.confidence}]: ${sixMo.prompts[0]}`);
    if (oneY) lines.push(`• 1y [${oneY.confidence}]: ${oneY.prompts[0]}`);
    lines.push('• Longer horizons (2–10y) recorded with GUESS confidence — scoreboard resolves what came true.');
  }

  return lines.join('\n');
}
