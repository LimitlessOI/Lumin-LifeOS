```go
package main

import (
    "github.com/hyperledger/fabric-chaincode-go/shim"
    sc "github.com/hyperledger/fabric-protos-go/peer"
    "encoding/json"
    "fmt"
)

type SmartContract struct{}

type ContainerEvent struct {
    ContainerID string `json:"containerId"`
    EventType   string `json:"eventType"`
    Timestamp   string `json:"timestamp"`
}

func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
    return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {
    function, args := APIstub.GetFunctionAndParameters()
    if function == "recordEvent" {
        return s.recordEvent(APIstub, args)
    }
    return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) recordEvent(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
    if len(args) != 3 {
        return shim.Error("Incorrect number of arguments. Expecting 3")
    }

    var event = ContainerEvent{ContainerID: args[0], EventType: args[1], Timestamp: args[2]}
    eventAsBytes, _ := json.Marshal(event)
    APIstub.PutState(args[0], eventAsBytes)

    return shim.Success(nil)
}

func main() {
    err := shim.Start(new(SmartContract))
    if err != nil {
        fmt.Printf("Error creating new Smart Contract: %s", err)
    }
}
```