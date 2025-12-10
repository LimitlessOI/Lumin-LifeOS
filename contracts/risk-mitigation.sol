```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RiskMitigation {
    struct Risk {
        uint256 id;
        string description;
        bool mitigated;
    }

    mapping(uint256 => Risk) public risks;
    uint256 public riskCount;

    function addRisk(string memory description) public {
        riskCount++;
        risks[riskCount] = Risk(riskCount, description, false);
    }

    function mitigateRisk(uint256 id) public {
        Risk storage risk = risks[id];
        require(risk.id == id, "Risk not found");
        risk.mitigated = true;
    }
}
```