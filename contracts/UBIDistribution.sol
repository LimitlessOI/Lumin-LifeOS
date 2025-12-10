```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UBIDistribution {
    mapping(address => uint256) public balances;

    event PaymentDistributed(address indexed recipient, uint256 amount);

    function distributePayment(address recipient, uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        balances[recipient] += amount;
        emit PaymentDistributed(recipient, amount);
    }

    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
}
```