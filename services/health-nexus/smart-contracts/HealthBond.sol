```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthBond {
    mapping(address => uint256) public balances;
    address public owner;

    event BondPurchased(address indexed purchaser, uint256 amount);
    event BondRedeemed(address indexed redeemer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function purchaseBond() external payable {
        require(msg.value > 0, "Insufficient purchase amount");
        balances[msg.sender] += msg.value;
        emit BondPurchased(msg.sender, msg.value);
    }

    function redeemBond(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit BondRedeemed(msg.sender, amount);
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
```