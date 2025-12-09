```javascript
const { Sensor } = require('../../models/agriculture');
const { sequelize } = require('../../models');

describe('Sensor Model', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    it('should create a sensor', async () => {
        const sensor = await Sensor.create({ type: 'Temperature', location: 'Field A' });
        expect(sensor.type).toBe('Temperature');
    });
});
```