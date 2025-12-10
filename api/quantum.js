const express = require('express');
const QuantumSimulationEngine = require('../services/QuantumSimulationEngine');
const router = express.Router();

router.post('/simulate', async (req, res) => {
    try {
        const { strategyId } = req.body;
        const result = await QuantumSimulationEngine.simulate(strategyId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in /simulate:', error);
        res.status(500).json({ success: false, message: 'Simulation failed' });
    }
});

module.exports = router;