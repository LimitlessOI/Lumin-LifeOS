```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DataMarketplace {
    address public owner;
    mapping(address => uint) public balances;

    event PaymentReceived(address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function receivePayment() public payable {
        require(msg.value > 0, "Payment must be greater than zero");
        balances[msg.sender] += msg.value;
        emit PaymentReceived(msg.sender, msg.value);
    }

    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
```