/**
 * Horizon + Red-team intel lanes (Amendment 36 MVP).
 *
 * Horizon: web search (Brave / Perplexity) + optional council synthesis; Zero-Waste cooldown.
 * Red team: local `npm audit` (critical/high) — no active pentest until scope is configured.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createUsefulWorkGuard } from './useful-work-guard.js';
import { createWebSearchService } from './web-search-service.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function horizonCooldownDays() {
  const n = parseInt(process.env.LANE_INTEL_HORIZON_COOLDOWN_DAYS || '7', 10);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

function redteamCooldownDays() {
  const n = parseInt(process.env.LANE_INTEL_REDTEAM_COOLDOWN_DAYS || '14', 10);
  return Number.isFinite(n) && n > 0 ? n : 14;
}

function horizonQueries() {
  const raw = process.env.LANE_INTEL_HORIZON_QUERIES
    || 'life operating system wellness app competitors 2026,AI family OS privacy calendar features 2026,mental health journaling companion apps landscape 2026';
  return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
}

function parseNpmAudit(stdout) {
  try {
    const j = JSON.parse(stdout);
    const out = [];
    const vulns = j.vulnerabilities || {};
    for (const [name, v] of Object.entries(vulns)) {
      const sev = (v.severity || '').toLowerCase();
      if (sev === 'critical' || sev === 'high') {
        const via = Array.isArray(v.via) ? v.via.map((x) => (typeof x === 'string' ? x : x?.title || x?.name || '')).filter(Boolean).join('; ') : '';
        out.push({ name, severity: sev, detail: via || JSON.stringify(v).slice(0, 500) });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callCouncilMember?: Function }} deps
 */
export function createLaneIntelService({ pool, logger, callCouncilMember }) {
  const log = logger || console;

  const webSearch = createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI: callCouncilMember
      ? (prompt) => callCouncilMember('gemini_flash', prompt, { taskType: 'research' })
      : null,
  });

  async function finishRun(runId, status, meta = {}) {
    await pool.query(
      `UPDATE lane_intel_runs SET status = $2, finished_at = NOW(), meta = COALESCE(meta, '{}'::jsonb) || $3::jsonb WHERE id = $1`,
      [runId, status, JSON.stringify(meta)]
    );
  }

  async function insertFinding(runId, lane, { severity = 'info', title, body = '', sources = [] }) {
    await pool.query(
      `INSERT INTO lane_intel_findings (run_id, lane, severity, title, body, sources)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [runId, lane, severity, title, body, JSON.stringify(sources)]
    );
  }

  async function runHorizonScan() {
    const { rows } = await pool.query(
      `INSERT INTO lane_intel_runs (lane, status) VALUES ('horizon', 'running') RETURNING id`
    );
    const runId = rows[0].id;
    const collected = [];

    try {
      for (const q of horizonQueries()) {
        const res = await webSearch.search(q, { count: 5 });
        collected.push({ query: q, source: res.source, results: res.results || [] });
        await insertFinding(runId, 'horizon', {
          severity: 'info',
          title: `Search: ${q.slice(0, 120)}`,
          body: (res.results || []).map((r) => `**${r.title || ''}**\n${r.description || ''}`).join('\n\n').slice(0, 12000),
          sources: (res.results || []).map((r) => ({ url: r.url || null, title: r.title })).filter((s) => s.url || s.title),
        });
      }

      if (callCouncilMember && collected.length) {
        const pack = JSON.stringify(collected).slice(0, 14000);
        const synth = await callCouncilMember(
          'gemini_flash',
          `You are a product strategist for LifeOS (purpose-first personal OS). Given the JSON web-research bundle below, write:\n1) Three competitor or market moves worth watching\n2) Two AI capability shifts relevant to our stack\n3) Three suggested backlog lines (imperative, each under 140 chars)\nCite which query each point came from. Be concrete. No hype.\n\nBUNDLE:\n${pack}`,
          { taskType: 'planning' }
        );
        const text = typeof synth === 'string' ? synth : synth?.content || synth?.text || '';
        await insertFinding(runId, 'horizon', {
          severity: 'info',
          title: 'Council synthesis — horizon brief',
          body: text,
          sources: [],
        });
      }

      await finishRun(runId, 'completed', { queries: collected.length });
      return { runId, findings: collected.length };
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] horizon scan failed');
      await finishRun(runId, 'failed', { error: err.message });
      throw err;
    }
  }

  async function runRedTeamScan() {
    const { rows } = await pool.query(
      `INSERT INTO lane_intel_runs (lane, status) VALUES ('redteam', 'running') RETURNING id`
    );
    const runId = rows[0].id;
    try {
      let stdout = '';
      try {
        const r = await execFileAsync('npm', ['audit', '--json', '--omit=dev'], {
          cwd: REPO_ROOT,
          maxBuffer: 20 * 1024 * 1024,
          timeout: 120000,
        });
        stdout = r.stdout || '';
      } catch (e) {
        stdout = e.stdout || '';
        if (!stdout) {
          await insertFinding(runId, 'redteam', {
            severity: 'medium',
            title: 'npm audit did not return JSON',
            body: e.message || String(e),
            sources: [],
          });
          await finishRun(runId, 'completed', { npm_audit: 'exec_error' });
          return { runId, vulns: 0 };
        }
      }

      const vulns = parseNpmAudit(stdout);
      if (!vulns.length) {
        await insertFinding(runId, 'redteam', {
          severity: 'info',
          title: 'npm audit — no critical/high findings',
          body: 'Parsed `npm audit --json`. No critical or high severity entries in the default report shape.',
          sources: [],
        });
      }
      for (const v of vulns.slice(0, 50)) {
        await insertFinding(runId, 'redteam', {
          severity: v.severity === 'critical' ? 'critical' : 'high',
          title: `Dependency: ${v.name}`,
          body: v.detail || '',
          sources: [],
        });
      }

      await insertFinding(runId, 'redteam', {
        severity: 'info',
        title: 'Red-team scope note',
        body:
          'Automated active penetration testing is NOT enabled in this MVP. Configure scope + staging targets before adding probe modules. This lane currently covers supply-chain audit only.',
        sources: [],
      });

      await finishRun(runId, 'completed', { vuln_count: vulns.length });
      return { runId, vulns: vulns.length };
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] redteam scan failed');
      await finishRun(runId, 'failed', { error: err.message });
      throw err;
    }
  }

  async function listLatest(lane, limit = 20) {
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const { rows } = await pool.query(
      `SELECT f.id, f.run_id, f.lane, f.severity, f.title, f.body, f.sources, f.created_at
       FROM lane_intel_findings f
       WHERE f.lane = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [lane, lim]
    );
    return rows;
  }

  async function listRuns(lane, limit = 10) {
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const { rows } = await pool.query(
      `SELECT id, lane, status, started_at, finished_at, meta
       FROM lane_intel_runs WHERE lane = $1 ORDER BY started_at DESC LIMIT $2`,
      [lane, lim]
    );
    return rows;
  }

  return { runHorizonScan, runRedTeamScan, listLatest, listRuns };
}

/**
 * Scheduled ticks wrapped in useful-work guards (call from boot-domains only).
 */
export function createLaneIntelScheduledTicks({ pool, logger, callCouncilMember }) {
  const intel = createLaneIntelService({ pool, logger, callCouncilMember });

  async function intelTablesExist() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('lane_intel_runs','lane_intel_findings')`
    );
    return parseInt(rows[0].c, 10) >= 2;
  }

  const horizonGuard = createUsefulWorkGuard({
    taskName: 'LaneIntelHorizon',
    purpose: 'Competitive + AI landscape brief stored as lane_intel_findings for SSOT backlog hygiene',
    prerequisites: async () => {
      if (process.env.LANE_INTEL_ENABLED !== '1') {
        return { ok: false, reason: 'LANE_INTEL_ENABLED is not 1 (budget/launch gate — no token spend)' };
      }
      if (!(await intelTablesExist())) {
        return { ok: false, reason: 'lane_intel tables missing — apply db/migrations/20260421_lane_intel.sql' };
      }
      const hasWeb = !!(process.env.BRAVE_SEARCH_API_KEY || process.env.PERPLEXITY_API_KEY);
      const aiOnly = process.env.LANE_INTEL_HORIZON_ALLOW_AI_ONLY === '1';
      if (!hasWeb && !(aiOnly && callCouncilMember)) {
        return {
          ok: false,
          reason:
            'Horizon needs BRAVE_SEARCH_API_KEY or PERPLEXITY_API_KEY, or LANE_INTEL_HORIZON_ALLOW_AI_ONLY=1 with callCouncilMember',
        };
      }
      return { ok: true };
    },
    workCheck: async () => {
      const days = horizonCooldownDays();
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM lane_intel_runs
         WHERE lane = 'horizon' AND status = 'completed'
           AND COALESCE(finished_at, started_at) > NOW() - make_interval(days => $1::int)`,
        [days]
      );
      const c = parseInt(rows[0]?.c ?? 0, 10);
      return { count: c === 0 ? 1 : 0, description: c === 0 ? 'horizon scan due' : `horizon cooldown (${days}d)` };
    },
    execute: () => intel.runHorizonScan(),
    logger,
  });

  const redteamGuard = createUsefulWorkGuard({
    taskName: 'LaneIntelRedTeam',
    purpose: 'npm audit critical/high findings recorded for dependency risk tracking',
    prerequisites: async () => {
      if (process.env.LANE_INTEL_ENABLED !== '1') {
        return { ok: false, reason: 'LANE_INTEL_ENABLED is not 1 (budget/launch gate)' };
      }
      if (!(await intelTablesExist())) {
        return { ok: false, reason: 'lane_intel tables missing' };
      }
      return { ok: true };
    },
    workCheck: async () => {
      const days = redteamCooldownDays();
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM lane_intel_runs
         WHERE lane = 'redteam' AND status = 'completed'
           AND COALESCE(finished_at, started_at) > NOW() - make_interval(days => $1::int)`,
        [days]
      );
      const c = parseInt(rows[0]?.c ?? 0, 10);
      return { count: c === 0 ? 1 : 0, description: c === 0 ? 'redteam scan due' : `redteam cooldown (${days}d)` };
    },
    execute: () => intel.runRedTeamScan(),
    logger,
  });

  return { horizonGuard, redteamGuard, intel };
}
