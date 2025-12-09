```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VerificationContract {
    mapping(string => bytes32) public identityHashes;

    function storeIdentity(string memory identityId, bytes32 hash) public {
        require(identityHashes[identityId] == 0, "Identity already stored");
        identityHashes[identityId] = hash;
    }

    function verifyIdentity(string memory identityId, bytes32 hash) public view returns (bool) {
        return identityHashes[identityId] == hash;
    }
}
```