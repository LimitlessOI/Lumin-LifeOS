// SYNOPSIS: FFmpeg provider — trim, captions, crop, photo polish (array-arg spawn only)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

function runProbe(bin, args, { timeoutMs = DEFAULT_TIMEOUT_MS, logger } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`ffprobe_timeout_${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger?.warn?.('[FFPROBE] non-zero exit', { code, stderr: stderr.slice(-400) });
        reject(new Error(`ffprobe_exit_${code}: ${stderr.slice(-300)}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function runSpawn(bin, args, { timeoutMs = DEFAULT_TIMEOUT_MS, logger } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`ffmpeg_timeout_${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger?.warn?.('[FFMPEG] non-zero exit', { code, stderr: stderr.slice(-800) });
        reject(new Error(`ffmpeg_exit_${code}: ${stderr.slice(-400)}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export function createFfmpegProvider({ logger = console, bin = 'ffmpeg' } = {}) {
  async function getDuration(inputPath) {
    const probeBin = bin.replace(/ffmpeg$/, 'ffprobe').replace(/ffmpeg\.exe$/, 'ffprobe.exe');
    const { stdout } = await runProbe(probeBin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inputPath], { timeoutMs: 30000, logger });
    const d = parseFloat(stdout.trim());
    if (!Number.isFinite(d) || d <= 0) throw new Error('duration_probe_failed');
    return d;
  }

  async function extractAudio({ inputPath, outputPath, sampleRate = 16000, channels = 1, bitrate = '32k' }) {
    await run(['-y', '-i', inputPath, '-vn', '-ar', String(sampleRate), '-ac', String(channels), '-b:a', bitrate, '-f', 'mp3', outputPath]);
    return outputPath;
  }

  async function cutKeepRanges({ inputPath, outputPath, keepRanges = [] }) {
    if (!keepRanges.length) throw new Error('cutKeepRanges_empty');
    const expr = keepRanges.map(([s, e]) => `between(t,${Number(s).toFixed(3)},${Number(e).toFixed(3)})`).join('+');
    await run([
      '-y', '-i', inputPath,
      '-vf', `select='${expr}',setpts=N/FRAME_RATE/TB`,
      '-af', `aselect='${expr}',asetpts=N/SR/TB`,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputPath,
    ]);
    return outputPath;
  }

  async function probeAvailable() {
    try {
      await runSpawn(bin, ['-version'], { timeoutMs: 10000, logger });
      return true;
    } catch {
      return false;
    }
  }

  async function run(args) {
    return runSpawn(bin, args, { logger });
  }

  async function trimVideo({ inputPath, outputPath, startSec = 0, endSec }) {
    const start = Math.max(0, Number(startSec) || 0);
    const args = ['-y', '-ss', String(start), '-i', inputPath];
    if (endSec != null && Number(endSec) > start) {
      args.push('-to', String(Number(endSec)));
    }
    args.push('-c', 'copy', outputPath);
    try {
      await run(args);
    } catch {
      // Re-encode fallback when stream copy fails (odd containers)
      const fallback = ['-y', '-ss', String(start), '-i', inputPath];
      if (endSec != null && Number(endSec) > start) fallback.push('-to', String(Number(endSec)));
      fallback.push('-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', outputPath);
      await run(fallback);
    }
    return outputPath;
  }

  async function burnCaptions({ inputPath, outputPath, srtPath }) {
    const escaped = String(srtPath).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    await run([
      '-y', '-i', inputPath,
      '-vf', `subtitles='${escaped}'`,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-movflags', '+faststart',
      outputPath,
    ]);
    return outputPath;
  }

  async function burnCaptionText({ inputPath, outputPath, captionText, brandOverlayText }) {
    const lines = [];
    if (captionText) {
      const t = String(captionText).replace(/:/g, '\\:').replace(/'/g, '').slice(0, 180);
      lines.push(`drawtext=text='${t}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-th-80`);
    }
    if (brandOverlayText) {
      const t = String(brandOverlayText).replace(/:/g, '\\:').replace(/'/g, '').slice(0, 80);
      lines.push(`drawtext=text='${t}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.4:x=40:y=40`);
    }
    if (!lines.length) {
      await fs.copyFile(inputPath, outputPath);
      return outputPath;
    }
    await run([
      '-y', '-i', inputPath,
      '-vf', lines.join(','),
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-movflags', '+faststart',
      outputPath,
    ]);
    return outputPath;
  }

  function cropFilter(aspect) {
    if (aspect === '9:16') return 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
    if (aspect === '1:1') return 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080';
    if (aspect === '16:9') return 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
    return null;
  }

  async function scaleCrop({ inputPath, outputPath, aspect = '9:16' }) {
    const vf = cropFilter(aspect);
    if (!vf) {
      await fs.copyFile(inputPath, outputPath);
      return outputPath;
    }
    await run([
      '-y', '-i', inputPath,
      '-vf', vf,
      '-c:a', 'aac',
      '-c:v', 'libx264',
      '-movflags', '+faststart',
      outputPath,
    ]);
    return outputPath;
  }

  async function polishPhoto({ inputPath, outputPath, maxWidth = 1920, captionText }) {
    const filters = [`scale='min(${Number(maxWidth) || 1920},iw)':-2`];
    if (captionText) {
      const t = String(captionText).replace(/:/g, '\\:').replace(/'/g, '').slice(0, 120);
      filters.push(`drawtext=text='${t}':fontcolor=white:fontsize=42:box=1:boxcolor=black@0.45:x=(w-text_w)/2:y=h-th-40`);
    }
    await run([
      '-y', '-i', inputPath,
      '-vf', filters.join(','),
      '-q:v', '2',
      outputPath,
    ]);
    return outputPath;
  }

  return {
    probeAvailable,
    run,
    getDuration,
    extractAudio,
    trimVideo,
    burnCaptions,
    burnCaptionText,
    cutKeepRanges,
    scaleCrop,
    polishPhoto,
  };
}

export default createFfmpegProvider;