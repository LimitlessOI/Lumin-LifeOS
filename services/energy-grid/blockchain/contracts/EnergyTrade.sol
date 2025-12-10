```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyTrade {
    struct Trade {
        address producer;
        address consumer;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
    }

    Trade[] public trades;

    function createTrade(address _consumer, uint256 _amount, uint256 _price) public {
        trades.push(Trade({
            producer: msg.sender,
            consumer: _consumer,
            amount: _amount,
            price: _price,
            timestamp: block.timestamp
        }));
    }

    function getTrades() public view returns (Trade[] memory) {
        return trades;
    }
}