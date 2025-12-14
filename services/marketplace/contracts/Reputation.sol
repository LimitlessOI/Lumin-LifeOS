```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Reputation {
    mapping(address => uint) public reputationScores;

    function updateReputation(address _user, uint _score) public {
        reputationScores[_user] = _score;
    }

    function getReputation(address _user) public view returns (uint) {
        return reputationScores[_user];
    }
}
```