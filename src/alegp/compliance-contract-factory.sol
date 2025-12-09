```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ComplianceContractFactory {
    address[] public deployedContracts;

    function deployComplianceContract() public {
        ComplianceContract newContract = new ComplianceContract(msg.sender);
        deployedContracts.push(address(newContract));
    }
}

contract ComplianceContract {
    address public owner;

    constructor(address creator) {
        owner = creator;
    }

    function enforceCompliance() public view returns (bool) {
        // Placeholder for compliance logic
        return true;
    }
}
```