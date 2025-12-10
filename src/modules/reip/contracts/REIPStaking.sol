pragma solidity ^0.8.0;

contract REIPStaking {
    mapping(address => uint256) public stakes;
    event Staked(address indexed user, uint256 amount);
    event Slashed(address indexed user, uint256 amount);

    function stake() external payable {
        require(msg.value > 0, "Stake amount must be greater than zero");
        stakes[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function slash(address user, uint256 amount) external {
        require(stakes[user] >= amount, "Insufficient stake to slash");
        stakes[user] -= amount;
        emit Slashed(user, amount);
    }
}