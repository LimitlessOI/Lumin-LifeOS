```js
const Web3 = require('web3');
const ipfsClient = require('ipfs-http-client');

const web3 = new Web3(new Web3.providers.HttpProvider('https://your-blockchain-node-url'));
const ipfs = ipfsClient.create('https://ipfs.infura.io:5001');

class VerificationService {
  async mintNFT(skillData, userAddress) {
    const file = await ipfs.add(JSON.stringify(skillData));
    const ipfsHash = file.path;

    // Smart contract interaction to mint NFT
    // Assume contract is already deployed and ABI is known
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    return contract.methods.mint(userAddress, ipfsHash).send({ from: userAddress });
  }
}

module.exports = new VerificationService();
```