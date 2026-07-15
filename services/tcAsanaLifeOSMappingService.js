/**
 * SYNOPSIS: services/tcAsanaLifeOSMappingService.js
 */
// services/tcAsanaLifeOSMappingService.js

export function mapWorkflows(asanaWorkflows) {
  return asanaWorkflows.map(workflow => {
    if (workflow.type === 'listing') {
      return mapListingWorkflow(workflow);
    } else if (workflow.type === 'buying') {
      return mapBuyingWorkflow(workflow);
    }
    return null;
  }).filter(mappedWorkflow => mappedWorkflow !== null);
}

function mapListingWorkflow(workflow) {
  return {
    templateType: 'LifeOSListing',
    templateId: workflow.id,
    templateName: workflow.name,
    steps: mapSteps(workflow.steps)
  };
}

function mapBuyingWorkflow(workflow) {
  return {
    templateType: 'LifeOSBuying',
    templateId: workflow.id,
    templateName: workflow.name,
    steps: mapSteps(workflow.steps)
  };
}

function mapSteps(steps) {
  return steps.map(step => ({
    stepId: step.id,
    stepName: step.name,
    stepDetails: step.details
  }));
}
