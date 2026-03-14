/**
 * Video Generation Pipeline — Replicate API
 *
 * Turns a text script into a cinematic video:
 *   Script → Scenes → Images (Flux/SDXL) → Audio (ElevenLabs) → Video (Wan/Kling) → Compose (FFmpeg) → Deliver
 *
 * Models used (best 2025 options on Replicate):
 *   Images:  black-forest-labs/flux-schnell       (fast, cinematic, $0.003/img)
 *   Video:   wan-video/wan2.1-t2v-480p             (text→video, realistic motion)
 *   Audio:   elevenlabs (direct API, not Replicate)
 *   Compose: ffmpeg (local binary)
 *
 * Required env vars:
 *   REPLICATE_API_TOKEN  — get at replicate.com
 *   ELEVENLABS_API_KEY   — get at elevenlabs.io (optional, TTS)
 *
 * Usage:
 *   import VideoPipeline from './services/video-pipeline.js';
 *   const pipeline = new VideoPipeline();
 *   const result = await pipeline.generate({
 *     script: 'A real estate agent walks into a modern home...',
 *     style: 'cinematic',        // cinematic | animated | documentary | product
 *     duration: 30,              // seconds
 *     voice: 'professional',     // professional | friendly | energetic
 *     outputPath: 'outputs/video_123.mp4',
 *   });
 *   // result.videoUrl — publicly accessible URL or local path
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger.js';

const execAsync = promisify(exec);

// Style → Replicate prompt modifier mapping
const STYLE_PROMPTS = {
  cinematic: 'cinematic film, 4K, shallow depth of field, professional lighting, realistic, movie quality',
  animated: 'stylized animation, smooth motion, vibrant colors, Pixar-quality',
  documentary: 'documentary style, natural lighting, handheld camera, authentic, journalistic',
  product: 'product photography, studio lighting, clean background, professional, sharp focus',
};

// Available video models on Replicate (ordered by quality/cost) — verified 2025
const VIDEO_MODELS = {
  fast: 'wavespeedai/wan-2.1-i2v-480p',           // Wan 2.1 — ~$0.02-0.04/clip, fast, good quality
  quality: 'klingai/kling-1.6',                    // Kling 1.6 — ~$0.05-0.08/clip, BEST realistic motion
  premium: 'minimax/video-01',                     // Minimax — solid alternative, ~$0.04/clip
  image_to_video: 'stability-ai/stable-video-diffusion', // img→video for image-based scenes
};

const IMAGE_MODELS = {
  fast: 'black-forest-labs/flux-schnell',       // ~$0.003/image, 4 steps
  quality: 'black-forest-labs/flux-dev',        // ~$0.025/image, best quality
};

export default class VideoPipeline {
  constructor(options = {}) {
    this.apiToken = options.apiToken || process.env.REPLICATE_API_TOKEN;
    this.elevenLabsKey = options.elevenLabsKey || process.env.ELEVENLABS_API_KEY;
    this.outputDir = options.outputDir || 'public/previews/videos';
    this.costAccumulator = 0;
  }

  /**
   * Main entry: generate a complete video from a script.
   */
  async generate(options = {}) {
    const {
      script,
      style = 'cinematic',
      duration = 30,
      voice = 'professional',
      outputPath,
      useVideoModel = false, // true = Wan video model; false = images + ffmpeg (cheaper)
    } = options;

    if (!this.apiToken) {
      throw new Error('REPLICATE_API_TOKEN is required. Get one at replicate.com/account');
    }

    const jobId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    logger.info('[VIDEO] Starting generation', { jobId, style, duration, useVideoModel });

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    const finalOutput = outputPath || path.join(this.outputDir, `${jobId}.mp4`);

    try {
      // Step 1: Parse script into scenes
      const scenes = this.parseScript(script, duration);
      logger.info('[VIDEO] Script parsed', { jobId, sceneCount: scenes.length });

      let videoPath;

      if (useVideoModel) {
        // Path A: Text → Video directly via Wan model (best for motion-heavy content)
        videoPath = await this.generateVideoClips(scenes, style, jobId);
      } else {
        // Path B: Text → Images → Compose with FFmpeg (cheaper, more control)
        const imagePaths = await this.generateSceneImages(scenes, style, jobId);
        const audioPath = await this.generateNarration(script, voice, jobId);
        videoPath = await this.composeVideo(imagePaths, audioPath, scenes, finalOutput);
      }

      logger.info('[VIDEO] Generation complete', { jobId, outputPath: videoPath, totalCost: this.costAccumulator });

      return {
        success: true,
        jobId,
        videoPath,
        scenes: scenes.length,
        estimatedCost: this.costAccumulator,
      };
    } catch (err) {
      logger.error('[VIDEO] Generation failed', { jobId, error: err.message });
      return { success: false, jobId, error: err.message };
    }
  }

  /**
   * Step 1: Parse script into timestamped scenes.
   * Each scene = { text, visualDescription, duration, startTime }
   */
  parseScript(script, totalDuration) {
    const lines = script.split(/\n+/).filter((l) => l.trim().length > 20);
    const avgDurationPerScene = Math.max(3, Math.floor(totalDuration / Math.min(lines.length, 10)));

    return lines.slice(0, 10).map((line, i) => ({
      index: i,
      text: line.trim(),
      visualDescription: this.extractVisualFromText(line),
      duration: avgDurationPerScene,
      startTime: i * avgDurationPerScene,
    }));
  }

  /**
   * Extract a visual description from a text line for image generation.
   */
  extractVisualFromText(text) {
    // Remove spoken words, keep visual cues
    return text
      .replace(/\b(I|we|you|our|your|the)\b/gi, '')
      .replace(/[^\w\s,.]/g, '')
      .trim()
      .slice(0, 200);
  }

  /**
   * Step 2A: Generate one image per scene via Replicate Flux.
   */
  async generateSceneImages(scenes, style, jobId) {
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.cinematic;
    const imagePaths = [];

    for (const scene of scenes) {
      const prompt = `${scene.visualDescription}, ${stylePrompt}`;
      logger.debug('[VIDEO] Generating scene image', { jobId, scene: scene.index, prompt: prompt.slice(0, 80) });

      const imageUrl = await this.replicateRun(IMAGE_MODELS.fast, {
        prompt,
        num_outputs: 1,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 80,
        num_inference_steps: 4,
      });

      // Download image to local temp file
      const localPath = path.join(this.outputDir, `${jobId}_scene_${scene.index}.webp`);
      await this.downloadFile(Array.isArray(imageUrl) ? imageUrl[0] : imageUrl, localPath);
      imagePaths.push({ path: localPath, duration: scene.duration, scene });

      this.costAccumulator += 0.003; // Flux Schnell ~$0.003/image
    }

    return imagePaths;
  }

  /**
   * Step 2B: Generate video clips directly via Wan model.
   */
  async generateVideoClips(scenes, style, jobId) {
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.cinematic;
    const clipPaths = [];

    for (const scene of scenes.slice(0, 3)) { // Limit to 3 clips (cost control)
      const prompt = `${scene.visualDescription}, ${stylePrompt}`;
      logger.debug('[VIDEO] Generating video clip', { jobId, scene: scene.index });

      const videoUrl = await this.replicateRun(VIDEO_MODELS.fast, {
        prompt,
        num_frames: Math.min(scene.duration * 8, 81), // 8fps, max 81 frames
        guidance_scale: 7.5,
      });

      const localPath = path.join(this.outputDir, `${jobId}_clip_${scene.index}.mp4`);
      await this.downloadFile(Array.isArray(videoUrl) ? videoUrl[0] : videoUrl, localPath);
      clipPaths.push(localPath);

      this.costAccumulator += 0.08; // Wan ~$0.08/clip
    }

    // Concatenate clips with FFmpeg
    const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
    await this.concatenateClips(clipPaths, outputPath);
    return outputPath;
  }

  /**
   * Step 3: Generate narration audio via ElevenLabs.
   */
  async generateNarration(script, voiceStyle, jobId) {
    if (!this.elevenLabsKey) {
      logger.warn('[VIDEO] No ElevenLabs key — skipping narration audio');
      return null;
    }

    // Voice ID mapping (ElevenLabs built-in voices)
    const voices = {
      professional: 'JBFqnCBsd6RMkjVDRZzb', // George
      friendly: 'EXAVITQu4vr4xnSDxMaL',      // Sarah
      energetic: 'onwK4e9ZLuTAKqWW03F9',      // Daniel
    };

    const voiceId = voices[voiceStyle] || voices.professional;
    const audioPath = path.join(this.outputDir, `${jobId}_narration.mp3`);

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenLabsKey,
      },
      body: JSON.stringify({
        text: script.slice(0, 2500),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    });

    if (!response.ok) {
      logger.warn('[VIDEO] ElevenLabs TTS failed', { status: response.status });
      return null;
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(audioPath, Buffer.from(buffer));
    logger.info('[VIDEO] Narration generated', { jobId, audioPath });
    return audioPath;
  }

  /**
   * Step 4: Compose images + audio into final video via FFmpeg.
   */
  async composeVideo(imagePaths, audioPath, scenes, outputPath) {
    if (imagePaths.length === 0) throw new Error('No images to compose');

    // Build FFmpeg inputs
    const inputs = imagePaths.map(({ path: p, duration }) =>
      `-loop 1 -t ${duration} -i "${p}"`
    ).join(' ');

    const filterParts = imagePaths.map((_, i) =>
      `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`
    );

    const concatInputs = imagePaths.map((_, i) => `[v${i}]`).join('');
    const filterComplex = [
      ...filterParts,
      `${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[vout]`,
    ].join('; ');

    let audioInput = '';
    let audioMap = '';
    if (audioPath) {
      audioInput = `-i "${audioPath}"`;
      audioMap = `-map "[vout]" -map ${imagePaths.length}:a -shortest`;
    } else {
      audioMap = `-map "[vout]"`;
    }

    const cmd = [
      'ffmpeg -y',
      inputs,
      audioInput,
      `-filter_complex "${filterComplex}"`,
      audioMap,
      '-c:v libx264 -preset fast -crf 23',
      '-c:a aac -b:a 128k',
      `"${outputPath}"`,
    ].filter(Boolean).join(' ');

    logger.debug('[VIDEO] Running FFmpeg', { jobId: outputPath, cmd: cmd.slice(0, 200) });

    try {
      await execAsync(cmd, { timeout: 120000 });
      logger.info('[VIDEO] FFmpeg compose complete', { outputPath });
      return outputPath;
    } catch (err) {
      throw new Error(`FFmpeg failed: ${err.message}`);
    }
  }

  async concatenateClips(clipPaths, outputPath) {
    const listFile = outputPath + '.txt';
    const listContent = clipPaths.map((p) => `file '${path.resolve(p)}'`).join('\n');
    await fs.writeFile(listFile, listContent);

    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`, { timeout: 60000 });
    await fs.unlink(listFile).catch(() => {});
    return outputPath;
  }

  /**
   * Run a model on Replicate and wait for the output.
   */
  async replicateRun(modelId, input) {
    const { default: Replicate } = await import('replicate');
    const replicate = new Replicate({ auth: this.apiToken });

    const output = await replicate.run(modelId, { input });
    return output;
  }

  /**
   * Download a URL to a local file path.
   */
  async downloadFile(url, localPath) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${url} → ${response.status}`);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(localPath, Buffer.from(buffer));
    return localPath;
  }

  /**
   * Estimate cost before running.
   */
  estimateCost(sceneCount, useVideoModel = false) {
    if (useVideoModel) {
      return { model: 'Wan video', estimatedUSD: sceneCount * 0.08, note: 'Per video clip' };
    }
    return {
      model: 'Flux Schnell images + FFmpeg',
      estimatedUSD: sceneCount * 0.003,
      note: 'Per image. Add ~$0.05 for ElevenLabs narration.',
    };
  }
}
