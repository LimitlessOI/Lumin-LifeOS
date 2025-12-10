const request = require('supertest');
const app = require('../../app'); // Assuming app is your Express app

describe('Energy API', () => {
  it('should return prediction', async () => {
    const response = await request(app).get('/energy/predict');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('prediction');
  });
});