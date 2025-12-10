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

type TokenTransaction struct {
    TransactionHash string  `json:"transactionHash"`
    Amount          float64 `json:"amount"`
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
    transactions := []TokenTransaction{
        {TransactionHash: "tx001", Amount: 100.0},
    }

    for i, tx := range transactions {
        txAsBytes, _ := json.Marshal(tx)
        err := ctx.GetStub().PutState(fmt.Sprintf("TX%d", i), txAsBytes)

        if err != nil {
            return fmt.Errorf("failed to put to world state. %s", err.Error())
        }
    }

    return nil
}

func (s *SmartContract) CreateTransaction(ctx contractapi.TransactionContextInterface, txHash string, amount float64) error {
    exists, err := s.TransactionExists(ctx, txHash)
    if err != nil {
        return err
    }
    if exists {
        return fmt.Errorf("the transaction %s already exists", txHash)
    }

    tx := TokenTransaction{
        TransactionHash: txHash,
        Amount:          amount,
    }
    txAsBytes, _ := json.Marshal(tx)

    return ctx.GetStub().PutState(txHash, txAsBytes)
}

func (s *SmartContract) TransactionExists(ctx contractapi.TransactionContextInterface, txHash string) (bool, error) {
    txAsBytes, err := ctx.GetStub().GetState(txHash)

    if err != nil {
        return false, fmt.Errorf("failed to read from world state. %s", err.Error())
    }

    return txAsBytes != nil, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(new(SmartContract))

    if err != nil {
        fmt.Printf("Error create fabcar chaincode: %s", err.Error())
        return
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting fabcar chaincode: %s", err.Error())
    }
}
```