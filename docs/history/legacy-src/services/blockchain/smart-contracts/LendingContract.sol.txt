```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LendingContract {
    struct Loan {
        uint id;
        address borrower;
        uint amount;
        uint interestRate;
        uint duration;
        string status;
    }

    uint public loanCounter;
    mapping(uint => Loan) public loans;

    event LoanCreated(uint id, address borrower, uint amount, uint interestRate, uint duration, string status);

    function createLoan(uint _amount, uint _interestRate, uint _duration) external {
        loanCounter++;
        loans[loanCounter] = Loan(loanCounter, msg.sender, _amount, _interestRate, _duration, "Active");
        emit LoanCreated(loanCounter, msg.sender, _amount, _interestRate, _duration, "Active");
    }
}
```