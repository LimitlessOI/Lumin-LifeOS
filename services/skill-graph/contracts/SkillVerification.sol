```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SkillVerification {
    struct Credential {
        address issuer;
        string skill;
        uint256 issuedAt;
    }

    mapping(address => Credential[]) public credentials;

    function issueCredential(address recipient, string memory skill) public {
        Credential memory newCredential = Credential({
            issuer: msg.sender,
            skill: skill,
            issuedAt: block.timestamp
        });
        credentials[recipient].push(newCredential);
    }

    function getCredentials(address user) public view returns (Credential[] memory) {
        return credentials[user];
    }
}
```