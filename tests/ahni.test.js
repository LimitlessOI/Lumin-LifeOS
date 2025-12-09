const request = require('supertest');
const app = require('../app');

describe('AHNI Service', () => {
  it('should return AHNI service status', async () => {
    const response = await request(app).get('/api/ahni/status');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('AHNI service is running');
  });

  it('should train neural processor', async () => {
    const response = await request(app)
      .post('/api/ahni/train')
      .send({ data: [{ input: [0], output: [1] }] });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Training complete');
  });

  it('should process data', async () => {
    const response = await request(app)
      .post('/api/ahni/process')
      .send({ input: [0.5] });
    expect(response.status).toBe(200);
    expect(response.body.result).toBeDefined();
  });
});