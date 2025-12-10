```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EscrowAgent {
    enum EscrowStatus { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE, REFUNDED }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        EscrowStatus status;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;

    function createEscrow(address seller, uint256 amount) external payable {
        require(msg.value == amount, "Incorrect amount sent");
        escrows[nextEscrowId++] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            status: EscrowStatus.AWAITING_DELIVERY
        });
    }

    function releaseFunds(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.AWAITING_DELIVERY, "Escrow not active");
        require(msg.sender == escrow.buyer, "Only buyer can release funds");

        escrow.status = EscrowStatus.COMPLETE;
        payable(escrow.seller).transfer(escrow.amount);
    }

    function refund(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.AWAITING_DELIVERY, "Escrow not active");
        require(msg.sender == escrow.seller, "Only seller can initiate a refund");

        escrow.status = EscrowStatus.REFUNDED;
        payable(escrow.buyer).transfer(escrow.amount);
    }
}
```