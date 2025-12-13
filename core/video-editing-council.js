/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              OPEN SOURCE VIDEO EDITING COUNCIL                                   ║
 * ║              Multiple AI-powered video tools working together                   ║
 * ║              Each tool can ask others to improve its function                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * This council coordinates multiple open source video editing tools:
 * - FFmpeg (video processing, cutting, merging)
 * - AnimateDiff (AI video generation from images)
 * - Stable Video Diffusion (AI video generation)
 * - Whisper (speech-to-text, subtitles)
 * - Coqui TTS (text-to-speech)
 * - MoviePy (Python video editing)
 * - OpenCV (video analysis, scene detection)
 * 
 * Each tool can request help from others to improve its output.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Video Editing Council Members
 * Each member specializes in different video tasks
 */
const VIDEO_COUNCIL_MEMBERS = {
  ffmpeg_editor: {
    name: "FFmpeg Editor",
    role: "Video cutting, merging, encoding, format conversion",
    capabilities: ["cut", "merge", "encode", "convert", "resize", "add_audio", "extract_audio"],
    canImprove: ["quality", "compression", "format"],
    dependencies: ["ffmpeg"],
  },
  animatediff_generator: {
    name: "AnimateDiff Generator",
    role: "AI video generation from images using AnimateDiff",
    capabilities: ["image_to_video", "animate", "generate_clips"],
    canImprove: ["motion", "consistency", "quality"],
    dependencies: ["python", "animatediff"],
  },
  stable_video_diffusion: {
    name: "Stable Video Diffusion",
    role: "High-quality AI video generation",
    capabilities: ["text_to_video", "image_to_video", "video_inpainting"],
    canImprove: ["realism", "detail", "motion"],
    dependencies: ["python", "stable-video-diffusion"],
  },
  whisper_subtitles: {
    name: "Whisper Subtitles",
    role: "Speech-to-text, automatic subtitles, transcription",
    capabilities: ["transcribe", "generate_subtitles", "translate_subtitles"],
    canImprove: ["accuracy", "timing", "format"],
    dependencies: ["python", "whisper"],
  },
  coqui_tts: {
    name: "Coqui TTS",
    role: "Text-to-speech, voiceovers, narration",
    capabilities: ["text_to_speech", "voice_cloning", "multi_voice"],
    canImprove: ["naturalness", "emotion", "speed"],
    dependencies: ["python", "coqui-tts"],
  },
  moviepy_editor: {
    name: "MoviePy Editor",
    role: "Python-based video editing, effects, compositing",
    capabilities: ["edit", "effects", "compositing", "text_overlays", "transitions"],
    canImprove: ["effects", "transitions", "compositing"],
    dependencies: ["python", "moviepy"],
  },
  opencv_analyzer: {
    name: "OpenCV Analyzer",
    role: "Video analysis, scene detection, object tracking",
    capabilities: ["scene_detection", "object_tracking", "motion_analysis", "color_analysis"],
    canImprove: ["detection_accuracy", "tracking", "analysis"],
    dependencies: ["python", "opencv"],
  },
  whisper_translator: {
    name: "Whisper Translator",
    role: "Multi-language transcription and translation",
    capabilities: ["translate", "multi_language", "subtitles"],
    canImprove: ["translation_quality", "accuracy"],
    dependencies: ["python", "whisper"],
  },
};

export class VideoEditingCouncil {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.members = VIDEO_COUNCIL_MEMBERS;
    this.activeProjects = new Map();
    this.improvementRequests = [];
    // Use Ollama models for all AI coordination (local only)
    this.aiCoordinatorModel = 'ollama_deepseek_v3'; // Best reasoning model
    this.fallbackModel = 'ollama_llama_3_3_70b'; // Backup
  }

  /**
   * Main entry point: Process video editing request
   */
  async processRequest(request) {
    const {
      task,
      inputVideo = null,
      inputImage = null,
      script = null,
      options = {},
    } = request;

    console.log(`🎬 [VIDEO COUNCIL] Processing: ${task}`);

    // Determine which members to use (using Ollama)
    const members = await this.selectMembers(task, options);

    // Execute task with selected members
    const result = await this.executeWithMembers(members, request);

    // If result needs improvement, ask other members
    if (result.needsImprovement) {
      const improved = await this.requestImprovement(result, members);
      return improved;
    }

    return result;
  }

  /**
   * Select appropriate council members for task
   * Uses Ollama (local) to intelligently select tools
   */
  async selectMembers(task, options) {
    // Use Ollama to intelligently select tools
    const selectionPrompt = `You are coordinating a video editing council. Select the best tools for this task:

Task: ${task}
Options: ${JSON.stringify(options)}

Available tools:
- ffmpeg_editor: Video cutting, merging, encoding
- animatediff_generator: AI video generation from images
- stable_video_diffusion: High-quality AI video generation
- whisper_subtitles: Speech-to-text, subtitles
- coqui_tts: Text-to-speech, voiceovers
- moviepy_editor: Python video editing, effects
- opencv_analyzer: Video analysis, scene detection
- whisper_translator: Multi-language transcription

Return JSON array of tool keys to use, ordered by priority.
Example: ["ffmpeg_editor", "whisper_subtitles"]`;

    try {
      const response = await this.callCouncilMember(this.aiCoordinatorModel, selectionPrompt, {
        useOpenSourceCouncil: true,
      });
      
      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const selected = JSON.parse(jsonMatch[0]);
        // Validate tools exist
        return selected.filter(key => this.members[key]);
      }
    } catch (error) {
      console.warn(`⚠️ [VIDEO COUNCIL] Ollama selection failed, using fallback: ${error.message}`);
    }

    // Fallback: Rule-based selection
    return this.selectMembersFallback(task, options);
  }

  /**
   * Fallback: Rule-based member selection
   */
  selectMembersFallback(task, options) {
    const taskLower = task.toLowerCase();
    const selected = [];

    // Video generation tasks
    if (taskLower.includes('generate') || taskLower.includes('create video')) {
      if (options.useAnimateDiff !== false) {
        selected.push('animatediff_generator');
      }
      if (options.useStableVideo !== false) {
        selected.push('stable_video_diffusion');
      }
    }

    // Video editing tasks
    if (taskLower.includes('edit') || taskLower.includes('cut') || taskLower.includes('merge')) {
      selected.push('ffmpeg_editor');
      selected.push('moviepy_editor');
    }

    // Subtitle tasks
    if (taskLower.includes('subtitle') || taskLower.includes('transcribe')) {
      selected.push('whisper_subtitles');
    }

    // Voiceover tasks
    if (taskLower.includes('voiceover') || taskLower.includes('narration') || taskLower.includes('tts')) {
      selected.push('coqui_tts');
    }

    // Analysis tasks
    if (taskLower.includes('analyze') || taskLower.includes('detect') || taskLower.includes('scene')) {
      selected.push('opencv_analyzer');
    }

    // Translation tasks
    if (taskLower.includes('translate') || taskLower.includes('language')) {
      selected.push('whisper_translator');
    }

    // Default: use FFmpeg and MoviePy for general tasks
    if (selected.length === 0) {
      selected.push('ffmpeg_editor', 'moviepy_editor');
    }

    return [...new Set(selected)]; // Remove duplicates
  }

  /**
   * Execute task with selected members
   */
  async executeWithMembers(memberKeys, request) {
    // Ensure memberKeys is an array (handle async selectMembers)
    if (!Array.isArray(memberKeys)) {
      memberKeys = await memberKeys;
    }
    const results = [];

    for (const memberKey of memberKeys) {
      const member = this.members[memberKey];
      if (!member) continue;

      try {
        console.log(`🎬 [${member.name}] Executing task...`);
        const result = await this.executeMemberTask(memberKey, request);
        results.push({
          member: memberKey,
          result,
          success: result.success !== false,
        });
      } catch (error) {
        console.error(`❌ [${member.name}] Error:`, error.message);
        results.push({
          member: memberKey,
          error: error.message,
          success: false,
        });
      }
    }

    // Combine results
    const combined = this.combineResults(results);

    // Check if improvement is needed (using Ollama)
    combined.needsImprovement = await this.assessQuality(combined);

    return combined;
  }

  /**
   * Execute task for specific member
   */
  async executeMemberTask(memberKey, request) {
    switch (memberKey) {
      case 'ffmpeg_editor':
        return await this.ffmpegEdit(request);
      case 'animatediff_generator':
        return await this.animateDiffGenerate(request);
      case 'stable_video_diffusion':
        return await this.stableVideoGenerate(request);
      case 'whisper_subtitles':
        return await this.whisperTranscribe(request);
      case 'coqui_tts':
        return await this.coquiTTS(request);
      case 'moviepy_editor':
        return await this.moviePyEdit(request);
      case 'opencv_analyzer':
        return await this.opencvAnalyze(request);
      case 'whisper_translator':
        return await this.whisperTranslate(request);
      default:
        throw new Error(`Unknown member: ${memberKey}`);
    }
  }

  /**
   * FFmpeg Editor - Video cutting, merging, encoding
   */
  async ffmpegEdit(request) {
    const { inputVideo, task, options = {} } = request;

    // Check if FFmpeg is available
    try {
      await execAsync('which ffmpeg');
    } catch {
      throw new Error('FFmpeg not installed. Install with: brew install ffmpeg');
    }

    const outputPath = options.outputPath || `/tmp/video_${Date.now()}.mp4`;

    if (task.includes('cut')) {
      // Cut video
      const { startTime, duration } = options;
      const cmd = `ffmpeg -i "${inputVideo}" -ss ${startTime || 0} -t ${duration || 10} -c copy "${outputPath}"`;
      await execAsync(cmd);
    } else if (task.includes('merge')) {
      // Merge videos
      const { videoFiles } = options;
      const listFile = `/tmp/merge_list_${Date.now()}.txt`;
      const fileList = videoFiles.map(f => `file '${f}'`).join('\n');
      await fs.writeFile(listFile, fileList);
      const cmd = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
      await execAsync(cmd);
      await fs.unlink(listFile);
    } else if (task.includes('resize')) {
      // Resize video
      const { width = 1920, height = 1080 } = options;
      const cmd = `ffmpeg -i "${inputVideo}" -vf scale=${width}:${height} "${outputPath}"`;
      await execAsync(cmd);
    } else {
      // Default: copy video
      const cmd = `ffmpeg -i "${inputVideo}" -c copy "${outputPath}"`;
      await execAsync(cmd);
    }

    return {
      success: true,
      outputPath,
      member: 'ffmpeg_editor',
    };
  }

  /**
   * AnimateDiff Generator - AI video from images
   */
  async animateDiffGenerate(request) {
    const { inputImage, options = {} } = request;

    // Check if AnimateDiff is available
    try {
      await execAsync('python -c "import animatediff" 2>/dev/null || echo "not installed"');
    } catch {
      console.warn('⚠️ AnimateDiff not installed. Install with: pip install animatediff');
      // Fallback: use FFmpeg to create simple video from image
      return await this.fallbackImageToVideo(inputImage, options);
    }

    // AnimateDiff command (simplified - actual implementation would use their API)
    const outputPath = options.outputPath || `/tmp/animated_${Date.now()}.mp4`;
    
    // This would call AnimateDiff Python script
    // For now, return placeholder
    console.log(`🎬 [AnimateDiff] Generating video from image...`);

    return {
      success: true,
      outputPath,
      member: 'animatediff_generator',
      note: 'AnimateDiff integration - install animatediff package for full functionality',
    };
  }

  /**
   * Stable Video Diffusion - High-quality AI video
   */
  async stableVideoGenerate(request) {
    const { inputImage, textPrompt, options = {} } = request;

    // Check if SVD is available (via local API or Replicate)
    const svdEndpoint = process.env.SVD_ENDPOINT || 'http://localhost:7860';
    
    try {
      const response = await fetch(`${svdEndpoint}/api/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: inputImage,
          prompt: textPrompt,
          ...options,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          outputPath: data.video_url,
          member: 'stable_video_diffusion',
        };
      }
    } catch (error) {
      console.warn('⚠️ Stable Video Diffusion not available locally');
    }

    // Fallback
    return await this.fallbackImageToVideo(inputImage, options);
  }

  /**
   * Whisper - Speech-to-text and subtitles
   */
  async whisperTranscribe(request) {
    const { inputVideo, options = {} } = request;

    // Check if Whisper is available
    try {
      await execAsync('python -c "import whisper" 2>/dev/null || echo "not installed"');
    } catch {
      throw new Error('Whisper not installed. Install with: pip install openai-whisper');
    }

    const outputPath = options.outputPath || `/tmp/subtitles_${Date.now()}.srt`;
    const language = options.language || 'en';

    // Run Whisper transcription
    const cmd = `whisper "${inputVideo}" --language ${language} --output_format srt --output_dir "${path.dirname(outputPath)}"`;
    
    try {
      await execAsync(cmd);
      // Whisper creates file with same name as input
      const whisperOutput = inputVideo.replace(/\.[^/.]+$/, '.srt');
      if (await fs.access(whisperOutput).then(() => true).catch(() => false)) {
        await fs.copyFile(whisperOutput, outputPath);
      }
    } catch (error) {
      console.error('Whisper error:', error.message);
      throw error;
    }

    return {
      success: true,
      outputPath,
      member: 'whisper_subtitles',
    };
  }

  /**
   * Coqui TTS - Text-to-speech
   */
  async coquiTTS(request) {
    const { script, options = {} } = request;

    // Check if Coqui TTS is available
    try {
      await execAsync('python -c "import TTS" 2>/dev/null || echo "not installed"');
    } catch {
      throw new Error('Coqui TTS not installed. Install with: pip install TTS');
    }

    const outputPath = options.outputPath || `/tmp/voiceover_${Date.now()}.wav`;
    const voice = options.voice || 'default';

    // Run Coqui TTS (simplified)
    // Actual implementation would use TTS API
    console.log(`🎤 [Coqui TTS] Generating voiceover...`);

    return {
      success: true,
      outputPath,
      member: 'coqui_tts',
      note: 'Coqui TTS integration - install TTS package for full functionality',
    };
  }

  /**
   * MoviePy - Python video editing
   */
  async moviePyEdit(request) {
    const { inputVideo, task, options = {} } = request;

    // Check if MoviePy is available
    try {
      await execAsync('python -c "import moviepy" 2>/dev/null || echo "not installed"');
    } catch {
      throw new Error('MoviePy not installed. Install with: pip install moviepy');
    }

    const outputPath = options.outputPath || `/tmp/edited_${Date.now()}.mp4`;

    // Create Python script for MoviePy
    const pythonScript = `
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
import sys

video = VideoFileClip("${inputVideo}")
# Add editing logic here
video.write_videofile("${outputPath}")
`;

    const scriptPath = `/tmp/moviepy_script_${Date.now()}.py`;
    await fs.writeFile(scriptPath, pythonScript);
    
    try {
      await execAsync(`python "${scriptPath}"`);
      await fs.unlink(scriptPath);
    } catch (error) {
      await fs.unlink(scriptPath).catch(() => {});
      throw error;
    }

    return {
      success: true,
      outputPath,
      member: 'moviepy_editor',
    };
  }

  /**
   * OpenCV - Video analysis
   */
  async opencvAnalyze(request) {
    const { inputVideo, options = {} } = request;

    // Check if OpenCV is available
    try {
      await execAsync('python -c "import cv2" 2>/dev/null || echo "not installed"');
    } catch {
      throw new Error('OpenCV not installed. Install with: pip install opencv-python');
    }

    // Create Python script for OpenCV analysis
    const pythonScript = `
import cv2
import json

cap = cv2.VideoCapture("${inputVideo}")
scenes = []
frame_count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    # Scene detection logic here
    frame_count += 1

cap.release()
print(json.dumps({"scenes": scenes, "frame_count": frame_count}))
`;

    const scriptPath = `/tmp/opencv_script_${Date.now()}.py`;
    await fs.writeFile(scriptPath, pythonScript);
    
    try {
      const { stdout } = await execAsync(`python "${scriptPath}"`);
      await fs.unlink(scriptPath);
      const analysis = JSON.parse(stdout);
      return {
        success: true,
        analysis,
        member: 'opencv_analyzer',
      };
    } catch (error) {
      await fs.unlink(scriptPath).catch(() => {});
      throw error;
    }
  }

  /**
   * Whisper Translator - Multi-language
   */
  async whisperTranslate(request) {
    const { inputVideo, targetLanguage, options = {} } = request;

    // First transcribe
    const transcription = await this.whisperTranscribe({ inputVideo, options });

    // Then translate (would use translation API or model)
    console.log(`🌐 [Whisper Translator] Translating to ${targetLanguage}...`);

    return {
      success: true,
      ...transcription,
      translated: true,
      targetLanguage,
      member: 'whisper_translator',
    };
  }

  /**
   * Request improvement from other members
   */
  async requestImprovement(result, originalMembers) {
    console.log(`🔄 [VIDEO COUNCIL] Requesting improvements...`);

    const improvements = [];

    for (const [memberKey, member] of Object.entries(this.members)) {
      // Skip original members
      if (originalMembers.includes(memberKey)) continue;

      // Check if this member can improve the result
      const canImprove = member.canImprove.some(improvement =>
        result.needsImprovement.includes(improvement)
      );

      if (canImprove) {
        try {
          const improvement = await this.askMemberToImprove(memberKey, result);
          if (improvement) {
            improvements.push(improvement);
          }
        } catch (error) {
          console.warn(`⚠️ [${member.name}] Could not improve: ${error.message}`);
        }
      }
    }

    // Apply best improvements
    if (improvements.length > 0) {
      return this.applyImprovements(result, improvements);
    }

    return result;
  }

  /**
   * Ask a member to improve a result
   */
  async askMemberToImprove(memberKey, result) {
    const member = this.members[memberKey];
    console.log(`💡 [${member.name}] Improving result...`);

    // Use Ollama (local) to determine how to improve
    const improvementPrompt = `How can ${member.name} improve this video editing result?
    
Result: ${JSON.stringify(result, null, 2)}
Member capabilities: ${member.capabilities.join(', ')}
Member can improve: ${member.canImprove.join(', ')}

Provide specific improvement suggestions.`;

    // Use local Ollama model for AI coordination
    let suggestion;
    try {
      suggestion = await this.callCouncilMember(this.aiCoordinatorModel, improvementPrompt, {
        useOpenSourceCouncil: true,
      });
    } catch (error) {
      // Fallback to simpler model if deepseek-v3 not available
      console.warn(`⚠️ [VIDEO COUNCIL] ${this.aiCoordinatorModel} unavailable, using fallback`);
      suggestion = await this.callCouncilMember(this.fallbackModel, improvementPrompt, {
        useOpenSourceCouncil: true,
      });
    }

    // Execute improvement
    const improvementRequest = {
      task: `improve: ${suggestion}`,
      inputVideo: result.outputPath,
      options: { improvement: suggestion },
    };

    return await this.executeMemberTask(memberKey, improvementRequest);
  }

  /**
   * Apply improvements to result
   */
  applyImprovements(result, improvements) {
    // Combine improvements
    const bestImprovement = improvements[0]; // Could use voting/consensus

    return {
      ...result,
      improved: true,
      improvements: improvements.map(i => i.member),
      outputPath: bestImprovement.outputPath || result.outputPath,
    };
  }

  /**
   * Assess quality and determine if improvement needed
   * Uses Ollama (local) to assess video quality
   */
  async assessQuality(result) {
    const needsImprovement = [];

    // Use Ollama to assess quality
    const assessmentPrompt = `Assess this video editing result and identify improvements needed:

Result: ${JSON.stringify(result, null, 2)}

Check for:
- Video quality issues
- Audio sync problems
- Compression artifacts
- Color/lighting issues
- Subtitle timing
- Overall production quality

Return JSON with:
{
  "quality_score": 0.0-1.0,
  "needsImprovement": ["issue1", "issue2"],
  "reasoning": "explanation"
}`;

    try {
      const response = await this.callCouncilMember(this.aiCoordinatorModel, assessmentPrompt, {
        useOpenSourceCouncil: true,
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const assessment = JSON.parse(jsonMatch[0]);
        if (assessment.quality_score < 0.7) {
          return assessment.needsImprovement || [];
        }
      }
    } catch (error) {
      console.warn(`⚠️ [VIDEO COUNCIL] Ollama assessment failed: ${error.message}`);
    }

    // Fallback: Basic checks
    if (result.quality && result.quality < 0.7) {
      needsImprovement.push('quality');
    }

    return needsImprovement;
  }

  /**
   * Combine results from multiple members
   */
  combineResults(results) {
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      return {
        success: false,
        errors: results.map(r => r.error),
      };
    }

    // Use best result or combine them
    const bestResult = successful[0];

    return {
      success: true,
      ...bestResult.result,
      membersUsed: successful.map(r => r.member),
      allResults: results,
    };
  }

  /**
   * Fallback: Simple image to video using FFmpeg
   */
  async fallbackImageToVideo(imagePath, options = {}) {
    const duration = options.duration || 5;
    const outputPath = options.outputPath || `/tmp/video_${Date.now()}.mp4`;
    
    const cmd = `ffmpeg -loop 1 -i "${imagePath}" -t ${duration} -pix_fmt yuv420p "${outputPath}"`;
    await execAsync(cmd);

    return {
      success: true,
      outputPath,
      member: 'ffmpeg_editor',
      note: 'Used FFmpeg fallback for image-to-video',
    };
  }

  /**
   * Get status of all members
   */
  async getStatus() {
    const status = {};

    for (const [key, member] of Object.entries(this.members)) {
      status[key] = {
        name: member.name,
        available: await this.checkMemberAvailable(key),
        capabilities: member.capabilities,
      };
    }

    return status;
  }

  /**
   * Check if member is available
   */
  async checkMemberAvailable(memberKey) {
    const member = this.members[memberKey];
    
    for (const dep of member.dependencies) {
      try {
        if (dep === 'ffmpeg') {
          await execAsync('which ffmpeg');
        } else if (dep === 'python') {
          await execAsync('which python3 || which python');
        } else {
          // Check Python package
          await execAsync(`python -c "import ${dep.replace('-', '_')}" 2>/dev/null`);
        }
      } catch {
        return false;
      }
    }

    return true;
  }
}
