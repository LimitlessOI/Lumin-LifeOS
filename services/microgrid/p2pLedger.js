```javascript
class Ledger {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
    }

    createTransaction(transaction) {
        this.pendingTransactions.push(transaction);
    }

    mineBlock() {
        const block = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            previousHash: this.getLatestBlock()?.hash || '0'
        };
        block.hash = this.calculateHash(block);
        this.chain.push(block);
        this.pendingTransactions = [];
        return block;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    calculateHash(block) {
        return JSON.stringify(block).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(16);
    }
}

const ledger = new Ledger();
module.exports = ledger;
```