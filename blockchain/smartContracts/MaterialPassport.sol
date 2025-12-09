```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MaterialPassport {
    struct Material {
        string name;
        string description;
        uint256 quantity;
        address owner;
    }

    mapping(uint256 => Material) public materials;
    uint256 public materialCount;

    event MaterialRegistered(uint256 indexed id, string name, address indexed owner);

    function registerMaterial(string memory _name, string memory _description, uint256 _quantity) public {
        materialCount++;
        materials[materialCount] = Material(_name, _description, _quantity, msg.sender);
        emit MaterialRegistered(materialCount, _name, msg.sender);
    }

    function getMaterial(uint256 _id) public view returns (string memory, string memory, uint256, address) {
        Material memory mat = materials[_id];
        return (mat.name, mat.description, mat.quantity, mat.owner);
    }
}
```