```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {
    struct Milestone {
        address payable freelancer;
        uint amount;
        bool completed;
    }

    mapping(uint => Milestone) public milestones;
    uint public milestoneCount;

    function createMilestone(address payable _freelancer, uint _amount) public {
        milestoneCount++;
        milestones[milestoneCount] = Milestone(_freelancer, _amount, false);
    }

    function releaseFunds(uint _milestoneId) public {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.completed, "Milestone not completed");
        milestone.freelancer.transfer(milestone.amount);
    }

    function completeMilestone(uint _milestoneId) public {
        Milestone storage milestone = milestones[_milestoneId];
        milestone.completed = true;
    }
}
```