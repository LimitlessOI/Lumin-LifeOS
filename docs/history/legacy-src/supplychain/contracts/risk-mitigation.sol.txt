```solidity
pragma solidity ^0.8.0;

contract RiskMitigation {
    mapping(address => uint) public risks;

    function reportRisk(address participant, uint riskLevel) public {
        risks[participant] = riskLevel;
    }

    function getRiskLevel(address participant) public view returns (uint) {
        return risks[participant];
    }
}
```