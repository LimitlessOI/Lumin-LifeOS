```javascript
const request = require('supertest');
const app = require('../api/routes/learning_routes');
const { expect } = require('chai');

describe('Learning API', () => {
    it('should fetch user profile', async () => {
        const response = await request(app).post('/get-profile').send({ userId: 1 });
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('user_id');
    });

    it('should update user profile', async () => {
        const response = await request(app).post('/update-profile').send({ userId: 1, preferences: {} });
        expect(response.status).to.equal(200);
    });
});
```