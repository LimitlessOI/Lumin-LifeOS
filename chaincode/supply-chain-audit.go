```go
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
    contractapi.Contract
}

type SupplyChainEntity struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Timestamp string `json:"timestamp"`
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
    entities := []SupplyChainEntity{
        {ID: "entity1", Name: "Supplier A", Timestamp: "2023-01-01T00:00:00Z"},
    }

    for _, entity := range entities {
        entityJSON, err := json.Marshal(entity)
        if err != nil {
            return err
        }

        err = ctx.GetStub().PutState(entity.ID, entityJSON)
        if err != nil {
            return fmt.Errorf("failed to put state: %v", err)
        }
    }

    return nil
}

func (s *SmartContract) CreateEntity(ctx contractapi.TransactionContextInterface, id string, name string, timestamp string) error {
    entity := SupplyChainEntity{
        ID:        id,
        Name:      name,
        Timestamp: timestamp,
    }

    entityJSON, err := json.Marshal(entity)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, entityJSON)
}

func (s *SmartContract) QueryEntity(ctx contractapi.TransactionContextInterface, id string) (*SupplyChainEntity, error) {
    entityJSON, err := ctx.GetStub().GetState(id)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if entityJSON == nil {
        return nil, fmt.Errorf("entity %s does not exist", id)
    }

    var entity SupplyChainEntity
    err = json.Unmarshal(entityJSON, &entity)
    if err != nil {
        return nil, err
    }

    return &entity, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(new(SmartContract))
    if err != nil {
        fmt.Printf("Error create supply-chain-audit chaincode: %s", err.Error())
        return
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting supply-chain-audit chaincode: %s", err.Error())
    }
}