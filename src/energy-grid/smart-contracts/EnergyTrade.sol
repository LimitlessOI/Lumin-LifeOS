```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyTrade {
    struct EnergyOffer {
        uint id;
        address seller;
        uint amount;
        uint price;
    }

    mapping(uint => EnergyOffer) public offers;
    uint public nextOfferId;

    function createOffer(uint amount, uint price) public {
        offers[nextOfferId] = EnergyOffer(nextOfferId, msg.sender, amount, price);
        nextOfferId++;
    }

    function purchaseEnergy(uint offerId) public payable {
        EnergyOffer storage offer = offers[offerId];
        require(msg.value >= offer.price, "Insufficient funds");
        payable(offer.seller).transfer(msg.value);
        // Logic for transferring energy
    }
}