```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyTrade {
    struct Trade {
        address seller;
        address buyer;
        uint amount;
        bool completed;
    }

    mapping(uint => Trade) public trades;
    uint public tradeCounter;

    event NewTrade(uint tradeId, address indexed seller, address indexed buyer, uint amount);
    event TradeCompleted(uint tradeId);

    function createTrade(address _buyer, uint _amount) public {
        tradeCounter++;
        trades[tradeCounter] = Trade(msg.sender, _buyer, _amount, false);
        emit NewTrade(tradeCounter, msg.sender, _buyer, _amount);
    }

    function completeTrade(uint _tradeId) public {
        Trade storage trade = trades[_tradeId];
        require(msg.sender == trade.buyer, "Only the buyer can complete the trade");
        require(!trade.completed, "Trade already completed");

        trade.completed = true;
        emit TradeCompleted(_tradeId);
    }
}
```