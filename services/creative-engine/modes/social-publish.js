// SYNOPSIS: Creative Engine mode — queue one-click social publishing for a video output
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { defaultPlannerCallModel } from '../../never-stop-product-factory.js';
import { getConnection, listConnections } from '../../marketing-social-connections.js';

const SUPPORTED_PLATFORMS = ['instagram', 'linkedin', 'x', 'facebook', 'youtube', 'tiktok'];

const PLATFORM_HINTS = {
  instagram: { maxChars: 2200, tone: 'visual, punchy, emoji-friendly' },
  linkedin: { maxChars: 3000, tone: 'professional, insight-driven' },
  x: { maxChars: 280, tone: 'short, opinionated, thread-friendly' },
  facebook: { maxChars: 5000, tone: 'community-focused, conversational' },
  youtube: { maxChars: 5000, tone: 'SEO-friendly, descriptive' },
  tiktok: { maxChars: 2200, tone: 'trendy, hook-first, hashtag-heavy' },
};

function safeJsonParse(raw) {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* continue */ }
  }
  return null;
}

function normalizePlatforms(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(',');
  return raw.map((p) => String(p).trim().toLowerCase()).filter((p) => SUPPORTED_PLATFORMS.includes(p));
}

async function generateCaption({ platform, videoSummary, userCaption, hashtags, transcriptText, callAI, logger }) {
  if (userCaption) return { caption: userCaption, hashtags: hashtags || [] };
  if (!callAI) return { caption: videoSummary || '', hashtags: hashtags || [] };
  const meta = PLATFORM_HINTS[platform] || {};
  const prompt = `Write a ${platform} caption for this video.
Tone: ${meta.tone || 'engaging'}.
Max length: ${meta.maxChars || 2200} characters.
${videoSummary ? `Video summary: ${videoSummary}\n` : ''}${transcriptText ? `Transcript: ${transcriptText.slice(0, 2000)}\n` : ''}
${hashtags?.length ? `Requested hashtags: ${hashtags.join(' ')}` : ''}
Return STRICT JSON only: {"caption":"string","hashtags":["string"]}. Do not include markdown.`;
  try {
    const raw = await callAI('creative_engine.social_caption', prompt, { maxOutputTokens: 800 });
    const parsed = safeJsonParse(raw);
    return { caption: parsed?.caption || videoSummary || '', hashtags: parsed?.hashtags || hashtags || [] };
  } catch (err) {
    logger?.warn?.('[social_publish] caption generation failed', { platform, error: err.message });
    return { caption: videoSummary || '', hashtags: hashtags || [] };
  }
}

async function resolveVideoFile({ outputKey, videoUrl, storage, logger }) {
  if (outputKey) {
    const abs = storage.getLocalPath(outputKey);
    if (existsSync(abs)) return { outputKey, absolutePath: abs };
    // If not on this instance, try to fetch via public URL from assets table (caller may pass videoUrl)
  }
  if (videoUrl) {
    try {
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const saved = await storage.saveUpload(buf, { ownerId: 'social-publish', filename: 'video.mp4', kind: 'video' });
      return { outputKey: saved.key, absolutePath: saved.absolutePath };
    } catch (err) {
      logger?.warn?.('[social_publish] videoUrl fetch failed', { error: err.message });
      return { error: `video_fetch_failed:${err.message}` };
    }
  }
  return { error: 'outputKey or videoUrl required' };
}

export async function runSocialPublish({ pool = null, storage, job, logger }) {
  if (!pool) return { ok: false, error: 'pool_required' };
  const req = job.request_json || job.request || {};
  const ownerId = job.owner_id || 'anon';
  const platforms = normalizePlatforms(req.platforms).length ? normalizePlatforms(req.platforms) : SUPPORTED_PLATFORMS;
  const video = await resolveVideoFile({ outputKey: req.outputKey, videoUrl: req.videoUrl, storage, logger });
  if (video.error) return { ok: false, error: video.error };

  const liveEnabled = process.env.LIVE_SOCIAL_PUBLISH_ENABLED === 'true';
  const callAI = defaultPlannerCallModel();

  // Gather connection status for every requested platform
  let allConnected = true;
  const plan = [];
  for (const platform of platforms) {
    const conn = await getConnection(pool, { ownerId, platform });
    const connected = conn?.connection?.status === 'connected';
    if (!connected) allConnected = false;

    const captionResult = await generateCaption({
      platform,
      videoSummary: req.videoSummary || req.caption || '',
      userCaption: req.caption,
      hashtags: req.hashtags,
      transcriptText: req.transcriptText,
      callAI,
      logger,
    });

    let status = 'pending';
    let errorDetail = null;
    let publishedAt = null;
    let platformPostId = null;

    if (!connected) {
      status = 'needs_connection';
      errorDetail = `No connected ${platform} account. POST /api/v1/marketing/social-connections/connect?platform=${platform}`;
    } else if (!liveEnabled) {
      status = 'ready';
      errorDetail = 'LIVE_SOCIAL_PUBLISH_ENABLED is not true. Set it in Railway to publish for real.';
    } else {
      // Live browser publishing requires file-upload primitives the current browser agent lacks;
      // mark as needing human/technical completion rather than fail silently.
      status = 'needs_human';
      errorDetail = 'Live video upload is scaffolded; the browser agent needs a file-input primitive to complete the upload. Use the generated caption + video file to post manually, or provide a platform API integration.';
    }

    const queueResult = await pool.query(
      `INSERT INTO creative_publish_queue (owner_id, creative_job_id, output_key, platform, caption, status, platform_post_id, error_detail, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [ownerId, job.id || null, video.outputKey, platform, captionResult.caption, status, platformPostId, errorDetail, publishedAt],
    );

    plan.push({
      queueId: queueResult.rows[0]?.id,
      platform,
      status,
      connected,
      caption: captionResult.caption,
      hashtags: captionResult.hashtags,
      errorDetail,
    });
  }

  return {
    ok: true,
    outputKey: video.outputKey,
    absolutePath: video.absolutePath,
    live: liveEnabled,
    allConnected,
    platforms: plan,
    hint: liveEnabled
      ? 'Live mode enabled but video file upload needs a platform API key or browser-agent upload primitive. Drafts are queued.'
      : 'Social publish is in draft/queue mode. Set LIVE_SOCIAL_PUBLISH_ENABLED=true and connect accounts to publish.',
  };
}

export default runSocialPublish;
