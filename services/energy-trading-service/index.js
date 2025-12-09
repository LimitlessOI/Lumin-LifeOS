```javascript
const express = require('express');
const Web3 = require('web3');
const contract = require('@truffle/contract');
const EnergyTradeArtifact = require('../blockchain-service/build/contracts/EnergyTrade.json');

const app = express();
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const EnergyTrade = contract(EnergyTradeArtifact);
EnergyTrade.setProvider(web3.currentProvider);

app.use(express.json());

app.post('/trade', async (req, res) => {
  try {
    const { buyer, amount } = req.body;
    const accounts = await web3.eth.getAccounts();
    const instance = await EnergyTrade.deployed();
    
    await instance.createTrade(buyer, amount, { from: accounts[0] });
    res.status(200).send('Trade created successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(3000, () => {
  console.log('Energy Trading Service running on port 3000');
});
```