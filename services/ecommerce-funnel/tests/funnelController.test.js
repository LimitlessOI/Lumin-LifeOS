```javascript
const request = require('supertest');
const app = require('../src/server'); // Assuming server.js exports the app

describe('Funnel API', () => {
  it('should create a new funnel', async () => {
    const response = await request(app)
      .post('/api/funnels')
      .send({ name: 'Test Funnel', description: 'A test funnel' });
      
    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe('Test Funnel');
  });
});
```