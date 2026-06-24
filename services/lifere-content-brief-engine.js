/**
 * SYNOPSIS: SMOS Content Brief engine — competitor intel, persona, SEO — gate before coach/script/record.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { enrichPersonalTwin } from './lifeos-service-doctrine.js';

const memoryStore = new Map();

function storeKey(tenantId, userId, id) {
  return `${tenantId}:${userId}:${id}`;
}

function deriveTags(topic = '', personal = {}) {
  const base = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 6);
  const why = personal.whys?.[0]?.label?.toLowerCase().split(/\s+/).slice(0, 3) || [];
  return [...new Set([...base, ...why, 'las vegas', 'real estate'])].slice(0, 12);
}

export function createLifeREContentBriefEngine({ pool = null, marketing = null, logger = console } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  async function saveBriefRow(row) {
    if (pool) {
      const { rows } = await pool.query(
        `INSERT INTO lifere_content_briefs
         (tenant_id, user_id, topic, status, persona, competitor_intel, tags, seo_pack, content_gaps, target_platforms, brief_body)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          row.tenant_id,
          row.user_id,
          row.topic,
          row.status || 'draft',
          JSON.stringify(row.persona || {}),
          JSON.stringify(row.competitor_intel || []),
          row.tags || [],
          JSON.stringify(row.seo_pack || {}),
          JSON.stringify(row.content_gaps || []),
          row.target_platforms || ['youtube', 'facebook'],
          JSON.stringify(row.brief_body || {}),
        ]
      );
      return rows[0];
    }
    const id = String(Date.now());
    const saved = {
      id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      topic: row.topic,
      status: row.status || 'draft',
      persona: row.persona || {},
      competitor_intel: row.competitor_intel || [],
      tags: row.tags || [],
      seo_pack: row.seo_pack || {},
      content_gaps: row.content_gaps || [],
      target_platforms: row.target_platforms || ['youtube', 'facebook'],
      brief_body: row.brief_body || {},
      approved_at: null,
      approved_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.set(storeKey(row.tenant_id, row.user_id, id), saved);
    return saved;
  }

  async function getBriefById({ tenantId = 'default', userId, briefId }) {
    if (!briefId) return null;
    if (pool) {
      const { rows } = await pool.query(
        `SELECT * FROM lifere_content_briefs WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
        [briefId, tenantId, userId]
      );
      return rows[0] || null;
    }
    return memoryStore.get(storeKey(tenantId, userId, String(briefId))) || null;
  }

  async function getActiveApprovedBrief({ tenantId = 'default', userId }) {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT * FROM lifere_content_briefs
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'approved'
         ORDER BY approved_at DESC NULLS LAST, updated_at DESC
         LIMIT 1`,
        [tenantId, userId]
      );
      return rows[0] || null;
    }
    for (const row of memoryStore.values()) {
      if (row.tenant_id === tenantId && row.user_id === userId && row.status === 'approved') {
        return row;
      }
    }
    return null;
  }

  async function generateBrief({
    tenantId = 'default',
    userId,
    topic,
    persona = {},
    competitors = [],
    platforms = ['youtube', 'facebook', 'instagram'],
    market = 'Las Vegas',
  }) {
    if (!topic?.trim()) {
      return { ok: false, error: 'topic required' };
    }

    const personal = enrichPersonalTwin(twinStore.readTwin({ tenantId, userId, twinKey: 'personal' }) || {});
    let hooks = [];
    if (marketing?.researchHooks) {
      try {
        const res = await marketing.researchHooks({
          tenantId,
          userId,
          niche: topic,
          market,
          count: 5,
        });
        hooks = res.hooks || [];
      } catch (err) {
        logger.warn?.('[LIFERE-BRIEF] hook research skip:', err.message);
      }
    }

    const tags = deriveTags(topic, personal);
    const competitorIntel = (competitors.length ? competitors : ['Local price-focused agent', 'National relocation channel']).map((name) => ({
      name: typeof name === 'string' ? name : name.name,
      angle: typeof name === 'object' ? name.angle : 'Generic market update',
      gap: typeof name === 'object' ? name.gap : `Missing ${personal.whys?.[0]?.label || 'persona-specific'} narrative`,
      label: 'THINK',
    }));

    const briefBody = {
      schema: 'lifere_content_brief_v1',
      topic: topic.trim(),
      persona: {
        label: persona.label || personal.whys?.[0]?.label || 'Relocating buyer/seller',
        description: persona.description || `Viewer considering ${market} — needs honest tradeoffs, not hype.`,
        pain_points: persona.pain_points?.length
          ? persona.pain_points
          : ['Information overload', 'Trust in out-of-state move'],
        why_anchor: personal.whys?.[0]?.statement || null,
      },
      competitor_intel: competitorIntel,
      hooks: hooks.slice(0, 5),
      tags,
      seo_pack: {
        title_candidates: [`${topic} — ${market}`, `${topic} | Go Vegas`, topic],
        description: `Local expert breakdown of ${topic} for ${market}. Costs, benefits, next step — no hype.`,
        keywords: tags,
      },
      content_gaps: [
        `Competitors cover ${topic} but skip relocation "why"`,
        'Long-form exists without Shorts/SEO pack per platform',
        hooks[0]?.hook_text ? `Hook opportunity: ${hooks[0].hook_text}` : 'Hook research pending',
      ],
      target_platforms: platforms,
      record_mode_hint: persona.record_mode || 'solo_director',
      workflow_gate: 'approve_before_coach_script_record',
      label: 'THINK',
    };

    const saved = await saveBriefRow({
      tenant_id: tenantId,
      user_id: userId,
      topic: topic.trim(),
      status: 'draft',
      persona: briefBody.persona,
      competitor_intel: briefBody.competitor_intel,
      tags,
      seo_pack: briefBody.seo_pack,
      content_gaps: briefBody.content_gaps,
      target_platforms: platforms,
      brief_body: briefBody,
    });

    return {
      ok: true,
      brief_id: saved.id,
      status: saved.status,
      brief: briefBody,
      label: 'THINK',
    };
  }

  async function approveBrief({ tenantId = 'default', userId, briefId, approvedBy = userId }) {
    const brief = await getBriefById({ tenantId, userId, briefId });
    if (!brief) return { ok: false, error: 'brief not found' };

    if (pool) {
      const { rows } = await pool.query(
        `UPDATE lifere_content_briefs
         SET status = 'approved', approved_at = now(), approved_by = $4, updated_at = now()
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3
         RETURNING *`,
        [briefId, tenantId, userId, approvedBy]
      );
      return { ok: true, brief: rows[0], label: 'KNOW' };
    }

    brief.status = 'approved';
    brief.approved_at = new Date().toISOString();
    brief.approved_by = approvedBy;
    brief.updated_at = brief.approved_at;
    memoryStore.set(storeKey(tenantId, userId, String(briefId)), brief);
    return { ok: true, brief, label: 'KNOW' };
  }

  async function listBriefs({ tenantId = 'default', userId, limit = 10 }) {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT id, topic, status, tags, target_platforms, approved_at, created_at, updated_at
         FROM lifere_content_briefs
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY updated_at DESC
         LIMIT $3`,
        [tenantId, userId, limit]
      );
      return { ok: true, briefs: rows };
    }
    const briefs = [...memoryStore.values()]
      .filter((b) => b.tenant_id === tenantId && b.user_id === userId)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, limit)
      .map(({ id, topic, status, tags, target_platforms, approved_at, created_at, updated_at }) => ({
        id,
        topic,
        status,
        tags,
        target_platforms,
        approved_at,
        created_at,
        updated_at,
      }));
    return { ok: true, briefs };
  }

  async function assertApprovedBrief({ tenantId = 'default', userId, briefId = null, bypass = false }) {
    if (bypass || process.env.LIFERE_BYPASS_BRIEF_GATE === '1') {
      return { ok: true, bypass: true, label: 'KNOW' };
    }

    let brief = briefId ? await getBriefById({ tenantId, userId, briefId }) : null;
    if (!brief) brief = await getActiveApprovedBrief({ tenantId, userId });

    if (!brief || brief.status !== 'approved') {
      return {
        ok: false,
        error: 'BRIEF_REQUIRED',
        code: 'content_brief_not_approved',
        hint: 'Generate and approve a Content Brief before coach, script, or record.',
        label: 'KNOW',
      };
    }

    return { ok: true, brief, brief_id: brief.id, label: 'KNOW' };
  }

  function formatBriefForPrompt(brief) {
    const body = brief.brief_body || brief;
    return [
      'APPROVED CONTENT BRIEF (SMOS law — coach/script must align):',
      `Topic: ${body.topic || brief.topic}`,
      `Persona: ${body.persona?.label || '—'} — ${body.persona?.description || ''}`,
      `Tags: ${(body.tags || brief.tags || []).join(', ')}`,
      `Gaps: ${(body.content_gaps || brief.content_gaps || []).slice(0, 3).join(' | ')}`,
      `Platforms: ${(body.target_platforms || brief.target_platforms || []).join(', ')}`,
    ].join('\n');
  }

  return {
    generateBrief,
    approveBrief,
    listBriefs,
    getBriefById,
    getActiveApprovedBrief,
    assertApprovedBrief,
    formatBriefForPrompt,
  };
}
