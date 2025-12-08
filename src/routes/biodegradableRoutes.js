```javascript
const express = require('express');
const { simulateMaterialProperties } = require('../materialEngine');
const { calculateImpact } = require('../impactCalculator');
const router = express.Router();

router.post('/material/simulate', async (req, res) => {
    try {
        const { materialId } = req.body;
        const result = await simulateMaterialProperties(materialId);
        res.json(result);
    } catch (error) {
        res.status(500).send('Error simulating material properties');
    }
});

router.post('/impact/calculate', async (req, res) => {
    try {
        const { materialId, usageData } = req.body;
        const result = await calculateImpact(materialId, usageData);
        res.json(result);
    } catch (error) {
        res.status(500).send('Error calculating impact');
    }
});

module.exports = router;
```