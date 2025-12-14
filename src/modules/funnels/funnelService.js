const funnelRepository = require('./funnelRepository');

class FunnelService {
    async createFunnel(name) {
        // Business logic for creating a funnel
        return await funnelRepository.createFunnel(name);
    }

    async updateFunnel(id, name) {
        // Business logic for updating a funnel
        return await funnelRepository.updateFunnel(id, name);
    }

    async getFunnel(id) {
        // Business logic for retrieving a funnel
        return await funnelRepository.getFunnel(id);
    }

    async addFunnelStep(funnelId, stepName, position) {
        // Business logic for adding a step to a funnel
        return await funnelRepository.createFunnelStep(funnelId, stepName, position);
    }

    async logInteraction(funnelStepId, userId, interactionType) {
        // Business logic for logging a funnel interaction
        return await funnelRepository.logFunnelInteraction(funnelStepId, userId, interactionType);
    }
}

module.exports = new FunnelService();
//