// SYNOPSIS: Creative Engine mode — competitor niche analysis for video content
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { defaultPlannerCallModel } from '../../never-stop-product-factory.js';

function safeJsonParse(raw) {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw
    .replace(/```json\s*|\s*```/g, '')
    .replace(/^\s*`|\s*`$/g, '')
    .trim();
  const attempts = [cleaned, cleaned.replace(/,(\s*[}\]])/g, '$1')];
  for (const t of attempts) {
    try { return JSON.parse(t); } catch { /* continue */ }
  }
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* continue */ }
  }
  return null;
}

async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ac.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchOembed(url) {
  const candidates = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  ];
  for (const u of candidates) {
    try {
      const res = await fetchWithTimeout(u);
      if (res.ok) {
        const j = await res.json();
        return { title: j.title, author: j.author_name, description: j.description || '', thumbnail: j.thumbnail_url || '', provider: j.provider_name || '' };
      }
    } catch { /* continue */ }
  }
  return null;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPageMeta(url) {
  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LuminBot/1.0)' } }, 12000);
    if (!res.ok) return null;
    const html = await res.text();
    const getMeta = (name) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i'));
      if (!m) return '';
      const c = m[0].match(/content=["']([^"']*)["']/i);
      return c ? c[1] : '';
    };
    const title = getMeta('og:title') || getMeta('title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
    const description = getMeta('og:description') || getMeta('description') || '';
    const ld = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
    let ldData = null;
    try { ldData = JSON.parse(ld); } catch { /* ignore */ }
    return {
      url,
      title: stripHtml(title),
      description: stripHtml(description),
      author: ldData?.author?.name || getMeta('author') || '',
      thumbnail: getMeta('og:image') || '',
    };
  } catch (err) {
    return { url, error: err.message };
  }
}

async function searchTopVideos(query) {
  const serpKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  if (serpKey) {
    try {
      const u = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&tbm=vid&api_key=${serpKey}&num=5`;
      const res = await fetchWithTimeout(u);
      if (res.ok) {
        const j = await res.json();
        const results = (j.video_results || []).slice(0, 5);
        return results.map((r) => ({ title: r.title, link: r.link, source: r.source, thumbnail: r.thumbnail })).filter((r) => r.link);
      }
    } catch { /* fall through */ }
  }
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (ytKey) {
    try {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video&q=${encodeURIComponent(query)}&key=${ytKey}`;
      const res = await fetchWithTimeout(u);
      if (res.ok) {
        const j = await res.json();
        return (j.items || []).map((i) => ({
          title: i.snippet?.title,
          link: `https://www.youtube.com/watch?v=${i.id?.videoId}`,
          source: 'YouTube',
          thumbnail: i.snippet?.thumbnails?.default?.url || '',
        }));
      }
    } catch { /* fall through */ }
  }
  return [];
}

async function enrichCompetitor(item, logger) {
  const url = item.link || item.url;
  const base = { url, title: item.title || '', source: item.source || '', thumbnail: item.thumbnail || '' };
  const oembed = url ? await fetchOembed(url) : null;
  if (oembed) {
    base.title = base.title || oembed.title;
    base.author = oembed.author;
    base.description = oembed.description;
    base.thumbnail = base.thumbnail || oembed.thumbnail;
    base.provider = oembed.provider;
    return base;
  }
  if (url) {
    const meta = await fetchPageMeta(url);
    if (meta && !meta.error) {
      base.title = base.title || meta.title;
      base.author = meta.author;
      base.description = meta.description;
      base.thumbnail = base.thumbnail || meta.thumbnail;
    }
  }
  return base;
}

function buildPrompt({ niche, goal, audience, ourScript, competitors }) {
  const competitorBlocks = competitors.map((c, i) => `
Competitor #${i + 1}
URL: ${c.url || 'search result'}
Title: ${c.title || ''}
Author/Channel: ${c.author || ''}
Source/Platform: ${c.source || c.provider || ''}
Description: ${c.description || ''}
`).join('\n---\n');

  return `You are a senior video strategist. Analyze competing videos in the "${niche}" niche for a creator whose goal is: ${goal || 'make a brilliant, high-retention video'}.

Audience: ${audience || 'general'}.

${ourScript ? `Our current script/draft:\n${ourScript}\n` : ''}

${competitors.length ? `Competitors found:\n${competitorBlocks}` : 'No competitor data was fetched; reason from the data above.'}

Return STRICT JSON only:
{
  "niche": "${niche}",
  "summary": "2-3 sentence strategic takeaway",
  "competitors": [
    {
      "url": "string",
      "title": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "what_they_do_well": ["string"],
      "what_they_miss": ["string"],
      "audience_hooks": ["string"]
    }
  ],
  "content_gaps": ["string"],
  "incorporate": [
    {"idea": "string", "why": "string"}
  ],
  "differentiation": "string"
}

Be honest: if competitor data is sparse, say so in summary and focus on well-known best practices for this niche. Do not invent view counts or engagement metrics you cannot verify.`;
}

export async function runCompetitorNicheAnalysis({ pool = null, storage, job, logger }) {
  const req = job.request_json || job.request || {};
  const niche = String(req.niche || req.topic || '').trim();
  if (!niche) return { ok: false, error: 'niche_required' };

  const goal = req.goal || req.objective || '';
  const audience = req.audience || '';
  const ourScript = req.ourScript || req.ourTranscript || req.script || '';
  const keywords = Array.isArray(req.keywords) ? req.keywords : [];
  const queryUsed = keywords.join(' ') || `${niche} best videos`;
  let competitors = [];
  let missing = [];

  if (Array.isArray(req.competitorUrls) && req.competitorUrls.length) {
    const enriched = await Promise.all(req.competitorUrls.map((u) => enrichCompetitor({ url: String(u) }, logger)));
    competitors = enriched.filter((c) => c.title || c.url);
  } else {
    const search = await searchTopVideos(queryUsed);
    if (search.length) {
      const enriched = await Promise.all(search.map((s) => enrichCompetitor(s, logger)));
      competitors = enriched.filter((c) => c.title || c.url);
    } else {
      missing.push('SERPAPI_KEY/SERP_API_KEY or YOUTUBE_API_KEY, or explicit competitorUrls');
    }
  }

  if (!competitors.length) {
    return { ok: false, error: 'no_competitors_found', missing, niche, queryUsed };
  }

  const callAI = defaultPlannerCallModel();
  if (!callAI) {
    return { ok: false, error: 'no_model_available_for_analysis', missing: ['GOOGLE_API_KEY / GEMINI_API_KEY or other planner key'] };
  }

  const prompt = buildPrompt({ niche, goal, audience, ourScript, competitors });
  let raw;
  try {
    raw = await callAI('creative_engine.competitor_analysis', prompt, { maxOutputTokens: 4000 });
  } catch (err) {
    return { ok: false, error: `analysis_model_failed:${err.message}`, niche, queryUsed };
  }

  const parsed = safeJsonParse(raw) || {};
  const report = {
    niche: parsed.niche || niche,
    summary: parsed.summary || '',
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    contentGaps: parsed.content_gaps || [],
    incorporate: parsed.incorporate || [],
    differentiation: parsed.differentiation || '',
    sourceCompetitors: competitors.map(({ title, url, source, author }) => ({ title, url, source, author })),
    queryUsed,
  };

  // Persist report as a JSON file asset and optional DB row
  const ownerId = job.owner_id || 'anon';
  const reportBuf = Buffer.from(JSON.stringify(report, null, 2), 'utf8');
  const saved = await storage.saveUpload(reportBuf, { ownerId, filename: 'competitor_report.json', kind: 'report' });

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO creative_competitor_reports (owner_id, creative_job_id, niche, query_used, report_json)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [ownerId, job.id || null, niche, queryUsed, JSON.stringify(report)],
      );
    } catch (err) {
      logger?.warn?.('[competitor_analysis] report row insert failed', { error: err.message });
    }
  }

  return {
    ok: true,
    outputKey: saved.key,
    publicUrl: saved.publicUrl,
    absolutePath: saved.absolutePath,
    report,
    niche,
    queryUsed,
    competitorsAnalyzed: competitors.length,
  };
}

export default runCompetitorNicheAnalysis;
