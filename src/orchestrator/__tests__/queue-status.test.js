// src/orchestrator/__tests__/queue-status.test.js

const { getQueueStatus } = require('../queue-status');

describe('getQueueStatus', () => {
  it('should return the correct structure', () => {
    const result = getQueueStatus();
    expect(result).toHaveProperty('queued');
    expect(result).toHaveProperty('claimed');
    expect(result).toHaveProperty('done');
  });

  it('should return arrays for queued, claimed, and done', () => {
    const result = getQueueStatus();
    expect(Array.isArray(result.queued)).toBe(true);
    expect(Array.isArray(result.claimed)).toBe(true);
    expect(Array.isArray(result.done)).toBe(true);
  });
});