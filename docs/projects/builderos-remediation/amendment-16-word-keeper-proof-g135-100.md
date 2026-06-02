Amendment 16: Word Keeper - Proof G135-100
Blueprint Note: Next Smallest Build Slice
This note outlines the next smallest, blueprint-backed build slice for the Amendment 16: Word Keeper project, focusing on establishing the core domain entity and its persistence contract.

1. Exact Missing Implementation or Proof Gap
The `AMENDMENT_16_WORD_KEEPER.md` blueprint defines the conceptual `Word` entity and `WordRepository`. The immediate gap is the concrete implementation of these core components:
-   Definition of the `Word` domain entity (interface/class).
-   Definition of the `WordRepository` interface, specifying methods for adding and retrieving words.
-   A basic, functional implementation of the `WordRepository` to prove the persistence contract, initially using an in-memory store for rapid iteration and testing.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
1.  Defining the `Word` interface/type in `src/domain/word.ts`.
2.  Defining the `WordRepository` interface in `src/domain/word-repository.ts` with methods like `add(text: string): Promise<Word>` and `findByText(text: string): Promise<Word | null>`.
3.  Implementing an in-memory `InMemoryWordRepository` in `src/infra/in-memory-word-repository.ts` that adheres to the `WordRepository` interface.
4.  Adding a simple test file `src/infra/in-memory-word-repository.test.ts` to verify the basic functionality of the in-memory repository.

3. Exact Safe-Scope Files to Touch First
-   `src/domain/word.ts` (new file)
-   `src/domain/word-repository.ts` (new file)
-   `src/infra/in-memory-word-repository.ts` (new file)
-   `src/infra/in-memory-word-repository.test.ts` (new file)

4. Verifier/Runtime Checks
-   Successful compilation of all new TypeScript files (`tsc`).
-   All tests in `src/infra/in-memory-word-repository.test.ts` pass (`npm test src/infra/in-memory-word-repository.test.ts`).
-   No new linting errors introduced (`npm run lint`).
-   The `InMemoryWordRepository` can successfully `add` a `Word` and `findByText` can retrieve it.
-   `findByText` returns `null` for non-existent words.

5. Stop Conditions if Runtime Truth Disagrees
-   Compilation errors in `src/domain/` or `src/infra/` related to `Word` or `WordRepository` definitions or implementations.
-   Tests in `src/infra/in-memory-word-repository.test.ts` fail, indicating a broken persistence contract or incorrect entity behavior.
-   The `Word` entity or `WordRepository` interface deviates from the conceptual blueprint in `AMENDMENT_16_WORD_KEEPER.md` upon manual review.