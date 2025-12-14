```javascript
const { expect } = require('chai');
const Customization = require('../../src/models/Customization');

describe('Customization Model', () => {
    it('should require a name', async () => {
        try {
            await Customization.create({ value: {}, scenario_id: 1 });
        } catch (error) {
            expect(error.message).to.include('name cannot be null');
        }
    });

    it('should require a scenario_id', async () => {
        try {
            await Customization.create({ name: 'Test', value: {} });
        } catch (error) {
            expect(error.message).to.include('scenario_id cannot be null');
        }
    });
});
```