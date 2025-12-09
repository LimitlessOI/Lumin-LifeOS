```solidity
// ResourceTracking.sol
// Smart contract implementation for resource tracking

pragma solidity ^0.8.0;

contract ResourceTracking {
    struct Resource {
        string name;
        uint quantity;
    }

    mapping(uint => Resource) public resources;

    function addResource(uint _id, string memory _name, uint _quantity) public {
        resources[_id] = Resource(_name, _quantity);
    }

    function getResource(uint _id) public view returns (string memory, uint) {
        Resource memory resource = resources[_id];
        return (resource.name, resource.quantity);
    }
}
```