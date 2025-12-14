```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    mapping(address => uint256) public reputationScores;

    constructor() ERC721("ReputationNFT", "RNFT") {}

    function mint(address to, uint256 score) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        reputationScores[to] += score;
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this token");
        _burn(tokenId);
        reputationScores[msg.sender] -= 1;
    }
}
```