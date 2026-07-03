```go
package main

import (
  "fmt"
  "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type VotingContract struct {
  contractapi.Contract
}

func (vc *VotingContract) SubmitVote(ctx contractapi.TransactionContextInterface, electionId string, candidateId string) error {
  voteKey := fmt.Sprintf("VOTE_%s_%s", electionId, candidateId)
  voteCount, err := ctx.GetStub().GetState(voteKey)
  if err != nil {
    return err
  }

  newVoteCount := 1
  if voteCount != nil {
    newVoteCount = int(voteCount[0]) + 1
  }

  return ctx.GetStub().PutState(voteKey, []byte{byte(newVoteCount)})
}

func main() {
  chaincode, err := contractapi.NewChaincode(new(VotingContract))
  if err != nil {
    panic(err.Error())
  }

  if err := chaincode.Start(); err != nil {
    panic(err.Error())
  }
}
```