const request = require('supertest');
const app = require('../src/app'); // Assuming app is the Express instance

describe('Configuration Endpoints', () => {
    it('should validate environment variables via GET /api/v1/config/validate', async () => {
        const response = await request(app).get('/api/v1/config/validate');
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Environment validation successful.');
    });

    it('should refresh configuration via POST /api/v1/config/refresh', async () => {
        const response = await request(app).post('/api/v1/config/refresh');
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Configuration refreshed successfully.');
    });
});