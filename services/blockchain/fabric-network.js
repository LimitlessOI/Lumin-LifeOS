const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(__dirname, '..', '..', 'config', 'blockchain-config.yaml');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

async function connectToNetwork(user) {
  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = new FileSystemWallet(walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: true, asLocalhost: true } });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('supplychain');

  return { contract, network, gateway };
}

module.exports = { connectToNetwork };