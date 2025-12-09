```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyTrade {
    struct Transaction {
        address buyer;
        address seller;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
    }

    Transaction[] public transactions;

    event TradeExecuted(address indexed buyer, address indexed seller, uint256 amount, uint256 price);

    function executeTrade(address _seller, uint256 _amount, uint256 _price) public {
        transactions.push(Transaction(msg.sender, _seller, _amount, _price, block.timestamp));
        emit TradeExecuted(msg.sender, _seller, _amount, _price);
    }

    function getTransaction(uint _index) public view returns (address, address, uint256, uint256, uint256) {
        Transaction memory txn = transactions[_index];
        return (txn.buyer, txn.seller, txn.amount, txn.price, txn.timestamp);
    }

    function transactionCount() public view returns (uint) {
        return transactions.length;
    }
}
```