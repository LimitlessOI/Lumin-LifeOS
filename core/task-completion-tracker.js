/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TASK COMPLETION TRACKER                                       ║
 * ║                    Tracks tasks from start to finish, verifies completion      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class TaskCompletionTracker {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.activeTasks = new Map();
  }

  /**
   * Start tracking a task
   */
  async startTask(taskId, taskType, description, expectedOutcome) {
    const task = {
      id: taskId,
      type: taskType,
      description,
      expectedOutcome,
      status: 'in_progress',
      steps: [],
      startTime: new Date().toISOString(),
      errors: [],
      verificationResults: [],
    };

    this.activeTasks.set(taskId, task);

    try {
      await this.pool.query(
        `INSERT INTO task_tracking (task_id, task_type, description, expected_outcome, status, steps, start_time, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (task_id) DO UPDATE SET status = $5, steps = $6`,
        [
          taskId,
          taskType,
          description,
          expectedOutcome,
          'in_progress',
          JSON.stringify([]),
          task.startTime,
        ]
      );
    } catch (error) {
      console.warn('⚠️ [TASK TRACKER] Could not save task:', error.message);
    }

    return task;
  }

  /**
   * Add a step to the task
   */
  async addStep(taskId, stepName, status, details = null) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      console.warn(`⚠️ [TASK TRACKER] Task ${taskId} not found`);
      return;
    }

    const step = {
      name: stepName,
      status,
      details,
      timestamp: new Date().toISOString(),
    };

    task.steps.push(step);

    try {
      await this.pool.query(
        `UPDATE task_tracking 
         SET steps = $1, updated_at = NOW()
         WHERE task_id = $2`,
        [JSON.stringify(task.steps), taskId]
      );
    } catch (error) {
      console.warn('⚠️ [TASK TRACKER] Could not update task:', error.message);
    }
  }

  /**
   * Verify task completion
   */
  async verifyCompletion(taskId, verificationChecks) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return { verified: false, error: 'Task not found' };
    }

    console.log(`🔍 [TASK TRACKER] Verifying completion for: ${taskId}`);

    const results = [];
    let allPassed = true;

    for (const check of verificationChecks) {
      try {
        const result = await this.runVerificationCheck(check, task);
        results.push({
          check: check.name,
          passed: result.passed,
          details: result.details,
          error: result.error,
        });

        if (!result.passed) {
          allPassed = false;
        }
      } catch (error) {
        results.push({
          check: check.name,
          passed: false,
          error: error.message,
        });
        allPassed = false;
      }
    }

    task.verificationResults = results;

    if (allPassed) {
      await this.completeTask(taskId, 'completed', 'All verification checks passed');
    } else {
      await this.completeTask(taskId, 'failed', 'Some verification checks failed', results);
    }

    return {
      verified: allPassed,
      results,
      task,
    };
  }

  /**
   * Run a verification check
   */
  async runVerificationCheck(check, task) {
    switch (check.type) {
      case 'endpoint_exists':
        return await this.checkEndpointExists(check.endpoint, check.expectedStatus);
      
      case 'syntax_valid':
        return await this.checkSyntaxValid(check.files);
      
      case 'no_errors_in_logs':
        return await this.checkNoErrorsInLogs(check.timeframe || 300);
      
      case 'feature_works':
        return await this.checkFeatureWorks(check.feature, check.test);
      
      case 'deployment_successful':
        return await this.checkDeploymentSuccessful();
      
      case 'ai_verification':
        return await this.checkAIVerification(check.prompt, task);
      
      default:
        return { passed: false, error: `Unknown check type: ${check.type}` };
    }
  }

  /**
   * Check if endpoint exists and returns expected status
   */
  async checkEndpointExists(endpoint, expectedStatus = 200) {
    try {
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'http://localhost:8080';
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: { 'x-command-key': process.env.COMMAND_CENTER_KEY || 'MySecretKey2025LifeOS' },
      });

      const passed = response.status === expectedStatus;
      return {
        passed,
        details: `Endpoint ${endpoint} returned status ${response.status}`,
        error: passed ? null : `Expected ${expectedStatus}, got ${response.status}`,
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if files have valid syntax
   */
  async checkSyntaxValid(files) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const errors = [];
    for (const file of files) {
      try {
        await execAsync(`node --check ${file}`);
      } catch (error) {
        errors.push(`${file}: ${error.message}`);
      }
    }

    return {
      passed: errors.length === 0,
      details: errors.length === 0 ? 'All files have valid syntax' : `${errors.length} file(s) have syntax errors`,
      error: errors.length > 0 ? errors.join('; ') : null,
    };
  }

  /**
   * Check for errors in recent logs
   */
  async checkNoErrorsInLogs(timeframeSeconds = 300) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as error_count
         FROM log_fixes
         WHERE created_at > NOW() - INTERVAL '${timeframeSeconds} seconds'
         AND success = false`
      );

      const errorCount = parseInt(result.rows[0]?.error_count || 0);
      return {
        passed: errorCount === 0,
        details: errorCount === 0 ? 'No errors in recent logs' : `${errorCount} error(s) found in logs`,
        error: errorCount > 0 ? `${errorCount} errors detected` : null,
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if a feature works (custom test)
   */
  async checkFeatureWorks(feature, testFunction) {
    try {
      // Execute test function if provided
      if (testFunction) {
        const testResult = await eval(`(${testFunction})()`);
        return {
          passed: testResult === true,
          details: testResult ? 'Feature test passed' : 'Feature test failed',
          error: testResult ? null : 'Feature test returned false',
        };
      }

      // Default: just check if feature endpoint exists
      return await this.checkEndpointExists(`/api/v1/${feature}`, 200);
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if deployment was successful
   */
  async checkDeploymentSuccessful() {
    try {
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'http://localhost:8080';
      
      // Check health endpoint
      const healthResponse = await fetch(`${baseUrl}/healthz`);
      const healthData = await healthResponse.json();

      const passed = healthResponse.ok && healthData.status === 'healthy';
      return {
        passed,
        details: passed ? 'Deployment is healthy' : 'Deployment health check failed',
        error: passed ? null : `Health check returned: ${healthData.status || 'unknown'}`,
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Use AI to verify task completion
   */
  async checkAIVerification(prompt, task) {
    try {
      const verificationPrompt = `Verify if this task was completed successfully:

Task: ${task.description}
Expected Outcome: ${task.expectedOutcome}
Steps Completed: ${JSON.stringify(task.steps)}

${prompt}

Return JSON: {"verified": true/false, "reason": "explanation"}`;

      const response = await this.callCouncilMember('chatgpt', verificationPrompt, {
        useTwoTier: false,
        maxTokens: 500,
      });

      // Parse AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          passed: result.verified === true,
          details: result.reason || 'AI verification completed',
          error: result.verified === false ? result.reason : null,
        };
      }

      return {
        passed: false,
        error: 'Could not parse AI verification response',
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId, status, reason, errors = null) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = status;
    task.endTime = new Date().toISOString();
    task.completionReason = reason;
    if (errors) {
      task.errors = errors;
    }

    try {
      await this.pool.query(
        `UPDATE task_tracking 
         SET status = $1, 
             completion_reason = $2,
             errors = $3,
             verification_results = $4,
             end_time = NOW(),
             updated_at = NOW()
         WHERE task_id = $5`,
        [
          status,
          reason,
          JSON.stringify(errors || []),
          JSON.stringify(task.verificationResults || []),
          taskId,
        ]
      );
    } catch (error) {
      console.warn('⚠️ [TASK TRACKER] Could not complete task:', error.message);
    }

    this.activeTasks.delete(taskId);
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM task_tracking WHERE task_id = $1`,
        [taskId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active tasks
   */
  async getActiveTasks() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM task_tracking WHERE status = 'in_progress' ORDER BY start_time DESC`
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }
}
