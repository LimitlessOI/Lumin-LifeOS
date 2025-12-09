```javascript
const Web3 = require('web3');
const express = require('express');
const app = express();
app.use(express.json());

const web3 = new Web3('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');

app.post('/issue-credential', async (req, res) => {
    const { userId, credentialData } = req.body;
    // Use web3 to issue a credential on blockchain
    res.json({ success: true, userId, credential: credentialData });
});

app.listen(6000, () => {
    console.log('Blockchain Credentialing Service running on port 6000');
});
```