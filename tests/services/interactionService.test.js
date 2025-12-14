```javascript
const { createInteraction, getInteractions } = require('../../src/services/interactionService');
const FunnelInteraction = require('../../src/models/FunnelInteraction');

jest.mock('../../src/models/FunnelInteraction', () => ({
    create: jest.fn(),
    findAll: jest.fn()
}));

describe('Interaction Service', () => {
    it('should create an interaction', async () => {
        const interactionData = { funnel_id: 1, interaction_type: 'click' };
        FunnelInteraction.create.mockResolvedValue(interactionData);

        const result = await createInteraction(interactionData);
        expect(result).toEqual(interactionData);
        expect(FunnelInteraction.create).toHaveBeenCalledWith(interactionData);
    });

    it('should get all interactions', async () => {
        const interactions = [{ interaction_type: 'click' }];
        FunnelInteraction.findAll.mockResolvedValue(interactions);

        const result = await getInteractions();
        expect(result).toEqual(interactions);
        expect(FunnelInteraction.findAll).toHaveBeenCalled();
    });
});
```