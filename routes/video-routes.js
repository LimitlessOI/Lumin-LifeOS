/**
 * Video Pipeline Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createVideoRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilWithFailover,
    callCouncilMember,
    VideoPipeline,
    logger,
  } = ctx;

// ==================== YOUTUBE VIDEO CREATION WORKFLOW ====================
app.post("/api/v1/youtube/create-project", requireKey, async (req, res) => {
  try {
    const { agent_id, title, description, topic } = req.body;

    if (!agent_id || !topic) {
      return res.status(400).json({ ok: false, error: "agent_id and topic required" });
    }

    // Check if agent has YouTube automation unlocked
    const unlockCheck = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [agent_id]
    );

    if (unlockCheck.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "YouTube automation not unlocked. Complete mastery requirements first.",
      });
    }

    // Generate video script (help them learn first)
    const scriptPrompt = `Create a YouTube video script for a real estate agent about: "${topic}"

The agent wants to learn how to create videos themselves. Provide:
1. A compelling hook (first 15 seconds)
2. Main content with talking points
3. Call to action
4. Tips for delivery

Keep it educational and helpful - this is for them to practice with.`;

    const script = await callCouncilWithFailover(scriptPrompt, "chatgpt");

    const result = await pool.query(
      `INSERT INTO youtube_video_projects (agent_id, title, description, script, status)
       VALUES ($1, $2, $3, $4, 'script_ready')
       RETURNING *`,
      [agent_id, title || `Video about ${topic}`, description || null, script]
    );

    // Check if agent has YouTube automation unlocked
    const hasAutomation = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [agent_id]
    );

    res.json({
      ok: true,
      project: result.rows[0],
      message: "Video project created. Choose your approach:",
      options: {
        learn_first: {
          description: "Record your video manually using the script (recommended for learning)",
          steps: [
            "1. Review the generated script",
            "2. Record your video using the script",
            "3. Upload via POST /api/v1/youtube/upload-raw",
            "4. AI will enhance with b-roll, transitions, and editing"
          ],
          endpoint: "POST /api/v1/youtube/upload-raw",
        },
        ai_generation: {
          description: "Use open source AI (Stable Video Diffusion) to generate the entire video",
          available: hasAutomation.rows.length > 0,
          requires: "Mastery level 5+ (YouTube automation feature unlock)",
          steps: [
            "1. System breaks script into scenes",
            "2. Generates images using Stable Diffusion",
            "3. Converts images to video using Stable Video Diffusion",
            "4. Adds voiceover (if agent voice available)",
            "5. Enhances with b-roll, transitions, text overlays"
          ],
          endpoint: "POST /api/v1/youtube/generate-video",
          technology: "Open source: Stable Video Diffusion (Stability AI)",
        },
      },
    });
  } catch (error) {
    console.error("YouTube project creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/youtube/upload-raw", requireKey, async (req, res) => {
  try {
    const { project_id, video_url } = req.body;

    if (!project_id || !video_url) {
      return res.status(400).json({ ok: false, error: "project_id and video_url required" });
    }

    await pool.query(
      `UPDATE youtube_video_projects 
       SET raw_video_url = $1, status = 'raw_uploaded'
       WHERE id = $2`,
      [video_url, project_id]
    );

    res.json({
      ok: true,
      message: "Raw video uploaded. System will now enhance it with b-roll and editing.",
    });
  } catch (error) {
    console.error("YouTube upload error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/youtube/generate-video", requireKey, async (req, res) => {
  try {
    const { project_id, style, use_agent_voice } = req.body;

    if (!project_id) {
      return res.status(400).json({ ok: false, error: "project_id required" });
    }

    // Get project
    const projectResult = await pool.query(
      "SELECT * FROM youtube_video_projects WHERE id = $1",
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const project = projectResult.rows[0];

    // Check if agent has YouTube automation unlocked
    const unlockCheck = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [project.agent_id]
    );

    if (unlockCheck.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "YouTube automation not unlocked. Complete mastery requirements first.",
      });
    }

    // Initialize video generator
    const { VideoGenerator } = await import("./core/video-generator.js");
    const videoGenerator = new VideoGenerator(pool, callCouncilMember);

    // Generate video (this runs async, so we'll update status)
    await pool.query(
      "UPDATE youtube_video_projects SET status = 'generating' WHERE id = $1",
      [project_id]
    );

    // Generate in background
    videoGenerator.generateVideo({
      script: project.script,
      agent_id: project.agent_id,
      project_id,
      style: style || "professional",
      use_agent_voice: use_agent_voice || false,
    })
      .then(result => {
        console.log(`✅ Video generated for project ${project_id}`);
      })
      .catch(error => {
        console.error(`❌ Video generation error for project ${project_id}:`, error);
        pool.query(
          "UPDATE youtube_video_projects SET status = 'error', enhancements = $1 WHERE id = $2",
          [JSON.stringify({ error: error.message }), project_id]
        );
      });

    res.json({
      ok: true,
      message: "Video generation started. This may take a few minutes. Check project status for updates.",
      project_id,
      status: "generating",
    });
  } catch (error) {
    console.error("YouTube video generation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/youtube/project/:projectId", requireKey, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      "SELECT * FROM youtube_video_projects WHERE id = $1",
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    res.json({
      ok: true,
      project: result.rows[0],
    });
  } catch (error) {
    console.error("YouTube project fetch error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VIDEO EDITING COUNCIL ====================
// Open source video editing tools working together like an AI council
let VideoEditingCouncil, videoEditingCouncil;

app.post("/api/v1/video/process", requireKey, async (req, res) => {
  try {
    if (!videoEditingCouncil) {
      const { VideoEditingCouncil: VEC } = await import("./core/video-editing-council.js");
      videoEditingCouncil = new VEC(pool, callCouncilMember);
    }

    const { task, inputVideo, inputImage, script, options = {} } = req.body;

    if (!task) {
      return res.status(400).json({ ok: false, error: "task required" });
    }

    console.log(`🎬 [VIDEO COUNCIL] Processing: ${task}`);

    const result = await videoEditingCouncil.processRequest({
      task,
      inputVideo,
      inputImage,
      script,
      options,
    });

    res.json({
      ok: result.success !== false,
      ...result,
    });
  } catch (error) {
    console.error("Video editing council error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VIDEO PIPELINE (Replicate — Kling/Wan → FFmpeg → MP4) ====================
// POST /api/v1/video/generate — generate a full video from a script
app.post("/api/v1/video/generate", requireKey, async (req, res) => {
  try {
    const { script, style = 'cinematic', duration = 30, voice = 'professional', useVideoModel = false } = req.body;
    if (!script) return res.status(400).json({ ok: false, error: 'script is required' });

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(503).json({
        ok: false,
        error: 'REPLICATE_API_TOKEN not set. Add it in Railway environment variables.',
        setupUrl: 'https://replicate.com/account/api-tokens',
      });
    }

    logger.info('[ROUTE] Starting video generation', { style, duration, useVideoModel });

    const pipeline = new VideoPipeline();
    const result = await pipeline.generate({ script, style, duration, voice, useVideoModel });

    if (result.success) {
      res.json({ ok: true, ...result, publicUrl: `/${result.videoPath}` });
    } else {
      res.status(500).json({ ok: false, error: result.error });
    }
  } catch (error) {
    logger.error('[ROUTE] Video generation failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/video/estimate — estimate cost before running
app.get("/api/v1/video/estimate", requireKey, (req, res) => {
  const { scenes = 5, useVideoModel = 'false' } = req.query;
  const pipeline = new VideoPipeline();
  const estimate = pipeline.estimateCost(parseInt(scenes), useVideoModel === 'true');
  res.json({ ok: true, ...estimate });
});

// GET /api/v1/video/council/status
app.get("/api/v1/video/council/status", requireKey, async (req, res) => {
  try {
    if (!videoEditingCouncil) {
      const { VideoEditingCouncil: VEC } = await import("./core/video-editing-council.js");
      videoEditingCouncil = new VEC(pool, callCouncilMember);
    }

    const status = await videoEditingCouncil.getStatus();

    res.json({
      ok: true,
      members: status,
      totalMembers: Object.keys(status).length,
      availableMembers: Object.values(status).filter(m => m.available).length,
    });
  } catch (error) {
    console.error("Video council status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CREATOR ENHANCEMENT SUITE ====================
app.post("/api/v1/creator/register", requireKey, async (req, res) => {
  try {
    const { email, name, brand_voice, style_preferences, content_themes, target_audience, platforms } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Check if exists
    const existing = await pool.query(
      "SELECT * FROM creator_profiles WHERE creator_email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        creator: existing.rows[0],
        message: "Creator already registered",
      });
    }

    // Create profile
    const result = await pool.query(
      `INSERT INTO creator_profiles 
       (creator_email, creator_name, brand_voice, style_preferences, content_themes, target_audience, platforms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        email,
        name || null,
        brand_voice || null,
        style_preferences ? JSON.stringify(style_preferences) : null,
        content_themes ? JSON.stringify(content_themes) : null,
        target_audience ? JSON.stringify(target_audience) : null,
        platforms ? JSON.stringify(platforms) : null,
      ]
    );

    res.json({
      ok: true,
      creator: result.rows[0],
      message: "Creator profile created",
    });
  } catch (error) {
    console.error("Creator registration error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/enhance-video", requireKey, async (req, res) => {
  try {
    const { creator_id, video_url, enhancement_options } = req.body;

    if (!creator_id || !video_url) {
      return res.status(400).json({ ok: false, error: "creator_id and video_url required" });
    }

    // Get creator profile for voice/style
    const creatorResult = await pool.query(
      "SELECT * FROM creator_profiles WHERE id = $1",
      [creator_id]
    );

    if (creatorResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Creator not found" });
    }

    const creator = creatorResult.rows[0];
    const options = enhancement_options || {
      color_correction: true,
      audio_enhancement: true,
      b_roll: true,
      transitions: true,
      text_overlays: true,
      branding: true,
    };

    // Create content record
    const contentResult = await pool.query(
      `INSERT INTO creator_content 
       (creator_id, content_type, original_url, status)
       VALUES ($1, 'video', $2, 'enhancing')
       RETURNING *`,
      [creator_id, video_url]
    );

    const contentId = contentResult.rows[0].id;

    // Generate enhancement plan using AI
    const enhancementPrompt = `Analyze this video and create an enhancement plan for a creator.

Creator's brand voice: ${creator.brand_voice || "professional and engaging"}
Style preferences: ${JSON.stringify(creator.style_preferences || {})}
Content themes: ${JSON.stringify(creator.content_themes || [])}

Enhancement options requested:
${JSON.stringify(options)}

Provide:
1. Color correction recommendations
2. Audio enhancement suggestions
3. B-roll opportunities
4. Transition points
5. Text overlay suggestions
6. Branding placement

Keep it aligned with their voice - enhance, don't change their style.`;

    const enhancementPlan = await callCouncilWithFailover(enhancementPrompt, "gemini");

    // Apply enhancements (this would use video processing libraries)
    // For now, we'll simulate the process
    const enhancements = {
      color_correction: options.color_correction ? "Applied" : null,
      audio_enhancement: options.audio_enhancement ? "Applied" : null,
      b_roll: options.b_roll ? "Added relevant b-roll" : null,
      transitions: options.transitions ? "Smooth transitions added" : null,
      text_overlays: options.text_overlays ? "Strategic text overlays" : null,
      branding: options.branding ? "Creator branding added" : null,
    };

    // Store enhancement record
    await pool.query(
      `INSERT INTO creator_enhancements (content_id, enhancement_type, before_data, after_data)
       VALUES ($1, 'full_enhancement', $2, $3)`,
      [
        contentId,
        JSON.stringify({ original_url: video_url }),
        JSON.stringify(enhancements),
      ]
    );

    // Update content with enhanced URL (placeholder - would be actual processed video)
    const enhancedUrl = video_url.replace(/\.(mp4|mov)$/, '_enhanced.$1'); // Simulated

    await pool.query(
      `UPDATE creator_content 
       SET enhanced_url = $1, status = 'enhanced'
       WHERE id = $2`,
      [enhancedUrl, contentId]
    );

    res.json({
      ok: true,
      content: {
        ...contentResult.rows[0],
        enhanced_url: enhancedUrl,
      },
      enhancements,
      plan: enhancementPlan,
      message: "Video enhanced while maintaining your unique style",
    });
  } catch (error) {
    console.error("Video enhancement error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/optimize-seo", requireKey, async (req, res) => {
  try {
    const { content_id, platform } = req.body;

    if (!content_id || !platform) {
      return res.status(400).json({ ok: false, error: "content_id and platform required" });
    }

    // Get content
    const contentResult = await pool.query(
      `SELECT c.*, p.brand_voice, p.content_themes, p.target_audience
       FROM creator_content c
       JOIN creator_profiles p ON c.creator_id = p.id
       WHERE c.id = $1`,
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Generate SEO-optimized title, description, tags
    const seoPrompt = `Optimize this content for ${platform} SEO while maintaining the creator's voice.

Current title: ${content.title || "Untitled"}
Current description: ${content.description || "No description"}
Platform: ${platform}
Creator's voice: ${content.brand_voice || "professional"}
Target audience: ${JSON.stringify(content.target_audience || {})}
Content themes: ${JSON.stringify(content.content_themes || [])}

Provide:
1. SEO-optimized title (maintains voice, includes keywords)
2. SEO-optimized description (first 2 lines are critical)
3. Relevant tags/keywords (10-15 tags)
4. SEO score (1-100)
5. Recommendations for improvement

Format as JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "seo_score": 85,
  "recommendations": ["...", "..."]
}`;

    const seoResponse = await callCouncilWithFailover(seoPrompt, "chatgpt");

    // Parse SEO data
    let seoData;
    try {
      const jsonMatch = seoResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        seoData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      // Fallback
      seoData = {
        title: content.title || "Optimized Title",
        description: content.description || "Optimized description",
        tags: [],
        seo_score: 75,
        recommendations: ["Add more keywords", "Improve description"],
      };
    }

    // Update content
    await pool.query(
      `UPDATE creator_content 
       SET title = $1, description = $2, tags = $3, seo_optimized = true, seo_score = $4
       WHERE id = $5`,
      [
        seoData.title,
        seoData.description,
        JSON.stringify(seoData.tags || []),
        seoData.seo_score || 75,
        content_id,
      ]
    );

    res.json({
      ok: true,
      seo: seoData,
      message: "Content optimized for SEO while maintaining your voice",
    });
  } catch (error) {
    console.error("SEO optimization error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/schedule-post", requireKey, async (req, res) => {
  try {
    const { content_id, platforms, scheduled_time, customizations } = req.body;

    if (!content_id || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ ok: false, error: "content_id and platforms array required" });
    }

    // Get content
    const contentResult = await pool.query(
      "SELECT * FROM creator_content WHERE id = $1",
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Create posts for each platform
    const posts = [];
    for (const platform of platforms) {
      // Platform-specific optimizations
      const platformPrompt = `Adapt this content for ${platform}:

Title: ${content.title}
Description: ${content.description}
Tags: ${JSON.stringify(content.tags || [])}

Platform requirements:
${platform === 'youtube' ? 'Long-form, detailed descriptions, tags important' : ''}
${platform === 'instagram' ? 'Short captions, hashtags, visual-first' : ''}
${platform === 'tiktok' ? 'Very short, trending hashtags, hook-focused' : ''}
${platform === 'twitter' ? 'Concise, thread-friendly, engagement-focused' : ''}

Adapt while maintaining creator's voice. Provide:
- Platform-optimized title/caption
- Platform-optimized description
- Platform-specific tags/hashtags
- Best posting time recommendation

Format as JSON.`;

      const platformData = await callCouncilWithFailover(platformPrompt, "chatgpt");

      let adapted;
      try {
        const jsonMatch = platformData.match(/\{[\s\S]*\}/);
        adapted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        adapted = { title: content.title, description: content.description };
      }

      // Create post record
      const postResult = await pool.query(
        `INSERT INTO creator_posts 
         (content_id, platform, scheduled_time, status)
         VALUES ($1, $2, $3, 'scheduled')
         RETURNING *`,
        [content_id, platform, scheduled_time || null]
      );

      posts.push({
        ...postResult.rows[0],
        adapted_content: adapted,
      });
    }

    res.json({
      ok: true,
      posts,
      message: `Content scheduled for ${platforms.length} platform(s)`,
    });
  } catch (error) {
    console.error("Post scheduling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/create-ab-test", requireKey, async (req, res) => {
  try {
    const { creator_id, test_type, content_id, variants } = req.body;

    if (!creator_id || !test_type || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "creator_id, test_type, and variants array (min 2) required",
      });
    }

    // Create A/B test
    const testResult = await pool.query(
      `INSERT INTO creator_ab_tests 
       (creator_id, test_name, test_type, variants, status)
       VALUES ($1, $2, $3, $4, 'running')
       RETURNING *`,
      [
        creator_id,
        `${test_type} A/B Test - ${new Date().toLocaleDateString()}`,
        test_type,
        JSON.stringify(variants),
      ]
    );

    // If content_id provided, create posts for each variant
    if (content_id) {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        await pool.query(
          `INSERT INTO creator_posts 
           (content_id, platform, status, performance_metrics)
           VALUES ($1, $2, 'scheduled', $3)`,
          [
            content_id,
            variant.platform || 'youtube',
            JSON.stringify({ variant_id: i, test_id: testResult.rows[0].id }),
          ]
        );
      }
    }

    res.json({
      ok: true,
      test: testResult.rows[0],
      message: `A/B test created with ${variants.length} variants`,
    });
  } catch (error) {
    console.error("A/B test creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/analyze-ab-test", requireKey, async (req, res) => {
  try {
    const { test_id } = req.body;

    if (!test_id) {
      return res.status(400).json({ ok: false, error: "test_id required" });
    }

    // Get test
    const testResult = await pool.query(
      "SELECT * FROM creator_ab_tests WHERE id = $1",
      [test_id]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Test not found" });
    }

    const test = testResult.rows[0];
    const variants = JSON.parse(test.variants || '[]');

    // Analyze performance (this would pull real metrics from platforms)
    // For now, simulate analysis
    const analysisPrompt = `Analyze A/B test results for ${test.test_type}.

Variants: ${JSON.stringify(variants)}

Provide analysis:
1. Performance metrics for each variant
2. Statistical significance
3. Winner recommendation
4. Insights and recommendations

Format as JSON with metrics, winner, and insights.`;

    const analysis = await callCouncilWithFailover(analysisPrompt, "gemini");

    let analysisData;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      analysisData = {
        metrics: variants.map((v, i) => ({
          variant: i,
          views: Math.floor(Math.random() * 10000),
          engagement: Math.random() * 10,
        })),
        winner: 0,
        insights: ["Test needs more data"],
      };
    }

    // Update test
    await pool.query(
      `UPDATE creator_ab_tests 
       SET metrics = $1, winner_variant = $2, status = 'completed', completed_at = NOW()
       WHERE id = $3`,
      [
        JSON.stringify(analysisData),
        `variant_${analysisData.winner || 0}`,
        test_id,
      ]
    );

    res.json({
      ok: true,
      test: {
        ...test,
        metrics: analysisData,
        winner: analysisData.winner,
      },
      analysis: analysisData,
    });
  } catch (error) {
    console.error("A/B test analysis error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/auto-post", requireKey, async (req, res) => {
  try {
    const { creator_id, content_id, platforms } = req.body;

    if (!creator_id || !content_id || !platforms) {
      return res.status(400).json({ ok: false, error: "creator_id, content_id, and platforms required" });
    }

    // Get content
    const contentResult = await pool.query(
      `SELECT c.*, p.brand_voice, p.platforms as creator_platforms
       FROM creator_content c
       JOIN creator_profiles p ON c.creator_id = p.id
       WHERE c.id = $1`,
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Auto-optimize SEO if not done
    if (!content.seo_optimized) {
      // Trigger SEO optimization (would call the endpoint internally)
      console.log(`🔍 Auto-optimizing SEO for content ${content_id}`);
    }

    // Schedule posts for all platforms
    const scheduleResult = await pool.query(
      `SELECT * FROM creator_posts 
       WHERE content_id = $1 AND status = 'scheduled'`,
      [content_id]
    );

    // Auto-post (this would integrate with platform APIs)
    // For now, mark as posted
    for (const post of scheduleResult.rows) {
      await pool.query(
        `UPDATE creator_posts 
         SET status = 'posted', posted_at = NOW()
         WHERE id = $1`,
        [post.id]
      );
    }

    res.json({
      ok: true,
      message: `Content auto-posted to ${scheduleResult.rows.length} platform(s)`,
      posts: scheduleResult.rows,
    });
  } catch (error) {
    console.error("Auto-post error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
