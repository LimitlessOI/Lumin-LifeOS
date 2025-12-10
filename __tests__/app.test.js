const request = require('supertest');
const app = require('../src/index');

describe('API Endpoints', () => {
  it('should get templates', async () => {
    const res = await request(app).get('/api/v1/templates');
    expect(res.statusCode).toEqual(200);
  });

  it('should deploy application', async () => {
    const res = await request(app).post('/api/v1/deploy');
    expect(res.statusCode).toEqual(200);
  });
});