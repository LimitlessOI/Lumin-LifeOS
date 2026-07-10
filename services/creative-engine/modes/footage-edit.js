// SYNOPSIS: Creative Engine mode — real footage trim + captions + aspect crop
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import path from 'node:path';

function buildSrt(captions = []) {
  return captions.map((c, i) => {
    const start = Number(c.start) || 0;
    const end = Number(c.end) || start + 2;
    const fmt = (s) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    return `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${String(c.text || '').trim()}\n`;
  }).join('\n');
}

export async function runFootageEdit({ ffmpeg, storage, job, logger }) {
  const req = job.request_json || job.request || {};
  const assetKey = req.assetKey || req.asset_key;
  if (!assetKey) throw new Error('assetKey_required');

  await storage.ensureDirs();
  const inputPath = storage.getLocalPath(assetKey);
  const ownerId = job.owner_id || 'anon';
  const startSec = req.startSec ?? req.start_sec ?? 0;
  const endSec = req.endSec ?? req.end_sec;
  const aspect = req.aspect || '9:16';
  const captionText = req.captionText || req.caption_text || '';
  const brandOverlayText = req.brandOverlayText || req.brand_overlay_text || '';
  const captions = Array.isArray(req.captions) ? req.captions : [];

  const stamp = Date.now();
  const trimPath = path.join(storage.root, 'tmp', `trim_${stamp}.mp4`);
  await ffmpeg.trimVideo({ inputPath, outputPath: trimPath, startSec, endSec });

  let current = trimPath;

  if (captions.length) {
    const srtFile = await storage.writeTemp('captions.srt', buildSrt(captions));
    const captioned = path.join(storage.root, 'tmp', `cap_${stamp}.mp4`);
    try {
      await ffmpeg.burnCaptions({ inputPath: current, outputPath: captioned, srtPath: srtFile.absolutePath });
      current = captioned;
    } catch (err) {
      logger?.warn?.('[footage_edit] srt burn failed, drawtext fallback', { error: err.message });
      const fallback = path.join(storage.root, 'tmp', `cap_txt_${stamp}.mp4`);
      await ffmpeg.burnCaptionText({
        inputPath: current,
        outputPath: fallback,
        captionText: captions.map((c) => c.text).filter(Boolean).join(' · ') || captionText,
        brandOverlayText,
      });
      current = fallback;
    }
  } else if (captionText || brandOverlayText) {
    const overlayed = path.join(storage.root, 'tmp', `ov_${stamp}.mp4`);
    await ffmpeg.burnCaptionText({
      inputPath: current,
      outputPath: overlayed,
      captionText,
      brandOverlayText,
    });
    current = overlayed;
  }

  const cropped = path.join(storage.root, 'tmp', `crop_${stamp}.mp4`);
  await ffmpeg.scaleCrop({ inputPath: current, outputPath: cropped, aspect });

  const saved = await storage.saveUpload(cropped, {
    ownerId,
    filename: `footage_edit_${String(aspect).replace(':', 'x')}.mp4`,
    kind: 'output',
  });

  return {
    ok: true,
    outputKey: saved.key,
    publicUrl: saved.publicUrl,
    absolutePath: saved.absolutePath,
    aspect,
    durationSec: endSec != null ? Math.max(0, Number(endSec) - Number(startSec)) : null,
  };
}

export default runFootageEdit;
