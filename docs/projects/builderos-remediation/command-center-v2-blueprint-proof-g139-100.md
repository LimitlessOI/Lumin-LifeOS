# G139-100 Proof: CommandDefinition Schema Definition

This note closes the proof for the initial build slice of G139-100, focusing on the foundational definition of the `CommandDefinition` entity.

## 1. Exact Missing Implementation or Proof Gap

The formal TypeScript interface for `CommandDefinition` is not yet defined within the codebase. This definition is critical as it establishes the canonical structure for all commands managed by the Command Center V2.

## 2. Smallest Safe Build Slice to Close It

Define the `CommandDefinition` TypeScript interface, including its core properties as outlined in the blueprint: `id`, `name`, `description`, `parameters` (as an array of `CommandParameterDefinition`), and `executor`. This definition will serve as the immutable contract for command metadata.

## 3. Exact Safe-Scope Files to Touch First

- `src/core/command/types.ts`: Introduce the `CommandDefinition` interface and any dependent types (e.g., `CommandParameterDefinition`).

## 4. Verifier/Runtime Checks

- **Compile-time:** Ensure `src/core/command/types.ts` compiles without errors. Verify that other modules (e.g., a placeholder `CommandRegistry` module) can successfully import and reference `CommandDefinition` without type mismatches.
- **Unit Test (Future):** A simple unit test in `src/core/command/types.test.ts` could instantiate a mock `CommandDefinition` object and assert its shape, though TypeScript's static analysis covers much of this. The primary check is successful compilation and type inference.

## 5. Stop Conditions if Runtime Truth Disagrees

- **Compilation Failure:** If `src/core/command/types.ts` or any module importing `CommandDefinition` fails to compile due to type errors related to this definition.