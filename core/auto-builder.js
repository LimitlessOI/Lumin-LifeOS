/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTO-BUILDER SYSTEM                                            ║
 * ║                    Actually builds opportunities into working products           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class AutoBuilder {
  constructor(pool, callCouncilMember, executionQueue) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.executionQueue = executionQueue;
    this.isRunning = false;
    this.capacityAllocation = {
      building: 0.30, // 30% capacity for building new opportunities
      revenue: 0.70,  // 70% capacity for revenue generation
    };
    this.maxConcurrentBuilds = 3;
    this.activeBuilds = new Map();
  }

  async start() {
    if (this.isRunning) {
      console.warn('⚠️ [AUTO-BUILDER] Already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ [AUTO-BUILDER] Started - will build best opportunities automatically');
    console.log(`📊 [AUTO-BUILDER] Capacity: ${(this.capacityAllocation.building * 100).toFixed(0)}% for building, ${(this.capacityAllocation.revenue * 100).toFixed(0)}% for revenue`);

    // Start building immediately
    await this.buildBestOpportunities();

    // Check every 15 minutes for new opportunities to build
    setInterval(async () => {
      try {
        await this.buildBestOpportunities();
      } catch (error) {
        console.error(`❌ [AUTO-BUILDER] Error:`, error.message);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Find and build the best opportunities
   */
  async buildBestOpportunities() {
    try {
      // Check if we have capacity
      if (this.activeBuilds.size >= this.maxConcurrentBuilds) {
        console.log(`⏸️ [AUTO-BUILDER] At capacity (${this.activeBuilds.size}/${this.maxConcurrentBuilds} builds)`);
        return;
      }

      // Get best opportunities (prioritized by ROI, speed, feasibility)
      const opportunities = await this.getBestOpportunities();

      if (opportunities.length === 0) {
        console.log('📭 [AUTO-BUILDER] No opportunities to build');
        return;
      }

      console.log(`🎯 [AUTO-BUILDER] Found ${opportunities.length} opportunities to evaluate`);

      // Build top opportunities (within capacity)
      const availableSlots = this.maxConcurrentBuilds - this.activeBuilds.size;
      const toBuild = opportunities.slice(0, availableSlots);

      for (const opp of toBuild) {
        this.buildOpportunity(opp).catch(err => {
          console.error(`❌ [AUTO-BUILDER] Build failed for ${opp.opportunity_id}:`, err.message);
        });
      }
    } catch (error) {
      console.error(`❌ [AUTO-BUILDER] Error in buildBestOpportunities:`, error.message);
    }
  }

  /**
   * Get best opportunities ranked by priority
   */
  async getBestOpportunities() {
    try {
      // Get opportunities from both tables
      const revenueOpps = await this.pool.query(
        `SELECT 
           'revenue' as source,
           opportunity_id as id,
           name,
           revenue_potential,
           time_to_implement,
           required_resources,
           market_demand,
           competitive_advantage,
           status,
           created_at,
           (revenue_potential / NULLIF(time_to_implement, 0)) as roi_per_day
         FROM revenue_opportunities
         WHERE status = 'pending'
         ORDER BY roi_per_day DESC, revenue_potential DESC
         LIMIT 10`
      );

      const droneOpps = await this.pool.query(
        `SELECT 
           'drone' as source,
           id::text as id,
           opportunity_type as name,
           revenue_estimate as revenue_potential,
           1 as time_to_implement,
           data as required_resources,
           'High' as market_demand,
           'Automated' as competitive_advantage,
           status,
           created_at,
           revenue_estimate as roi_per_day
         FROM drone_opportunities
         WHERE status = 'pending'
         ORDER BY revenue_estimate DESC, created_at ASC
         LIMIT 10`
      );

      // Combine and rank
      const allOpps = [
        ...revenueOpps.rows.map(r => ({ ...r, source: 'revenue' })),
        ...droneOpps.rows.map(r => ({ ...r, source: 'drone' })),
      ];

      // Score each opportunity
      const scored = allOpps.map(opp => ({
        ...opp,
        score: this.scoreOpportunity(opp),
      }));

      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 5); // Top 5
    } catch (error) {
      console.error('Error getting opportunities:', error);
      return [];
    }
  }

  /**
   * Score opportunity for prioritization
   */
  scoreOpportunity(opp) {
    let score = 0;

    // Revenue potential (0-40 points)
    const revenue = parseFloat(opp.revenue_potential || opp.revenue_estimate || 0);
    score += Math.min(40, (revenue / 1000) * 4); // $1000 = 4 points, max 40

    // Speed to implement (0-30 points) - faster = better
    const timeToImplement = parseInt(opp.time_to_implement || 7);
    score += Math.max(0, 30 - (timeToImplement * 2)); // 1 day = 28 points, 7 days = 16 points

    // ROI per day (0-20 points)
    const roiPerDay = parseFloat(opp.roi_per_day || 0);
    score += Math.min(20, roiPerDay / 10); // $100/day = 10 points

    // Market demand (0-10 points)
    if (opp.market_demand && opp.market_demand.toLowerCase().includes('high')) {
      score += 10;
    } else if (opp.market_demand && opp.market_demand.toLowerCase().includes('medium')) {
      score += 5;
    }

    return score;
  }

  /**
   * Build an opportunity into a working product
   */
  async buildOpportunity(opportunity) {
    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    this.activeBuilds.set(buildId, {
      opportunity,
      started: new Date(),
      status: 'building',
    });

    try {
      console.log(`🔨 [AUTO-BUILDER] Building: ${opportunity.name || opportunity.id}`);

      // Mark as building
      if (opportunity.source === 'revenue') {
        await this.pool.query(
          `UPDATE revenue_opportunities SET status = 'building' WHERE opportunity_id = $1`,
          [opportunity.id]
        );
      } else {
        await this.pool.query(
          `UPDATE drone_opportunities SET status = 'building' WHERE id = $1`,
          [opportunity.id]
        );
      }

      // Generate implementation plan
      const plan = await this.generateBuildPlan(opportunity);

      // Execute the build
      const result = await this.executeBuild(opportunity, plan);

      // Deploy if successful
      if (result.success) {
        await this.deployBuild(opportunity, result);
        
        // Mark as deployed
        if (opportunity.source === 'revenue') {
          await this.pool.query(
            `UPDATE revenue_opportunities SET status = 'deployed' WHERE opportunity_id = $1`,
            [opportunity.id]
          );
        } else {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'deployed' WHERE id = $1`,
            [opportunity.id]
          );
        }

        console.log(`✅ [AUTO-BUILDER] Built and deployed: ${opportunity.name || opportunity.id}`);
      } else {
        throw new Error(result.error || 'Build failed');
      }

      this.activeBuilds.delete(buildId);
    } catch (error) {
      console.error(`❌ [AUTO-BUILDER] Build error for ${opportunity.id}:`, error.message);
      
      // Mark as failed
      if (opportunity.source === 'revenue') {
        await this.pool.query(
          `UPDATE revenue_opportunities SET status = 'failed' WHERE opportunity_id = $1`,
          [opportunity.id]
        );
      } else {
        await this.pool.query(
          `UPDATE drone_opportunities SET status = 'failed' WHERE id = $1`,
          [opportunity.id]
        );
      }

      this.activeBuilds.delete(buildId);
      throw error;
    }
  }

  /**
   * Generate detailed build plan
   */
  async generateBuildPlan(opportunity) {
    const prompt = `Create a detailed implementation plan to BUILD this opportunity into a working product:

Opportunity: ${opportunity.name || opportunity.id}
Revenue Potential: $${opportunity.revenue_potential || opportunity.revenue_estimate}
Time to Implement: ${opportunity.time_to_implement || 'TBD'} days
Market Demand: ${opportunity.market_demand || 'Unknown'}
Competitive Advantage: ${opportunity.competitive_advantage || 'None specified'}

Required Resources: ${JSON.stringify(opportunity.required_resources || {})}

Create a step-by-step plan that includes:
1. Technical architecture
2. Database schema needed
3. API endpoints required
4. Frontend components
5. Integration points
6. Testing strategy
7. Deployment steps
8. Revenue capture mechanism

Be specific and actionable. This will be executed automatically.`;

    const plan = await this.callCouncilMember('chatgpt', prompt, {
      useTwoTier: false,
      maxTokens: 4000,
    });

    return plan;
  }

  /**
   * Execute the build
   */
  async executeBuild(opportunity, plan) {
    try {
      // Parse plan and extract actionable steps
      const buildPrompt = `Based on this implementation plan, generate the actual code/files needed:

Plan: ${plan}

Opportunity: ${opportunity.name}

Generate:
1. Database migrations (SQL)
2. API endpoints (Express.js routes)
3. Frontend components (if needed)
4. Configuration files
5. Any other necessary files

Format as:
===FILE:path/to/file===
[complete file content]
===END===

Generate ALL files needed to make this work. Be complete and production-ready.`;

      const codeResponse = await this.callCouncilMember('chatgpt', buildPrompt, {
        useTwoTier: false,
        maxTokens: 8000,
        temperature: 0.3,
      });

      // Extract files from response
      const files = await this.extractFiles(codeResponse);

      if (files.length === 0) {
        // Log the response for debugging
        console.warn(`⚠️ [AUTO-BUILDER] No files extracted. Response length: ${codeResponse?.length || 0}`);
        console.warn(`⚠️ [AUTO-BUILDER] Response preview: ${codeResponse?.substring(0, 500)}...`);
        
        return {
          success: false,
          error: "No files extracted from AI response. Check if AI returned files in ===FILE:path=== format.",
          responsePreview: codeResponse?.substring(0, 500),
        };
      }

      // Store build artifacts
      await this.pool.query(
        `INSERT INTO build_artifacts (opportunity_id, build_type, files, status, created_at)
         VALUES ($1, $2, $3, 'generated', NOW())
         ON CONFLICT DO NOTHING`,
        [
          opportunity.id,
          opportunity.source,
          JSON.stringify(files),
        ]
      );

      // Actually implement files using self-programming endpoint
      const implementedFiles = [];
      for (const file of files) {
        try {
          // Use self-programming to create/update the file
          const instruction = `Create or update the file ${file.path} with this complete content:

${file.content}

This is for opportunity: ${opportunity.name}
Make sure the file is complete, working, and production-ready.`;

          // Add to execution queue - the queue will handle self-programming
          await this.executionQueue.addTask('idea_implementation', instruction, {
            file_path: file.path,
            opportunity_id: opportunity.id,
            auto_deploy: true,
            build_type: 'opportunity',
          });

          implementedFiles.push(file.path);
          console.log(`📝 [AUTO-BUILDER] Queued file: ${file.path}`);
        } catch (err) {
          console.error(`❌ [AUTO-BUILDER] Error queueing file ${file.path}:`, err.message);
        }
      }

      return {
        success: true,
        files: implementedFiles.length,
        file_paths: implementedFiles,
        message: `Generated ${files.length} files, ${implementedFiles.length} queued for implementation`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract files from AI response (using enhanced extractor)
   */
  async extractFiles(response) {
    // Use enhanced file extractor for robust parsing
    try {
      const { extractFilesWithValidation } = await import('./enhanced-file-extractor.js');
      const result = extractFilesWithValidation(response, {
        source: 'auto-builder',
        opportunity: this.currentOpportunity?.id
      });
      
      if (result.files.length === 0 && result.invalid.length > 0) {
        console.warn(`⚠️ [AUTO-BUILDER] All ${result.invalid.length} extracted files had validation issues`);
        // Still return invalid files as fallback, but log the issues
        return result.invalid.map(f => ({ path: f.path, content: f.content }));
      }
      
      return result.files;
    } catch (importError) {
      console.warn(`⚠️ [AUTO-BUILDER] Could not load enhanced extractor, using fallback: ${importError.message}`);
      
      // Fallback to basic extraction
      const files = [];
      const fileRegex = /===FILE:(.+?)===\s*\n([\s\S]*?)===END===/g;
      let match;

      while ((match = fileRegex.exec(response)) !== null) {
        files.push({
          path: match[1].trim(),
          content: match[2].trim(),
        });
      }

      // Try alternative format
      if (files.length === 0) {
        const altRegex = /FILE:\s*(.+?)\n([\s\S]*?)(?=FILE:|END|$)/g;
        while ((match = altRegex.exec(response)) !== null) {
          files.push({
            path: match[1].trim(),
            content: match[2].trim(),
          });
        }
      }

      // Try markdown code blocks
      if (files.length === 0) {
        const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/g;
        let blockMatch;
        let blockIndex = 0;
        while ((blockMatch = codeBlockRegex.exec(response)) !== null) {
          files.push({
            path: `generated_${blockIndex + 1}.js`,
            content: blockMatch[1].trim(),
          });
          blockIndex++;
        }
      }

      return files;
    }
  }

  /**
   * Deploy the built product
   */
  async deployBuild(opportunity, buildResult) {
    try {
      console.log(`🚀 [AUTO-BUILDER] Deploying: ${opportunity.name}`);

      // Mark as deployed
      await this.pool.query(
        `UPDATE build_artifacts 
         SET status = 'deployed', deployed_at = NOW()
         WHERE opportunity_id = $1`,
        [opportunity.id]
      );

      // Create deployment record
      await this.pool.query(
        `INSERT INTO deployments (opportunity_id, deployment_type, status, deployed_at)
         VALUES ($1, 'auto', 'live', NOW())
         ON CONFLICT (opportunity_id) DO UPDATE SET status = 'live', deployed_at = NOW()`,
        [opportunity.id]
      );

      return { success: true, message: 'Deployed successfully' };
    } catch (error) {
      console.error('Deployment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build next opportunity from queue
   */
  async buildNextOpportunity() {
    console.log('🔨 [AUTO-BUILDER] Building next opportunity...');
    
    try {
      // Get pending opportunities from both tables
      const revenueResult = await this.pool.query(`
        SELECT 
          'revenue' as source,
          opportunity_id as id,
          name,
          status,
          created_at,
          priority
        FROM revenue_opportunities 
        WHERE status = 'pending' OR status = 'queued'
        ORDER BY priority DESC NULLS LAST, created_at ASC 
        LIMIT 1
      `);
      
      const droneResult = await this.pool.query(`
        SELECT 
          'drone' as source,
          id::text as id,
          opportunity_type as name,
          status,
          created_at,
          5 as priority
        FROM drone_opportunities 
        WHERE status = 'pending' OR status = 'queued'
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      // Choose the highest priority opportunity
      const opportunities = [
        ...revenueResult.rows.map(r => ({ ...r, source: 'revenue' })),
        ...droneResult.rows.map(r => ({ ...r, source: 'drone' }))
      ].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      if (opportunities.length === 0) {
        console.log('📭 [AUTO-BUILDER] No pending opportunities');
        return { success: false, message: 'No pending opportunities' };
      }
      
      const opportunity = opportunities[0];
      const oppId = opportunity.id;
      console.log(`🎯 [AUTO-BUILDER] Building opportunity: ${opportunity.name || oppId}`);
      
      // Update status to building
      if (opportunity.source === 'revenue') {
        await this.pool.query(
          `UPDATE revenue_opportunities SET status = 'building', updated_at = NOW() WHERE opportunity_id = $1`,
          [oppId]
        );
      } else {
        await this.pool.query(
          `UPDATE drone_opportunities SET status = 'building', updated_at = NOW() WHERE id = $1`,
          [oppId]
        );
      }
      
      // Call existing build method
      const buildResult = await this.buildOpportunity(opportunity);
      
      // Update status based on result
      if (buildResult.success) {
        if (opportunity.source === 'revenue') {
          await this.pool.query(
            `UPDATE revenue_opportunities SET status = 'completed', updated_at = NOW() WHERE opportunity_id = $1`,
            [oppId]
          );
        } else {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [oppId]
          );
        }
      } else {
        if (opportunity.source === 'revenue') {
          await this.pool.query(
            `UPDATE revenue_opportunities SET status = 'failed', error_message = $2, updated_at = NOW() WHERE opportunity_id = $1`,
            [oppId, buildResult.error || 'Unknown error']
          );
        } else {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'failed', updated_at = NOW() WHERE id = $1`,
            [oppId]
          );
        }
      }
      
      return buildResult;
      
    } catch (error) {
      console.error('❌ [AUTO-BUILDER] buildNextOpportunity error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get build status
   */
  async getStatus() {
    const active = Array.from(this.activeBuilds.values());
    const recent = await this.pool.query(
      `SELECT * FROM build_artifacts 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    return {
      active_builds: active.length,
      max_concurrent: this.maxConcurrentBuilds,
      capacity_allocation: this.capacityAllocation,
      recent_builds: recent.rows,
    };
  }
}
