/**
 * SYNOPSIS: Lock BuilderOS cheap-first OpenAI routing into testable truth.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getModelForTask, getCandidateModelsForTask } from '../config/task-model-routing.js';
import { applyBuilderRoutingPolicy } from '../services/builderos-routing-policy.js';
import { filterAvailableCouncilMembers } from '../services/council-model-availability.js';
import { computeBaselineRouting } from '../services/builderos-tsos-routing.js';
import { getBuilderRoutingPolicy } from '../services/builderos-routing-policy.js';
import { isCheaperModel } from '../services/builderos-model-escalation-gate.js';

test('builder code_execute defaults to OpenAI builder mini', () => {
  assert.equal(getModelForTask('council.builder.code_execute'), 'openai_builder_mini');
  assert.equal(getModelForTask('council.builder.code'), 'openai_builder_mini');
  assert.equal(getModelForTask('council.builder.task'), 'openai_builder_mini');
});

test('builder plan/review route to stronger OpenAI builder lane', () => {
  assert.equal(getModelForTask('council.builder.plan'), 'openai_builder_standard');
  assert.equal(getModelForTask('council.builder.review'), 'openai_builder_standard');
  assert.equal(getModelForTask('council.builder.code_review'), 'openai_builder_standard');
});

test('builder routing policy keeps cheap-first lane at head for execution', () => {
  const routingKey = 'council.builder.code_execute';
  const requestedModel = getModelForTask(routingKey);
  const candidateModels = getCandidateModelsForTask(routingKey);
  const policy = applyBuilderRoutingPolicy({
    candidateModels,
    requestedModel,
    routingKey,
    mode: 'code',
    executionOnly: true,
    targetFile: 'services/example.js',
  });

  assert.equal(policy.taskClass, 'autonomous_retry');
  assert.equal(policy.filteredCandidateModels[0], 'openai_builder_mini');
  assert.ok(policy.filteredCandidateModels.includes('openai_builder_standard'));
  assert.ok(policy.filteredCandidateModels.includes('openai_builder_escalation'));
});

test('OpenAI builder mini is treated as a cheaper model for escalation law', () => {
  assert.equal(isCheaperModel('openai_builder_mini'), true);
  assert.equal(isCheaperModel('openai_builder_standard'), false);
});

test('availability keeps OpenAI builder mini selectable when OpenAI key exists', () => {
  const availability = filterAvailableCouncilMembers(
    ['openai_builder_mini', 'gemini_flash'],
    { OPENAI_API_KEY: 'test-key' },
  );

  assert.ok(availability.available.includes('openai_builder_mini'));
});

test('TSOS baseline uses OpenAI builder mini as canonical baseline model', () => {
  const routingPolicy = {
    policy: getBuilderRoutingPolicy({
      routingKey: 'council.builder.code_execute',
      mode: 'code',
      executionOnly: true,
      targetFile: 'services/example.js',
    }),
  };

  const baseline = computeBaselineRouting({
    routingKey: 'council.builder.code_execute',
    taskClassBaseline: routingPolicy.policy.taskClass,
    baselineModel: 'openai_builder_mini',
    routingPolicy,
  });

  assert.equal(baseline.baseline_model, 'openai_builder_mini');
  assert.equal(baseline.selected_model, 'openai_builder_mini');
});
