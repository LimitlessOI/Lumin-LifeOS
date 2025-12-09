```javascript
const request = require('supertest');
const app = require('../index');

describe('POST /learning-dna', () => {
    it('responds with json', async () => {
        const res = await request(app)
            .post('/learning-dna')
            .send({ userId: 'user123', data: {} });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
    });
});
```