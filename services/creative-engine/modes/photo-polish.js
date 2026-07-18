// SYNOPSIS: Creative Engine mode — photo polish (scale + optional caption overlay)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import path from 'node:path';

export async function runPhotoPolish({ ffmpeg, storage, job, logger }) {
  const req = job.request_json || job.request || {};
  const assetKey = req.assetKey || req.asset_key;
  if (!assetKey) throw new Error('assetKey_required');

  const inputPath = storage.getLocalPath(assetKey);
  const ownerId = job.owner_id || 'anon';
  const maxWidth = req.maxWidth || req.max_width || 1920;
  const captionText = req.captionText || req.caption_text || '';

  const tmpOut = path.join(storage.root, 'tmp', `photo_${Date.now()}.jpg`);
  await storage.ensureDirs();
  await ffmpeg.polishPhoto({
    inputPath,
    outputPath: tmpOut,
    maxWidth,
    captionText,
  });

  const saved = await storage.saveUpload(tmpOut, {
    ownerId,
    filename: 'photo_polish.jpg',
    kind: 'output',
  });

  logger?.info?.('[photo_polish] done', { key: saved.key });
  return {
    ok: true,
    outputKey: saved.key,
    publicUrl: saved.publicUrl,
    absolutePath: saved.absolutePath,
  };
}

export default runPhotoPolish;
