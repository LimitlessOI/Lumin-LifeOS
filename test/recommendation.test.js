```javascript
const request = require('supertest');
const app = require('../app'); // Assuming your Express app is exported from here
const { sequelize } = require('../models'); // Ensure DB connection is established

beforeAll(async () => {
    await sequelize.sync({ force: true }); // Recreate the database schema for tests
});

describe('Recommendation API', () => {
    test('should create a recommendation', async () => {
        const response = await request(app)
            .post('/recommendations')
            .send({ userId: 1, title: 'Test Recommendation', description: 'This is a test' });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
    });

    test('should fetch recommendations', async () => {
        const response = await request(app).get('/recommendations');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
```