pragma solidity ^0.8.0;

contract UBIDistribution {
    address public owner;
    mapping(address => uint256) public balances;

    event Distributed(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function distribute(address[] memory recipients, uint256 amount) public onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            balances[recipients[i]] += amount;
            emit Distributed(recipients[i], amount);
        }
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {}
}