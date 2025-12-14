const funnelService = require('./funnelService');

class FunnelController {
    async createFunnel(req, res) {
        try {
            const { name } = req.body;
            const funnel = await funnelService.createFunnel(name);
            res.status(201).json(funnel);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateFunnel(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const funnel = await funnelService.updateFunnel(id, name);
            res.status(200).json(funnel);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getFunnel(req, res) {
        try {
            const { id } = req.params;
            const funnel = await funnelService.getFunnel(id);
            res.status(200).json(funnel);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addFunnelStep(req, res) {
        try {
            const { funnelId, stepName, position } = req.body;
            const step = await funnelService.addFunnelStep(funnelId, stepName, position);
            res.status(201).json(step);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async logInteraction(req, res) {
        try {
            const { funnelStepId, userId, interactionType } = req.body;
            const interaction = await funnelService.logInteraction(funnelStepId, userId, interactionType);
            res.status(201).json(interaction);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FunnelController();
//