```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SkillBadge {
    struct Badge {
        string name;
        string description;
        address owner;
    }

    mapping(uint => Badge) public badges;
    uint public badgeCount;

    function mintBadge(string memory _name, string memory _description) public {
        badgeCount++;
        badges[badgeCount] = Badge(_name, _description, msg.sender);
    }
}