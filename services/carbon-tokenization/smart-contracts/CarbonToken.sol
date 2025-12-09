```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract CarbonToken is ERC1155 {
    uint256 public constant CARBON_OFFSET = 0;

    constructor() ERC1155("https://token-cdn-domain/{id}.json") {
        _mint(msg.sender, CARBON_OFFSET, 1000, "");
    }
}
```