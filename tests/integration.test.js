const request = require('supertest');
const app = require('../api/routes/learningRoutes');

describe('API Integration Tests', () => {
    it('should process learning analytics', async () => {
        const response = await request(app).post('/analytics').send({});
        expect(response.statusCode).toBe(200);
    });

    it('should adapt content', async () => {
        const response = await request(app).post('/adaptation').send({});
        expect(response.statusCode).toBe(200);
    });

    it('should track progress', async () => {
        const response = await request(app).post('/progress').send({});
        expect(response.statusCode).toBe(200);
    });
});