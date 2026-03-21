/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    IDEA TO IMPLEMENTATION PIPELINE                               ║
 * ║                    Complete flow: Idea → Concept → Design → Implementation      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import logger from '../services/logger.js';
import { quickSnapshot, quickRollback } from '../services/snapshot-service.js';
import { addProductToQueue } from './auto-builder.js';

export class IdeaToImplementationPipeline {
  constructor(pool, callCouncilMember, selfBuilder, taskTracker) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.selfBuilder = selfBuilder;
    this.taskTracker = taskTracker;
  }

  /**
   * Complete pipeline: Take an idea and implement it fully.
   *
   * Safety rules (North Star Art. III, IV):
   *   - autoDeploy defaults to FALSE — human must opt in
   *   - Snapshot is taken before any code change
   *   - Rollback triggered automatically on failure
   *   - Minimum viability checked before advancing to implementation
   */
  async implementIdea(idea, options = {}) {
    const {
      autoDeploy = false,       // SAFE DEFAULT: do not auto-deploy without explicit opt-in
      verifyCompletion = true,
    } = options;

    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ideaText = idea.concept || idea.idea_title || (typeof idea === 'string' ? idea : JSON.stringify(idea));

    logger.info('[PIPELINE] Starting implementation', { pipelineId, idea: ideaText.slice(0, 80), autoDeploy });

    // Take a snapshot before any changes (North Star §4.2)
    let snapshotId = null;
    try {
      snapshotId = await quickSnapshot(`pre-pipeline-${pipelineId}`, this.pool);
      if (snapshotId) logger.info('[PIPELINE] Snapshot created', { pipelineId, snapshotId });
    } catch (snapErr) {
      logger.warn('[PIPELINE] Could not create snapshot — proceeding without rollback', { error: snapErr.message });
    }

    try {
      // Step 1: Develop Concept
      const concept = await this.developConcept(idea);

      // Minimum viability gate — reject vague/broken concepts
      const viability = this.checkConceptViability(concept);
      if (!viability.ok) {
        throw new Error(`Concept failed viability check: ${viability.reason}`);
      }

      // Step 2: Design Solution
      const design = await this.designSolution(concept);

      // Step 3: Create Implementation Plan
      const plan = await this.createImplementationPlan(design);

      // Step 4: Implement via Self-Programming
      const implementation = await this.implementViaSelfProgramming(plan, {
        autoDeploy,
        pipelineId,
      });

      if (!implementation.success) {
        throw new Error(implementation.error || 'Implementation failed');
      }

      // Step 5: Verify Completion
      if (verifyCompletion && implementation.taskId && this.taskTracker) {
        await this.verifyImplementation(implementation.taskId, plan);
      }

      logger.info('[PIPELINE] Implementation complete', { pipelineId, autoDeploy });

      return {
        success: true,
        pipelineId,
        snapshotId,
        concept,
        design,
        plan,
        implementation,
      };
    } catch (error) {
      logger.error('[PIPELINE] Implementation failed — triggering rollback', { pipelineId, error: error.message });

      // Rollback to snapshot if one was taken
      if (snapshotId) {
        try {
          await quickRollback(snapshotId, this.pool);
          logger.info('[PIPELINE] Rolled back to snapshot', { pipelineId, snapshotId });
        } catch (rollbackErr) {
          logger.error('[PIPELINE] Rollback also failed', { pipelineId, snapshotId, error: rollbackErr.message });
        }
      }

      return {
        success: false,
        pipelineId,
        snapshotId,
        rolledBack: !!snapshotId,
        error: error.message,
      };
    }
  }

  /**
   * Minimum viability check — prevents vague/broken concepts from going to implementation.
   */
  checkConceptViability(concept) {
    if (!concept) return { ok: false, reason: 'No concept returned' };
    if (!concept.features || concept.features.length === 0) return { ok: false, reason: 'No features defined' };
    if (!concept.valueProposition || concept.valueProposition === 'Provides value') {
      return { ok: false, reason: 'Generic value proposition — needs specificity' };
    }
    if (!concept.successCriteria || concept.successCriteria.length === 0) {
      return { ok: false, reason: 'No success criteria defined' };
    }
    return { ok: true };
  }

  /**
   * Step 1: Develop concept from idea
   */
  async developConcept(idea) {
    logger.info(`[PIPELINE] Developing concept...`);
    
    const ideaText = typeof idea === 'string' 
      ? idea 
      : idea.concept || idea.idea_title || idea.idea_description || JSON.stringify(idea);

    const prompt = `Take this idea and develop it into a complete, actionable concept:

IDEA: ${ideaText}

Develop:
1. Core concept (clear, specific)
2. Key features/requirements
3. Target users/use cases
4. Value proposition
5. Technical approach (high-level)
6. Success criteria
7. Potential challenges
8. Implementation phases

Return as JSON: {
  "concept": "clear concept description",
  "features": ["feature1", "feature2"],
  "targetUsers": "description",
  "valueProposition": "what value it provides",
  "technicalApproach": "high-level approach",
  "successCriteria": ["criterion1", "criterion2"],
  "challenges": ["challenge1", "challenge2"],
  "phases": [{"phase": 1, "name": "Phase 1", "description": "..."}]
}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 2000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const concept = JSON.parse(jsonMatch[0]);
        logger.info(`[PIPELINE] Concept developed: ${concept.concept}`);
        return concept;
      }

      // Fallback: create basic concept
      return {
        concept: ideaText,
        features: [],
        targetUsers: 'Users',
        valueProposition: 'Provides value',
        technicalApproach: 'To be determined',
        successCriteria: ['Feature works', 'No errors'],
        challenges: [],
        phases: [{ phase: 1, name: 'Implementation', description: 'Implement the feature' }],
      };
    } catch (error) {
      logger.error(`[PIPELINE] Concept development failed:`, error.message);
      throw error;
    }
  }

  /**
   * Step 2: Design solution
   */
  async designSolution(concept) {
    logger.info(`[PIPELINE] Designing solution...`);
    
    const prompt = `Design a complete technical solution for this concept:

CONCEPT: ${concept.concept}
FEATURES: ${JSON.stringify(concept.features)}
TECHNICAL APPROACH: ${concept.technicalApproach}

Design:
1. Architecture (how it fits into existing system)
2. Database schema (if needed)
3. API endpoints (if needed)
4. File structure
5. Dependencies needed
6. Integration points
7. Testing strategy

Return as JSON: {
  "architecture": "description",
  "databaseChanges": [{"table": "name", "columns": [...]}],
  "endpoints": [{"method": "GET", "path": "/api/v1/...", "description": "..."}],
  "files": [{"path": "path/to/file.js", "purpose": "..."}],
  "dependencies": ["package1", "package2"],
  "integrationPoints": ["point1", "point2"],
  "testingStrategy": "how to test"
}`;

    try {
      const response = await this.callCouncilMember('deepseek', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const design = JSON.parse(jsonMatch[0]);
        logger.info(`[PIPELINE] Solution designed`);
        return design;
      }

      // Fallback
      return {
        architecture: 'Standard implementation',
        databaseChanges: [],
        endpoints: [],
        files: [],
        dependencies: [],
        integrationPoints: [],
        testingStrategy: 'Manual testing',
      };
    } catch (error) {
      logger.error(`[PIPELINE] Design failed:`, error.message);
      throw error;
    }
  }

  /**
   * Step 3: Create implementation plan
   */
  async createImplementationPlan(design) {
    logger.info(`[PIPELINE] Creating implementation plan...`);
    
    const prompt = `Create a detailed implementation plan:

DESIGN: ${JSON.stringify(design, null, 2)}

Create step-by-step plan:
1. Order of implementation
2. Dependencies between steps
3. Files to create/modify
4. Code changes needed
5. Testing steps
6. Deployment steps

Return as JSON: {
  "steps": [
    {"step": 1, "action": "Create file X", "details": "..."},
    {"step": 2, "action": "Modify file Y", "details": "..."}
  ],
  "estimatedTime": "X hours",
  "riskLevel": "low/medium/high"
}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 2000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        logger.info(`[PIPELINE] Plan created: ${plan.steps?.length || 0} steps`);
        return plan;
      }

      // Fallback
      return {
        steps: [{ step: 1, action: 'Implement feature', details: 'Implement the feature' }],
        estimatedTime: 'Unknown',
        riskLevel: 'medium',
      };
    } catch (error) {
      logger.error(`[PIPELINE] Planning failed:`, error.message);
      throw error;
    }
  }

  /**
   * Step 4: Inject into auto-builder queue.
   *
   * Converts the implementation plan into auto-builder product components
   * and injects them directly — no HTTP self-call required.
   */
  async implementViaSelfProgramming(plan, options = {}) {
    logger.info('[PIPELINE] Injecting plan into auto-builder queue...');

    const { pipelineId } = options;

    try {
      if (!plan.steps || plan.steps.length === 0) {
        throw new Error('Plan has no steps — cannot build');
      }

      // Convert plan steps into auto-builder component definitions.
      // Each step that specifies a file becomes a component.
      const fileSteps = plan.steps.filter(s => s.file || s.action?.toLowerCase().includes('create'));

      if (fileSteps.length === 0) {
        // No discrete files — create a single summary component
        fileSteps.push({
          step: 1,
          action: 'Implement feature',
          file: `core/generated/pipeline-${pipelineId}.js`,
          details: plan.steps.map(s => s.action).join('\n'),
        });
      }

      const components = fileSteps.map((step, idx) => ({
        id: `step_${step.step || idx + 1}`,
        name: step.action || `Step ${idx + 1}`,
        file: step.file || `core/generated/step_${idx + 1}.js`,
        type: (step.file || '').endsWith('.html') ? 'html' : 'js',
        status: 'pending',
        prompt: `Implement the following step as complete, working code:

Action: ${step.action}
Details: ${step.details || ''}

Full plan context:
${JSON.stringify(plan, null, 2)}

Output ONLY valid code. No explanation. No markdown fences.`,
      }));

      const productDef = {
        id: `pipeline_${pipelineId}`,
        name: `Pipeline: ${pipelineId}`,
        description: `Auto-generated from idea pipeline ${pipelineId}`,
        pipelineId,
        components,
      };

      const queued = addProductToQueue(productDef);
      if (!queued) {
        throw new Error(`Product ${productDef.id} already in queue`);
      }

      logger.info(`[PIPELINE] Injected ${components.length} components into auto-builder`, { pipelineId });

      return {
        success: true,
        taskId: productDef.id,
        filesModified: components.map(c => c.file),
      };
    } catch (error) {
      logger.error('[PIPELINE] Queue injection failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Step 5: Verify implementation.
   * Polls execution_tasks table until status changes — no hardcoded sleep.
   */
  async verifyImplementation(taskId, plan) {
    logger.info('[PIPELINE] Verifying implementation', { taskId });

    if (!this.taskTracker) {
      logger.warn('[PIPELINE] Task tracker not available for verification');
      return;
    }

    // Poll until task completes or 5-minute timeout
    const maxWaitMs = 5 * 60 * 1000;
    const pollIntervalMs = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.pool.query(
        `SELECT status FROM execution_tasks WHERE task_id = $1`,
        [taskId]
      ).catch(() => null);

      const status = result?.rows?.[0]?.status;
      if (status === 'completed' || status === 'failed') {
        logger.info('[PIPELINE] Task settled', { taskId, status });
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const verificationChecks = [
      { type: 'deployment_successful', name: 'Deployment Health' },
      { type: 'no_errors_in_logs', name: 'No Errors', timeframe: 300 },
      { type: 'ai_verification', name: 'AI Verification', prompt: `Verify that the implementation plan was completed successfully. Check if all steps from the plan were implemented.` },
    ];

    // Add endpoint checks if endpoints were planned
    if (plan.endpoints && plan.endpoints.length > 0) {
      for (const endpoint of plan.endpoints) {
        verificationChecks.push({
          type: 'endpoint_exists',
          name: `Endpoint: ${endpoint.path}`,
          endpoint: endpoint.path,
          expectedStatus: 200,
        });
      }
    }

    const verification = await this.taskTracker.verifyCompletion(taskId, verificationChecks);
    
    return verification;
  }

  // autoImplementQueuedIdeas() removed — ideas are submitted and approved by Adam only.
  // Use the idea queue API (POST /api/v1/ideas/:id/build) to trigger builds.
}
