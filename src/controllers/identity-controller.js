```javascript
const express = require('express');
const { createIdentity, verifyIdentity } = require('../services/blockchain-identity-service');

const router = express.Router();

router.post('/identity', async (req, res) => {
    try {
        const { name, documentHash } = req.body;
        await createIdentity(name, documentHash);
        res.status(201).send({ message: 'Identity created successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to create identity' });
    }
});

router.post('/identity/verify', async (req, res) => {
    try {
        const { userAddress } = req.body;
        await verifyIdentity(userAddress);
        res.status(200).send({ message: 'Identity verified successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to verify identity' });
    }
});

module.exports = router;
```