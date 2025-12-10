const request = require('supertest');
const app = require('../app');

describe('Code Review API', () => {
    it('should submit a code review', async () => {
        const response = await request(app)
            .post('/api/v1/code-review/submit')
            .send({ code: 'console.log("Hello, world!");', reviewerId: 1 })
            .set('Authorization', 'Bearer secrettoken');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });

    it('should retrieve a code review', async () => {
        const reviewId = 1; // Assume this exists in the test DB
        const response = await request(app)
            .get(`/api/v1/code-review/${reviewId}`)
            .set('Authorization', 'Bearer secrettoken');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.review).toHaveProperty('id', reviewId);
    });
});