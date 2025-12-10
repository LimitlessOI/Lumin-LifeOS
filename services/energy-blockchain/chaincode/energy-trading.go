```go
package main

import (
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type EnergyTradingContract struct {
    contractapi.Contract
}

type EnergyAsset struct {
    ID      string  `json:"id"`
    OwnerID string  `json:"owner_id"`
    Energy  float64 `json:"energy"`
}

func (c *EnergyTradingContract) RegisterAsset(ctx contractapi.TransactionContextInterface, id string, ownerID string, energy float64) error {
    asset := EnergyAsset{
        ID:      id,
        OwnerID: ownerID,
        Energy:  energy,
    }
    assetJSON, err := json.Marshal(asset)
    if err != nil {
        return err
    }
    return ctx.GetStub().PutState(id, assetJSON)
}

func (c *EnergyTradingContract) TradeEnergy(ctx contractapi.TransactionContextInterface, sellerID string, buyerID string, amount float64) error {
    // Implementation of trading logic
    return nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(new(EnergyTradingContract))
    if err != nil {
        fmt.Printf("Error creating energy-trading chaincode: %s", err.Error())
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting energy-trading chaincode: %s", err.Error())
    }
}
```