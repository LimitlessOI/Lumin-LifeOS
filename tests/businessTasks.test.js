```javascript
const request = require('supertest');
const app = require('../app'); // Assuming you have an Express app setup

describe('Business Tasks API', () => {
    it('should create a task', async () => {
        const response = await request(app)
            .post('/tasks')
            .send({ title: 'Test Task', description: 'A test task', status: 'pending' })
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.title).toBe('Test Task');
    });

    // Additional tests...
});
```