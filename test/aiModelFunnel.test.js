```javascript
const request = require('supertest');
const app = require('../src/app'); // Assuming app is your Express app

describe('AI Model Funnel API', () => {
  it('should create a new association', async () => {
    const response = await request(app)
      .post('/api/aimodelfunnel')
      .send({
        ai_model_id: 1,
        funnel_id: 1,
        performance_metrics: { accuracy: 0.9 }
      });
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should fetch all associations', async () => {
    const response = await request(app).get('/api/aimodelfunnel');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should update an association', async () => {
    const response = await request(app)
      .put('/api/aimodelfunnel/1')
      .send({ performance_metrics: { accuracy: 0.95 } });
    expect(response.statusCode).toBe(200);
  });

  it('should delete an association', async () => {
    const response = await request(app).delete('/api/aimodelfunnel/1');
    expect(response.statusCode).toBe(204);
  });
});
```