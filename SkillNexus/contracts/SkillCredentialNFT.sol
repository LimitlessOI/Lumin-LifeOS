```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkillCredentialNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    address public admin;

    constructor() ERC721('SkillCredentialNFT', 'SCN') {
        admin = msg.sender;
    }

    function mint(address to) external onlyOwner {
        _safeMint(to, nextTokenId);
        nextTokenId++;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://api.lifeos.com/nft/";
    }
}