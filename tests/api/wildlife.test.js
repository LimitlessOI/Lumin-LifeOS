const request = require('supertest');
const express = require('express');
const wildlifeRouter = require('../../api/routes/wildlife');

const app = express();
app.use(express.json());
app.use('/api/wildlife', wildlifeRouter);

describe('Wildlife API', () => {
    it('should fetch all observations', async () => {
        const response = await request(app).get('/api/wildlife/observations');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('should add a new observation', async () => {
        const newObservation = {
            timestamp: new Date().toISOString(),
            location: 'POINT(30.7333 76.7794)',
            species: 'Elephant',
            observed_by: 'Drone1',
            observation_data: { note: 'Large herd observed' }
        };
        const response = await request(app).post('/api/wildlife/observation').send(newObservation);
        expect(response.statusCode).toBe(201);
    });
});