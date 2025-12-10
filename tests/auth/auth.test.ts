```typescript
import request from 'supertest';
import app from '../../src/app'; // Assume Express app is exported from this module

describe('Auth API', () => {
  it('should register a user via API', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('email', 'test@example.com');
  });

  it('should login a user via API', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```