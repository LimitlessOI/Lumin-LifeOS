```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SkillCredential {
    struct Credential {
        uint id;
        string skill;
        address issuedTo;
    }

    mapping(uint => Credential) public credentials;
    uint public nextId;

    function issueCredential(string memory skill, address to) public {
        credentials[nextId] = Credential(nextId, skill, to);
        nextId++;
    }
}