```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RoyaltyNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    mapping(uint256 => uint256) public royalties;

    constructor() ERC721("RoyaltyNFT", "RFT") {
        tokenCounter = 0;
    }

    function createToken(string memory tokenURI, uint256 royalty) public onlyOwner returns (uint256) {
        uint256 newTokenId = tokenCounter;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        royalties[newTokenId] = royalty;
        tokenCounter += 1;
        return newTokenId;
    }

    function getRoyaltyInfo(uint256 tokenId) public view returns (address, uint256) {
        require(_exists(tokenId), "ERC721Metadata: Royalty query for nonexistent token");
        return (ownerOf(tokenId), royalties[tokenId]);
    }
}
```