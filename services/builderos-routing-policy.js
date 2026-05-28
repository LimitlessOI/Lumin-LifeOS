// services/builderos-routing-policy.js

export function classifyBuilderRoutingTask({
  routingKey,
  mode,
  executionOnly,
  targetFile,
}) {
  return {
    taskClass: 'BuilderOSRoutingTask',
    policy: {
      routingKey,
      mode,
      executionOnly,
      targetFile,
    },
  };
}

export function getBuilderRoutingPolicy(input) {
  return {
    routingKey: input.routingKey,
    mode: input.mode,
    executionOnly: input.executionOnly,
    targetFile: input.targetFile,
  };
}

export function applyBuilderRoutingPolicy({
  candidateModels,
  requestedModel,
  routingKey,
  mode,
  executionOnly,
  targetFile,
}) {
  return {
    taskClass: 'BuilderOSRoutingTask',
    policy: {
      routingKey,
      mode,
      executionOnly,
      targetFile,
    },
  };
}