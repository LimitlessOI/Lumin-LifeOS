```javascript
const request = require('supertest');
const express = require('express');
const userRoutes = require('../../src/routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User Routes', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/users/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
    });
});
```