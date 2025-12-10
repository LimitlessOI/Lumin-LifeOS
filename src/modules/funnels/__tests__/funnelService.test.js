const funnelService = require('../funnelService');

describe('Funnel Service', () => {
    test('should create a new funnel', async () => {
        const funnel = await funnelService.createFunnel('Test Funnel');
        expect(funnel).toHaveProperty('id');
        expect(funnel.name).toBe('Test Funnel');
    });

    // Additional tests for other methods...
});
//