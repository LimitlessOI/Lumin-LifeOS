```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ConsentManagement {
    struct Consent {
        bool status;
        uint256 timestamp;
    }

    mapping(address => Consent) private consents;

    event ConsentUpdated(address indexed user, bool status, uint256 timestamp);

    function updateConsent(bool _status) public {
        consents[msg.sender] = Consent(_status, block.timestamp);
        emit ConsentUpdated(msg.sender, _status, block.timestamp);
    }

    function getConsent(address _user) public view returns (bool, uint256) {
        Consent memory consent = consents[_user];
        return (consent.status, consent.timestamp);
    }
}