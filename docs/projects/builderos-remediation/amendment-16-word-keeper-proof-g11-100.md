<!-- SYNOPSIS: Documentation — Amendment 16 Word Keeper Proof G11 100. -->

Amendment 16: Word Keeper - Proof G11-100 Remediation Note
This document serves as a proof-closing blueprint note for the "G11-100: Initial Proof-of-Concept for WordUnit Hashing and Merkle Tree Construction" section of the `AMENDMENT_16_WORD_KEEPER.md` blueprint. It outlines the next smallest build slice required to implement the core proof generation logic.
---
Blueprint Note: G11-100 Core Proof Generation
1. Exact missing implementation or proof gap:
The blueprint describes the conceptual mechanism for generating `WordProof`s, specifically detailing `WordUnit` hashing (SHA-256) and Merkle tree construction for `WordBlock`s. The gap is the concrete, production-ready implementation of the `WordProofGenerator` utility responsible for these cryptographic operations. This includes functions to hash individual `WordUnit`s and to compute the Merkle root for a collection of `WordUnit` hashes.
2. Smallest safe build slice to close it:
Implement the `WordProofGenerator` utility module. This module will encapsulate the logic for:
    a. Hashing a `WordUnit` (content + metadata) using SHA-256.
    b. Constructing a Merkle tree from an array of `WordUnit` hashes and returning the final Merkle root.
    c. Orchestrating these steps to generate a complete `WordProof` object (containing `blockId`, `merkleRoot`, `timestamp`, and a placeholder/mock `signerSignature` for this initial slice).
3. Exact safe-scope files to touch first:
-   `src/utils/wordProofGenerator.mjs` (new file)
-   `src/utils/wordProofGenerator.test.mjs` (new file for unit tests)
4. Verifier/runtime checks:
-   Unit Tests (`src/utils/wordProofGenerator.test.mjs`):
-   Verify `hashWordUnit` produces consistent and correct SHA-256 hashes for various `WordUnit` inputs (empty, simple, complex content/metadata).
-   Verify `generateMerkleRoot` correctly computes the Merkle root for different sets of input hashes (e.g., single hash, two hashes, multiple hashes, odd/even counts).
-   Verify `generateWordProof` correctly integrates `hashWordUnit` and `generateMerkleRoot` to produce a `WordProof` object with the expected structure and a valid Merkle root derived from the input `WordBlock`'s units.
5. Stop conditions if runtime truth disagrees:
-   If `hashWordUnit` produces inconsistent hashes for identical inputs, stop and investigate cryptographic primitive stability or input serialization.
-   If `generateMerkleRoot` produces incorrect roots (e.g., different from known good test vectors or failing basic Merkle tree properties), stop and debug tree construction logic.
-   If `generateWordProof` fails to assemble the `WordProof` object with the correct structure or derived Merkle root, stop and review integration logic.
-   Any unhandled exceptions during hashing or Merkle tree operations.