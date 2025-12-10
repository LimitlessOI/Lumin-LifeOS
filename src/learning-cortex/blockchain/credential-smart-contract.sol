```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Credential {
    struct CredentialData {
        address issuer;
        string credentialHash;
        uint256 timestamp;
    }

    mapping(address => CredentialData) public credentials;

    event CredentialIssued(address indexed recipient, string credentialHash, uint256 timestamp);

    function issueCredential(address recipient, string memory credentialHash) public {
        credentials[recipient] = CredentialData(msg.sender, credentialHash, block.timestamp);
        emit CredentialIssued(recipient, credentialHash, block.timestamp);
    }

    function verifyCredential(address recipient) public view returns (CredentialData memory) {
        return credentials[recipient];
    }
}