/**
 * SYNOPSIS: Simulate real-estate scenarios for training via council-member AI calls.
 * WIRED: service-only; intended for factory-based route wiring in the Business Tools Product Home blueprint
 * @ssot docs/products/BUSINESS_TOOLS_PRODUCT_HOME/BUSINESS_TOOLS_PRODUCT_HOME.md
 */

export function createVirtualRealEstateClass({ callCouncilMember }) {
  async function simulateScenario(input = {}) {
    const scenario = String(input.scenario || input.prompt || input.description || '').trim();
    if (!scenario) {
      const err = new Error('scenario_required');
      err.status = 400;
      throw err;
    }

    const context = {
      scenario,
      trainingLevel: input.trainingLevel || input.level || null,
      audience: input.audience || null,
      market: input.market || null,
      constraints: input.constraints || null,
      objective: input.objective || null,
      metadata: input.metadata || {},
    };

    const result = await callCouncilMember(
      'claude',
      {
        taskType: 'general',
        task: 'Simulate real estate scenarios for training',
        context,
      },
      { taskType: 'general' },
    );

    return {
      scenario,
      context,
      result,
    };
  }

  return {
    simulateScenario,
  };
}