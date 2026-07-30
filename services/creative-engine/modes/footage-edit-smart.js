// SYNOPSIS: Creative Engine mode — AI-driven footage cleanup (filler/repetition/silence removal + content-aware keep/cut)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { transcribeAudioForEdit, buildSmartCutPlan, contentAwareCutPlan } from '../transcribe-edit.js';

async function loadCallAI() {
  try {
    const { defaultPlannerCallModel } = await import('../../../never-stop-product-factory.js');
    return defaultPlannerCallModel();
  } catch {
    return null;
  }
}

function sumRanges(ranges) {
  return ranges.reduce((acc, [s, e]) => acc + Math.max(0, e - s), 0);
}

export async function runSmartFootageEdit({ ffmpeg, storage, job, logger }) {
  const req = job.request_json || job.request || {};
  const assetKey = req.assetKey || req.asset_key;
  if (!assetKey) throw new Error('assetKey_required');

  await storage.ensureDirs();
  const inputPath = storage.getLocalPath(assetKey);
  const ownerId = job.owner_id || 'anon';
  const startSec = req.startSec ?? req.start_sec ?? 0;
  const endSec = req.endSec ?? req.end_sec;
  const aspect = req.aspect || '9:16';
  const smart = req.smartEdit || req.smart_edit || {};
  const captionText = req.captionText || req.caption_text || '';
  const brandOverlayText = req.brandOverlayText || req.brand_overlay_text || '';
  const stamp = Date.now();

  let current = inputPath;
  if (startSec !== 0 || endSec != null) {
    const trimmed = path.join(storage.root, 'tmp', `smart_trim_${stamp}.mp4`);
    await ffmpeg.trimVideo({ inputPath: current, outputPath: trimmed, startSec, endSec });
    current = trimmed;
  }

  const duration = await ffmpeg.getDuration(current);
  const audioPath = path.join(storage.root, 'tmp', `smart_audio_${stamp}.mp3`);
  await ffmpeg.extractAudio({ inputPath: current, outputPath: audioPath });

  const audioBuffer = await readFile(audioPath);
  const transcript = await transcribeAudioForEdit({ audioBuffer, mimeType: 'audio/mpeg' });
  if (!transcript.ok) throw new Error(`transcription_failed:${transcript.error}`);

  const callAI = smart.contentAware ? await loadCallAI() : null;
  const plan = smart.contentAware && callAI
    ? await contentAwareCutPlan(transcript.words, duration, callAI, {
        removeFillers: smart.removeFillers,
        removeRepetitions: smart.removeRepetitions,
        removeSilences: smart.removeSilences,
        silenceThresholdSec: smart.silenceThresholdSec,
        maxGapSec: smart.maxGapSec,
        paddingSec: smart.paddingSec,
        minKeepSec: smart.minKeepSec,
        goal: smart.goal,
        audience: smart.audience,
      })
    : buildSmartCutPlan(transcript.words, {
        duration,
        removeFillers: smart.removeFillers,
        removeRepetitions: smart.removeRepetitions,
        removeSilences: smart.removeSilences,
        silenceThresholdSec: smart.silenceThresholdSec,
        maxGapSec: smart.maxGapSec,
        paddingSec: smart.paddingSec,
        minKeepSec: smart.minKeepSec,
      });

  if (!plan.keepRanges.length) throw new Error('smart_cut_no_kept_segments');

  logger?.info?.('[footage_edit_smart] cut plan', {
    words: transcript.words.length,
    kept: plan.keptWords,
    removed: plan.removedWords,
    keepRanges: plan.keepRanges.length,
  });

  const cutPath = path.join(storage.root, 'tmp', `smart_cut_${stamp}.mp4`);
  await ffmpeg.cutKeepRanges({ inputPath: current, outputPath: cutPath, keepRanges: plan.keepRanges });
  current = cutPath;

  if (captionText || brandOverlayText) {
    const overlayed = path.join(storage.root, 'tmp', `smart_ov_${stamp}.mp4`);
    await ffmpeg.burnCaptionText({ inputPath: current, outputPath: overlayed, captionText, brandOverlayText });
    current = overlayed;
  }

  const cropped = path.join(storage.root, 'tmp', `smart_crop_${stamp}.mp4`);
  await ffmpeg.scaleCrop({ inputPath: current, outputPath: cropped, aspect });

  const saved = await storage.saveUpload(cropped, {
    ownerId,
    filename: `smart_footage_edit_${String(aspect).replace(':', 'x')}.mp4`,
    kind: 'output',
  });

  return {
    ok: true,
    outputKey: saved.key,
    publicUrl: saved.publicUrl,
    absolutePath: saved.absolutePath,
    aspect,
    durationSec: sumRanges(plan.keepRanges),
    editReport: {
      originalDuration: duration,
      keepDuration: sumRanges(plan.keepRanges),
      keepRanges: plan.keepRanges,
      removeRanges: plan.removeRanges,
      removedWords: plan.removedWords,
      keptWords: plan.keptWords,
      transcriptText: transcript.text,
      summary: plan.summary,
      provider: transcript.provider,
      model: transcript.model,
    },
  };
}

export default runSmartFootageEdit;