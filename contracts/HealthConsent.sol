pragma solidity ^0.8.0;

contract HealthConsent {
    struct Consent {
        address user;
        uint256 timestamp;
        bool consentGiven;
    }
    
    mapping(address => Consent) public consents;
    
    event ConsentGiven(address indexed user, uint256 timestamp);
    event ConsentRevoked(address indexed user, uint256 timestamp);

    function giveConsent() public {
        consents[msg.sender] = Consent(msg.sender, block.timestamp, true);
        emit ConsentGiven(msg.sender, block.timestamp);
    }

    function revokeConsent() public {
        require(consents[msg.sender].consentGiven, "Consent not given");
        consents[msg.sender].consentGiven = false;
        emit ConsentRevoked(msg.sender, block.timestamp);
    }
    
    function hasGivenConsent(address user) public view returns (bool) {
        return consents[user].consentGiven;
    }
}