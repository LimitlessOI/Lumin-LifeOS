const request = require('supertest');
const app = require('../server');

describe('Auto Merge Tests', () => {
    it('should merge PR with quality >= 60%', async () => {
        const response = await request(app)
            .post('/api/v1/merge')
            .send({ quality: 65 }); // Simulate PR
        expect(response.status).toBe(200);
    });

    it('should not merge PR with quality < 60%', async () => {
        const response = await request(app)
            .post('/api/v1/merge')
            .send({ quality: 55 }); // Simulate PR
        expect(response.status).toBe(403);
    });
});
