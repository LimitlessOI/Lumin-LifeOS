```javascript
const express = require('express');
const router = express.Router();
const { registerDevice, updateDeviceStatus } = require('../services/microgrid/hardwareGateway');
const { optimizeEnergyUsage } = require('../services/microgrid/aiOptimizer');
const ledger = require('../services/microgrid/p2pLedger');
const { createSubscription } = require('../services/microgrid/resilienceService');

router.post('/device/register', (req, res) => {
    const { deviceId, payload } = req.body;
    registerDevice(deviceId, payload);
    res.status(200).send('Device registration initiated');
});

router.post('/device/status', (req, res) => {
    const { deviceId, status } = req.body;
    updateDeviceStatus(deviceId, status);
    res.status(200).send('Device status update initiated');
});

router.post('/optimize', async (req, res) => {
    const { deviceData } = req.body;
    try {
        const optimizedData = await optimizeEnergyUsage(deviceData);
        res.status(200).json({ optimizedData });
    } catch (error) {
        res.status(500).send('Error optimizing energy usage');
    }
});

router.post('/ledger/transaction', (req, res) => {
    const transaction = req.body;
    ledger.createTransaction(transaction);
    res.status(200).send('Transaction added');
});

router.get('/ledger/mine', (req, res) => {
    const block = ledger.mineBlock();
    res.status(200).json({ block });
});

router.post('/subscription', async (req, res) => {
    const { userId, tier } = req.body;
    try {
        const subscription = await createSubscription(userId, tier);
        res.status(200).json({ subscription });
    } catch (error) {
        res.status(500).send('Error creating subscription');
    }
});

module.exports = router;
```