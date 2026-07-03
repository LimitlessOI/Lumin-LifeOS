```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IdentityVerification {
    struct Identity {
        string name;
        string documentHash;
        bool verified;
    }

    mapping(address => Identity) public identities;

    event IdentityCreated(address indexed user, string name, string documentHash);
    event IdentityVerified(address indexed user);

    function createIdentity(string memory _name, string memory _documentHash) public {
        require(bytes(identities[msg.sender].name).length == 0, "Identity already exists.");
        identities[msg.sender] = Identity(_name, _documentHash, false);
        emit IdentityCreated(msg.sender, _name, _documentHash);
    }

    function verifyIdentity(address _user) public {
        require(bytes(identities[_user].name).length != 0, "Identity does not exist.");
        identities[_user].verified = true;
        emit IdentityVerified(_user);
    }

    function getIdentity(address _user) public view returns (string memory, string memory, bool) {
        Identity memory identity = identities[_user];
        return (identity.name, identity.documentHash, identity.verified);
    }
}
```