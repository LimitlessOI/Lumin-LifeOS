```javascript
const express = require('express');
const tradingEngine = require('./trading-engine');

const router = express.Router();

router.post('/trade', async (req, res) => {
    try {
        await tradingEngine.matchTrades();
        res.status(200).send('Trades matched successfully');
    } catch (error) {
        res.status(500).send('Error matching trades');
    }
});

router.get('/dashboard', (req, res) => {
    res.status(200).send('Dashboard data');
});

module.exports = router;
```