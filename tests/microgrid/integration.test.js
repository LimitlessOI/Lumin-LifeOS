```javascript
const request = require('supertest');
const app = require('../../app');  // Express app
const { sequelize } = require('../../models/MicrogridDevice');

beforeAll(async () => {
    await sequelize.sync();
});

describe('Microgrid API Integration Tests', () => {
    it('should register a device', async () => {
        const response = await request(app)
            .post('/device/register')
            .send({ deviceId: 1, payload: { name: 'Device 1' } });
        expect(response.statusCode).toBe(200);
    });

    it('should update device status', async () => {
        const response = await request(app)
            .post('/device/status')
            .send({ deviceId: 1, status: 'active' });
        expect(response.statusCode).toBe(200);
    });

    it('should optimize energy usage', async () => {
        const response = await request(app)
            .post('/optimize')
            .send({ deviceData: [1, 2, 3, 4, 5] });
        expect(response.statusCode).toBe(200);
        expect(response.body.optimizedData).toBeDefined();
    });

    it('should create a ledger transaction', async () => {
        const response = await request(app)
            .post('/ledger/transaction')
            .send({ amount: 50, type: 'sell' });
        expect(response.statusCode).toBe(200);
    });

    it('should mine a block', async () => {
        const response = await request(app)
            .get('/ledger/mine');
        expect(response.statusCode).toBe(200);
        expect(response.body.block).toBeDefined();
    });

    it('should create a subscription', async () => {
        const response = await request(app)
            .post('/subscription')
            .send({ userId: 'cus_123', tier: 'premium' });
        expect(response.statusCode).toBe(200);
        expect(response.body.subscription).toBeDefined();
    });
});

afterAll(async () => {
    await sequelize.close();
});
```