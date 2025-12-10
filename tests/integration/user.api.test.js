const request = require('supertest');
const app = require('../../src/app'); // Assume app is your Express app

describe('User API Integration Tests', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should retrieve a user by ID', async () => {
    const userResponse = await request(app)
      .post('/users')
      .send({ email: 'test2@example.com', password: 'password123' });

    const userId = userResponse.body.id;

    const response = await request(app).get(`/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', 'test2@example.com');
  });
});