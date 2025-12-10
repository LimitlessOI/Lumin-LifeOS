const funnelService = require('./funnelService');

class FunnelTracker {
    async trackInteraction(funnelStepId, userId, interactionType) {
        try {
            const interaction = await funnelService.logInteraction(funnelStepId, userId, interactionType);
            console.log(`Logged interaction: ${interactionType} for user ${userId}`);
            return interaction;
        } catch (error) {
            console.error(`Error logging interaction: ${error.message}`);
        }
    }
}

module.exports = new FunnelTracker();
//