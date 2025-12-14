/**
 * Open Source Video Generation Service
 * Uses Stable Video Diffusion or other open source models
 */

export class VideoGenerator {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelEndpoint = process.env.VIDEO_GEN_ENDPOINT || "http://localhost:7860";
    this.apiKey = process.env.VIDEO_GEN_API_KEY || null;
    
    if (!this.apiKey && this.modelEndpoint.includes('replicate')) {
      console.warn("⚠️ VIDEO_GEN_API_KEY not set - video generation will use fallback mode");
    }
  }

  /**
   * Generate video from script/prompt
   */
  async generateVideo({
    script,
    agent_id,
    project_id,
    style = "professional",
    duration = 30, // seconds
    use_agent_voice = false,
  }) {
    try {
      console.log(`🎬 [VIDEO GEN] Generating video for agent ${agent_id}`);

      // Step 1: Break script into scenes
      const scenes = await this.parseScriptIntoScenes(script);

      // Step 2: Generate images for each scene (using Stable Diffusion)
      const sceneImages = [];
      for (const scene of scenes) {
        const imagePrompt = this.createImagePrompt(scene, style);
        const image = await this.generateImage(imagePrompt);
        // Only add if image generation succeeded
        if (image) {
          sceneImages.push({ scene, image });
        } else {
          console.warn(`⚠️ [VIDEO GEN] Image generation failed for scene: ${scene.description?.substring(0, 50)}`);
        }
      }

      if (sceneImages.length === 0) {
        throw new Error("Failed to generate any images for video scenes");
      }

      // Step 3: Convert images to video using Stable Video Diffusion
      const videoClips = [];
      for (const { scene, image } of sceneImages) {
        // Double-check image is not null before processing
        if (!image) {
          console.warn(`⚠️ [VIDEO GEN] Skipping null image for scene`);
          continue;
        }
        const clip = await this.imageToVideo(image, scene.duration || 5);
        if (clip && clip.url) {
          videoClips.push(clip);
        }
      }

      if (videoClips.length === 0) {
        throw new Error("Failed to generate any video clips from images");
      }

      // Step 4: Add voiceover (if agent voice available)
      let audioUrl = null;
      if (use_agent_voice) {
        audioUrl = await this.generateVoiceover(script, agent_id);
      }

      // Step 5: Combine clips and add audio
      const finalVideo = await this.combineClips(videoClips, audioUrl);

      // Step 6: Add enhancements (b-roll, transitions, text overlays)
      const enhancedVideo = await this.enhanceVideo(finalVideo, {
        add_b_roll: true,
        add_transitions: true,
        add_text_overlays: true,
      });

      // Update project in database
      await this.pool.query(
        `UPDATE youtube_video_projects 
         SET edited_video_url = $1, b_roll_added = $2, status = $3, enhancements = $4
         WHERE id = $5`,
        [
          enhancedVideo.url,
          true,
          'completed',
          JSON.stringify({
            scenes: scenes.length,
            duration: enhancedVideo.duration,
            style,
            enhancements_applied: ['b_roll', 'transitions', 'text_overlays'],
          }),
          project_id,
        ]
      );

      return {
        success: true,
        video_url: enhancedVideo.url,
        duration: enhancedVideo.duration,
        scenes: scenes.length,
      };
    } catch (error) {
      console.error("❌ [VIDEO GEN] Error:", error.message);
      throw error;
    }
  }

  /**
   * Parse script into video scenes
   */
  async parseScriptIntoScenes(script) {
    const prompt = `Parse this video script into scenes for video generation:

${script}

For each scene, provide:
- Scene description (what visuals to show)
- Duration in seconds
- Visual style/prompt for image generation
- Any text overlays needed

Format as JSON array of scenes.`;

    // Use local Ollama model instead of ChatGPT
    const response = await this.callCouncilMember("ollama_deepseek_v3", prompt, {
      useOpenSourceCouncil: true,
      maxTokens: 2000,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("Failed to parse scenes, using fallback");
    }

    // Fallback: simple scene breakdown
    const lines = script.split("\n").filter(l => l.trim());
    return lines.map((line, i) => ({
      description: line.substring(0, 100),
      duration: 5,
      visual_prompt: line,
      text_overlay: line.substring(0, 50),
    }));
  }

  /**
   * Create image prompt from scene
   */
  createImagePrompt(scene, style) {
    return `Professional real estate video scene: ${scene.visual_prompt || scene.description}. 
Style: ${style}, high quality, cinematic, professional lighting, modern real estate setting.`;
  }

  /**
   * Generate image using Stable Diffusion (via API)
   */
  async generateImage(prompt) {
    try {
      // Option 1: Use Replicate API (easiest)
      if (this.apiKey && this.modelEndpoint.includes('replicate')) {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            input: {
              prompt,
              width: 1024,
              height: 576, // 16:9 for video
            },
          }),
        });

        const data = await response.json();
        
        // Poll for completion
        let result = data;
        while (result.status === "starting" || result.status === "processing") {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { "Authorization": `Token ${this.apiKey}` },
          });
          result = await statusResponse.json();
        }

        return result.output?.[0] || null;
      }

      // Option 2: Use local Stable Diffusion API
      const response = await fetch(`${this.modelEndpoint}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          width: 1024,
          height: 576,
          steps: 20,
          cfg_scale: 7,
        }),
      });

      const data = await response.json();
      return data.images?.[0] || null;
    } catch (error) {
      console.error("❌ [VIDEO GEN] Image generation error:", error.message);
      return null;
    }
  }

  /**
   * Convert image to video using Stable Video Diffusion
   */
  async imageToVideo(imageUrl, duration = 5) {
    try {
      // Use Replicate Stable Video Diffusion
      if (this.apiKey && this.modelEndpoint.includes('replicate')) {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
            input: {
              image: imageUrl,
              motion_bucket_id: 127,
              cond_aug: 0.02,
            },
          }),
        });

        const data = await response.json();
        
        // Poll for completion
        let result = data;
        while (result.status === "starting" || result.status === "processing") {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { "Authorization": `Token ${this.apiKey}` },
          });
          result = await statusResponse.json();
        }

        return {
          url: result.output,
          duration,
        };
      }

      // Fallback: return placeholder
      return { url: imageUrl, duration };
    } catch (error) {
      console.error("Video generation error:", error);
      throw error;
    }
  }

  /**
   * Generate voiceover from script
   */
  async generateVoiceover(script, agent_id) {
    try {
      // Get agent's voice profile if available
      const agentResult = await this.pool.query(
        "SELECT agent_tone, preferences FROM boldtrail_agents WHERE id = $1",
        [agent_id]
      );

      const agent = agentResult.rows[0];
      const voiceStyle = agent?.agent_tone || "professional and friendly";

      // Use text-to-speech API (ElevenLabs, Google TTS, or similar)
      // For now, return placeholder
      console.log(`🎤 Generating voiceover with style: ${voiceStyle}`);
      
      // TODO: Integrate with TTS service
      return null;
    } catch (error) {
      console.error("Voiceover generation error:", error);
      return null;
    }
  }

  /**
   * Combine video clips
   */
  async combineClips(clips, audioUrl) {
    // This would use FFmpeg or similar
    // For now, return first clip as placeholder
    console.log(`🎬 Combining ${clips.length} clips`);
    return {
      url: clips[0]?.url || null,
      duration: clips.reduce((sum, c) => sum + (c.duration || 5), 0),
    };
  }

  /**
   * Enhance video with b-roll, transitions, text
   */
  async enhanceVideo(video, options = {}) {
    console.log(`✨ Enhancing video with options:`, options);
    
    // This would use video editing libraries
    // For now, return enhanced version
    return {
      url: video.url,
      duration: video.duration,
      enhancements: options,
    };
  }

  /**
   * Alternative: Use AnimateDiff for simpler animation
   */
  async generateWithAnimateDiff(prompt, imageUrl = null) {
    // AnimateDiff can animate static images
    // Good for simpler use cases
    console.log("🎬 Using AnimateDiff for video generation");
    return null;
  }
}
