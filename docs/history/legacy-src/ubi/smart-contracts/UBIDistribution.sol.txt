```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UBIDistribution is Ownable {
    mapping(address => uint256) public distributions;
    uint256 public totalDistributed;
    uint256 public distributionAmount;

    event Distributed(address indexed recipient, uint256 amount);

    constructor(uint256 _distributionAmount) {
        distributionAmount = _distributionAmount;
    }

    function distribute(address recipient) external onlyOwner {
        require(distributions[recipient] == 0, "Recipient has already received UBI");
        distributions[recipient] = distributionAmount;
        totalDistributed += distributionAmount;
        payable(recipient).transfer(distributionAmount);
        emit Distributed(recipient, distributionAmount);
    }

    receive() external payable {}
}