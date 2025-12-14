```javascript
const request = require('supertest');
const app = require('../../src/app'); // Assuming app is the Express app

describe('Customization Routes', () => {
    it('should create a customization', async () => {
        const res = await request(app)
            .post('/api/customizations')
            .send({ name: 'Test', value: {}, scenario_id: 1 });
        expect(res.statusCode).to.equal(201);
    });

    it('should get all customizations', async () => {
        const res = await request(app).get('/api/customizations');
        expect(res.statusCode).to.equal(200);
    });
});
```