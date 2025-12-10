/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SCALABILITY ARCHITECTURE                                         ║
 * ║                    Duplicate system across multiple accounts                      ║
 * ║                    Scale to build thousands of businesses simultaneously          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class ScalabilityArchitecture {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.instances = new Map();
  }

  /**
   * Check if we need to scale up
   */
  async checkScalingNeeds() {
    const triage = await import('./triage-priority-system.js');
    const triageSystem = new triage.TriagePrioritySystem(this.pool, this.callCouncilMember);
    
    const scalingCheck = await triageSystem.checkScalingNeeds();
    
    if (scalingCheck.needsScaling) {
      return {
        needsScaling: true,
        reason: scalingCheck,
        recommendation: await this.getScalingRecommendation(scalingCheck)
      };
    }

    return { needsScaling: false };
  }

  /**
   * Get scaling recommendation
   */
  async getScalingRecommendation(scalingCheck) {
    const prompt = `We need to SCALE UP our system. Here's the situation:

High Priority Tasks Pending: ${scalingCheck.highPriorityPending}
Average Wait Time: ${scalingCheck.avgWaitTimeHours.toFixed(2)} hours

We can:
1. Duplicate entire system on another Railway account
2. Add more workers to current system
3. Create specialized instances for different task types
4. Use distributed processing

Recommend:
- Best scaling approach
- How many instances needed
- Cost estimate
- Implementation steps
- Timeline

Consider: We want to build thousands of businesses simultaneously.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 1500,
        temperature: 0.5
      });

      return {
        approach: response,
        estimatedInstances: this.calculateInstancesNeeded(scalingCheck),
        estimatedCost: this.estimateCost(scalingCheck)
      };
    } catch (error) {
      return {
        approach: 'duplicate_system',
        estimatedInstances: 2,
        error: error.message
      };
    }
  }

  /**
   * Duplicate system to new Railway account
   */
  async duplicateSystem(options = {}) {
    const {
      accountName,
      region = 'us-west2',
      instanceType = 'standard'
    } = options;

    const prompt = `Create a plan to DUPLICATE our entire LifeOS system to a new Railway account.

New Account: ${accountName || 'lifeos-instance-2'}
Region: ${region}
Instance Type: ${instanceType}

Steps needed:
1. Create new Railway project
2. Clone GitHub repository
3. Set up environment variables
4. Configure database (Neon)
5. Deploy
6. Verify health
7. Connect to main system (if needed)

Provide:
- Step-by-step instructions
- Required credentials/keys
- Configuration needed
- Verification steps
- Cost estimate

Format as actionable plan.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 2000,
        temperature: 0.4
      });

      // Store duplication plan
      await this.pool.query(
        `INSERT INTO system_instances
         (instance_name, region, instance_type, status, duplication_plan, created_at)
         VALUES ($1, $2, $3, 'planned', $4, NOW())`,
        [accountName, region, instanceType, response]
      );

      return {
        ok: true,
        instanceName: accountName,
        plan: response,
        nextSteps: this.extractNextSteps(response)
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get all system instances
   */
  async getInstances() {
    const result = await this.pool.query(
      `SELECT * FROM system_instances
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Distribute tasks across instances
   */
  async distributeTasks(instances) {
    // Get high-priority tasks
    const triage = await import('./triage-priority-system.js');
    const triageSystem = new triage.TriagePrioritySystem(this.pool, this.callCouncilMember);
    const tasks = await triageSystem.getPrioritizedQueue(100);

    // Distribute evenly across instances
    const distribution = [];
    const tasksPerInstance = Math.ceil(tasks.length / instances.length);

    for (let i = 0; i < instances.length; i++) {
      const instanceTasks = tasks.slice(
        i * tasksPerInstance,
        (i + 1) * tasksPerInstance
      );

      distribution.push({
        instance: instances[i],
        tasks: instanceTasks,
        count: instanceTasks.length
      });
    }

    return distribution;
  }

  /**
   * Calculate instances needed
   */
  calculateInstancesNeeded(scalingCheck) {
    const baseInstances = 1;
    const additionalNeeded = Math.ceil(scalingCheck.highPriorityPending / 10);
    return baseInstances + additionalNeeded;
  }

  /**
   * Estimate cost
   */
  estimateCost(scalingCheck) {
    const instances = this.calculateInstancesNeeded(scalingCheck);
    const costPerInstance = 5; // $5/month per Railway instance (Hobby plan)
    return {
      monthly: instances * costPerInstance,
      instances,
      perInstance: costPerInstance
    };
  }

  /**
   * Extract next steps from plan
   */
  extractNextSteps(plan) {
    const steps = [];
    const lines = plan.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\.|^Step|^-\s+/)) {
        steps.push(line.replace(/^\d+\.|^Step\s+\d+:|^-\s+/, '').trim());
      }
    }

    return steps;
  }
}
