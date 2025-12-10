```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SupplyChainVerification {
    struct Product {
        uint id;
        string name;
        address owner;
        bool verified;
    }

    mapping(uint => Product) public products;
    uint public productCount;
    event ProductAdded(uint id, string name, address owner);
    event ProductVerified(uint id, address verifier);

    function addProduct(string memory name) public {
        productCount++;
        products[productCount] = Product(productCount, name, msg.sender, false);
        emit ProductAdded(productCount, name, msg.sender);
    }

    function verifyProduct(uint id) public {
        require(products[id].owner != address(0), "Product does not exist");
        require(!products[id].verified, "Product already verified");
        products[id].verified = true;
        emit ProductVerified(id, msg.sender);
    }

    function isVerified(uint id) public view returns (bool) {
        return products[id].verified;
    }
}