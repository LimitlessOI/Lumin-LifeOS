/**
 * SYNOPSIS: LifeRE MarketingModule — hooks, scripts, calendar, ROI.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeRETwinStore } from './lifere-twin-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadVideoTypes() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifere-video-types.json'), 'utf8'));
}

export function createLifeREMarketingModule({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  function getVideoTypes() {
    return loadVideoTypes();
  }

  async function researchHooks({ tenantId = 'default', userId, niche = 'real_estate', market = 'local', count = 10 }) {
    const hooks = [
      { hook_text: `3 numbers that changed in ${market} this week`, score: 0.82, label: 'THINK' },
      { hook_text: `Stop believing this about ${niche} pre-approval`, score: 0.78, label: 'THINK' },
      { hook_text: `Why families pick ${market} over the next town`, score: 0.75, label: 'THINK' },
    ].slice(0, count);

    if (pool) {
      for (const h of hooks) {
        await pool.query(
          `INSERT INTO lifere_hook_library (tenant_id, user_id, source, hook_text, niche, performance_score)
           VALUES ($1,$2,'research',$3,$4,$5)`,
          [tenantId, userId, h.hook_text, niche, h.score]
        );
      }
    }
    return { ok: true, hooks, label: 'THINK' };
  }

  async function generateScript({ tenantId = 'default', userId, videoTypeId, hookText = '' }) {
    const types = loadVideoTypes();
    const vt = types.types.find((t) => t.id === videoTypeId);
    if (!vt) throw new Error(`Unknown video type: ${videoTypeId}`);

    const comm = twinStore.readTwin({ tenantId, userId, twinKey: 'communication' });
    const hook = hookText || vt.hook_angle;

    return {
      ok: true,
      video_type_id: videoTypeId,
      hook_text: hook,
      title_variants: [`${vt.label} — [city]`, vt.label],
      script_outline: [`Hook: ${hook}`, 'Story beat', 'Call to action'],
      b_roll_beats: ['Establishing shot', 'Detail cutaway', 'Agent direct-to-camera'],
      conversational_prompts: ['Say this like you are talking to a friend at coffee.', 'Pause after the hook.'],
      retention_pattern_notes: 'Pattern: hook → proof → personal beat → CTA',
      thumbnail_notes: 'Face + bold number or map pin',
      label: 'THINK',
      personality_phrases: comm?.phrases?.slice(0, 3) || [],
    };
  }

  function marketPlaceholder(s) {
    return s || '[city]';
  }

  async function planCalendar({ tenantId = 'default', userId, weeks = 2, channels = ['youtube', 'facebook'] }) {
    const types = loadVideoTypes().types.slice(0, weeks * 2);
    const rows = [];
    if (!pool) {
      return { ok: true, planned: types.length, rows: types.map((t, i) => ({ video_type_id: t.id, status: 'planned' })), persisted: false };
    }
    for (let i = 0; i < types.length; i++) {
      const scheduled = new Date(Date.now() + (i + 1) * 86400000 * 3);
      const { rows: inserted } = await pool.query(
        `INSERT INTO lifere_content_calendar (tenant_id, user_id, video_type_id, scheduled_at, channels)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [tenantId, userId, types[i].id, scheduled.toISOString(), JSON.stringify(channels)]
      );
      rows.push(inserted[0]);
    }
    return { ok: true, planned: rows.length, rows, persisted: true };
  }

  async function listCalendar({ tenantId = 'default', userId }) {
    if (!pool) return { ok: true, rows: [] };
    const { rows } = await pool.query(
      `SELECT * FROM lifere_content_calendar WHERE tenant_id = $1 AND user_id = $2 ORDER BY scheduled_at`,
      [tenantId, userId]
    );
    return { ok: true, rows };
  }

  async function adsRoi({ tenantId = 'default', userId, periodStart, periodEnd }) {
    if (!pool) return { ok: true, campaigns: [], label: 'THINK' };
    const { rows } = await pool.query(
      `SELECT * FROM lifere_ad_spend WHERE tenant_id = $1 AND user_id = $2
       AND period_start >= $3 AND period_end <= $4`,
      [tenantId, userId, periodStart, periodEnd]
    );
    return { ok: true, campaigns: rows, label: 'THINK' };
  }

  async function importHooksFromCsv({ tenantId = 'default', userId, hooks = [] }) {
    const saved = [];
    for (const row of hooks) {
      const hook_text = row.hook_text || row.hook || row.text;
      if (!hook_text) continue;
      if (pool) {
        await pool.query(
          `INSERT INTO lifere_hook_library (tenant_id, user_id, source, hook_text, niche, performance_score)
           VALUES ($1,$2,'csv_import',$3,$4,$5)`,
          [tenantId, userId, hook_text, row.niche || 'import', Number(row.score) || 0.5]
        );
      }
      saved.push({ hook_text, source: 'csv_import' });
    }
    return { ok: true, imported: saved.length, hooks: saved, label: 'KNOW' };
  }

  return { getVideoTypes, researchHooks, generateScript, planCalendar, listCalendar, adsRoi, importHooksFromCsv };
}
