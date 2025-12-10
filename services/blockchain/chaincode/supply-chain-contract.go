package main

import (
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    "encoding/json"
    "fmt"
)

// SupplyChainContract for managing CRUD operations
type SupplyChainContract struct {
    contractapi.Contract
}

// Product defines a supply chain product
type Product struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`
    Owner       string `json:"owner"`
}

// InitLedger initializes the ledger with some products
func (s *SupplyChainContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
    products := []Product{
        {ID: "product1", Name: "Product 1", Description: "Description 1", Owner: "Owner A"},
        {ID: "product2", Name: "Product 2", Description: "Description 2", Owner: "Owner B"},
    }

    for _, product := range products {
        productJSON, err := json.Marshal(product)
        if err != nil {
            return err
        }

        err = ctx.GetStub().PutState(product.ID, productJSON)
        if err != nil {
            return fmt.Errorf("failed to put product to world state. %v", err)
        }
    }

    return nil
}

// CreateProduct adds a new product to the world state
func (s *SupplyChainContract) CreateProduct(ctx contractapi.TransactionContextInterface, id string, name string, description string, owner string) error {
    product := Product{
        ID:          id,
        Name:        name,
        Description: description,
        Owner:       owner,
    }

    productJSON, err := json.Marshal(product)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, productJSON)
}

// QueryProduct returns the product stored in the world state with given id
func (s *SupplyChainContract) QueryProduct(ctx contractapi.TransactionContextInterface, id string) (*Product, error) {
    productJSON, err := ctx.GetStub().GetState(id)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if productJSON == nil {
        return nil, fmt.Errorf("the product %s does not exist", id)
    }

    var product Product
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return nil, err
    }

    return &product, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(new(SupplyChainContract))
    if err != nil {
        fmt.Printf("Error create supply-chain-contract chaincode: %s", err)
        return
    }

    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting supply-chain-contract chaincode: %s", err)
    }
}