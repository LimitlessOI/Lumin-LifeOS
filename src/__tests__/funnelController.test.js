```javascript
const request = require('supertest');
const app = require('../server');

describe('Funnel API', () => {
  it('should return funnel data', async () => {
    const res = await request(app).get('/api/funnel');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('steps');
  });
});
```