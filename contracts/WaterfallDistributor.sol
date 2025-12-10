```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RoyaltyNFT.sol";

contract WaterfallDistributor is Ownable {
    RoyaltyNFT public royaltyNFT;

    constructor(address royaltyNFTAddress) {
        royaltyNFT = RoyaltyNFT(royaltyNFTAddress);
    }

    function distributeRoyalties(uint256 tokenId) public payable onlyOwner {
        (address recipient, uint256 royalty) = royaltyNFT.getRoyaltyInfo(tokenId);
        require(msg.value >= royalty, "Insufficient funds for royalty distribution");
        payable(recipient).transfer(royalty);
    }
}
```