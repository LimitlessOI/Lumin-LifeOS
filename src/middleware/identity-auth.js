```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto-js');

function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(403).send('API key missing');
    }

    // Example verification process, replace with actual logic
    const hashedKey = crypto.SHA256(apiKey).toString();
    // Fetch from database or config
    const validKeys = ['expectedHashedKeyHere'];

    if (!validKeys.includes(hashedKey)) {
        return res.status(403).send('Invalid API key');
    }

    next();
}

module.exports = authenticateApiKey;
```