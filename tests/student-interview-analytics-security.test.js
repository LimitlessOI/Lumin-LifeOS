/**
 * SYNOPSIS: Unauthenticated student-interview analytics must 401 before DB work.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerStudentInterviewAnalyticsRoutes } from '../routes/studentInterviewAnalyticsRoutes.js';

test('student interview analytics refuses to register without requireKey', () => {
  assert.throws(
    () => registerStudentInterviewAnalyticsRoutes(express(), { logger: { info() {}, error() {} } }),
    /requires deps.requireKey/,
  );
});

test('student interview analytics rejects unauthenticated reads', async () => {
  const app = express();
  registerStudentInterviewAnalyticsRoutes(app, {
    logger: { info() {}, error() {} },
    requireKey(req, res, next) {
      if (req.get('x-command-key') === 'test-command-key') return next();
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    },
  });

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/student-interview-analytics/any-id`);
    assert.equal(res.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
