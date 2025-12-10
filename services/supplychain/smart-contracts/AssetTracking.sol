```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AssetTracking {
    struct Asset {
        string name;
        string description;
        address currentOwner;
    }

    mapping(uint256 => Asset) public assets;
    uint256 public assetCount;

    event AssetCreated(uint256 assetId, string name, string description, address owner);
    event OwnershipTransferred(uint256 assetId, address newOwner);

    function createAsset(string memory name, string memory description) public {
        assetCount++;
        assets[assetCount] = Asset(name, description, msg.sender);
        emit AssetCreated(assetCount, name, description, msg.sender);
    }

    function transferOwnership(uint256 assetId, address newOwner) public {
        require(assets[assetId].currentOwner == msg.sender, "Not the asset owner");
        assets[assetId].currentOwner = newOwner;
        emit OwnershipTransferred(assetId, newOwner);
    }
}
```