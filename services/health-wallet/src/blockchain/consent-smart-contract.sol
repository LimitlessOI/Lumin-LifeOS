```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ConsentManager {
    struct Consent {
        address patient;
        string consentHash;
        uint256 timestamp;
    }

    mapping(address => Consent) public consents;

    event ConsentGiven(address indexed patient, string consentHash, uint256 timestamp);

    function giveConsent(string memory _consentHash) public {
        consents[msg.sender] = Consent(msg.sender, _consentHash, block.timestamp);
        emit ConsentGiven(msg.sender, _consentHash, block.timestamp);
    }

    function getConsent(address _patient) public view returns (Consent memory) {
        return consents[_patient];
    }
}
```