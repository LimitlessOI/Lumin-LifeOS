const request = require('supertest');
const app = require('../app');

describe('POST /api/v1/outreach/collect-leads', () => {
  it('should collect leads', async () => {
    const response = await request(app)
      .post('/api/v1/outreach/collect-leads')
      .send({ city: 'Las Vegas', category: 'Restaurant', limit: 10 });
    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBeDefined();
  });
});