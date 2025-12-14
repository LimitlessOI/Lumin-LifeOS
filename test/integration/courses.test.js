const request = require('supertest');
const express = require('express');
const courseController = require('../../src/controllers/courseController');

const app = express();
app.use(express.json());
app.use('/', courseController);

describe('Course API', () => {
  it('should create a course', async () => {
    const response = await request(app)
      .post('/courses')
      .send({ title: 'API Course', description: 'Course via API', price: 39.99, currency: 'USD' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('title', 'API Course');
  });

  it('should publish a course', async () => {
    const response = await request(app)
      .post('/courses/1/publish')
      .send({ title: 'Published Course', description: 'Now published!', price: 59.99, currency: 'USD' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('published', true);
  });
});