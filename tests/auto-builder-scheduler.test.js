import { test } from 'node:test';
import assert from 'node:assert';

test('auto-builder scheduler blocks Stripe but builds landing + chat', async () => {
  process.env.DATABASE_URL ||= 'postgres://user:pass@localhost:5432/lifeos_test';
  process.env.DB_SSL_REJECT_UNAUTHORIZED ||= 'false';
  process.env.COMMAND_CENTER_KEY ||= 'test';
  const module = await import('../core/auto-builder.js');
  const autoBuilder = module.default;

  autoBuilder.overrideBuildHelpers({
    routeTask: async () => ({ ok: true }),
    validateResponse: async () => ({ passed: true, errors: [] }),
    extractCode: () => 'console.log("ok");\n'.repeat(20)
  });

  const originalStripeKey = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;

  autoBuilder.PRODUCT_QUEUE.forEach((product) => {
    product.components.forEach((component) => {
      component.status = 'pending';
      component.lastError = null;
    });
  });

  // Run first cycle - should complete Landing Page
  const result1 = await autoBuilder.runCycleWithArtifacts('test');
  assert.ok(result1.success || result1.productComplete, 'cycle 1 should run');

  // Run second cycle - should complete Chat Completions API
  const result2 = await autoBuilder.runCycleWithArtifacts('test');
  assert.ok(result2.success || result2.productComplete, 'cycle 2 should run');

  const status = autoBuilder.getStatus();
  const landing = status.components.find((c) => c.name === 'Landing Page');
  const chat = status.components.find((c) => c.name === 'Chat Completions API');
  const checkout = status.components.find((c) => c.name === 'Stripe Checkout');

  assert.strictEqual(landing?.status, 'complete', 'Landing page must complete');
  assert.strictEqual(chat?.status, 'complete', 'Chat must complete');
  assert.strictEqual(checkout?.status, 'blocked', 'Checkout must be blocked when Stripe key missing');
  assert.ok(status.blockedComponents.some((c) => c.name === 'Stripe Checkout'), 'blockedComponents should list Stripe');
  assert.strictEqual(status.status, 'idle_pending');

  if (originalStripeKey) {
    process.env.STRIPE_SECRET_KEY = originalStripeKey;
  } else {
    delete process.env.STRIPE_SECRET_KEY;
  }

  autoBuilder.resetBuildHelpers();

  autoBuilder.PRODUCT_QUEUE.forEach((product) => {
    product.components.forEach((component) => {
      component.status = 'pending';
      component.lastError = null;
    });
  });
});
