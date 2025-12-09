```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PackagingTracker {
    mapping(uint256 => string) public packageStatus;

    function updateStatus(uint256 packageId, string memory status) public {
        packageStatus[packageId] = status;
    }

    function getStatus(uint256 packageId) public view returns (string memory) {
        return packageStatus[packageId];
    }
}
```