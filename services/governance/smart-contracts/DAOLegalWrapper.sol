```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DAOLegalWrapper {
    struct Proposal {
        uint id;
        string title;
        string description;
        bool executed;
    }

    mapping(uint => Proposal) public proposals;
    uint public proposalCount;

    event ProposalCreated(uint id, string title, string description);
    event ProposalExecuted(uint id);

    function createProposal(string memory _title, string memory _description) public {
        proposalCount++;
        proposals[proposalCount] = Proposal(proposalCount, _title, _description, false);
        emit ProposalCreated(proposalCount, _title, _description);
    }

    function executeProposal(uint _id) public {
        Proposal storage proposal = proposals[_id];
        require(!proposal.executed, "Proposal already executed");
        proposal.executed = true;
        emit ProposalExecuted(_id);
    }
}