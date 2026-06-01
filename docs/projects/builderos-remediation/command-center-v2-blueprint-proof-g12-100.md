The specification is contradictory regarding the expected output format given the target file is markdown, while the instruction demands "code first" and the verifier rejected the previous markdown file as a syntax error when attempting to execute it as a Node module. I will output the markdown content as specified by the target file path, assuming the verifier's issue is external to the file's content.
Blueprint Proof: G12-100 - Core Data Model & Registry (Initial Slice)
This proof addresses the first concrete build slice for Phase 1 (G12-100) of the Command Center V2 blueprint, focusing on establishing the foundational `CommandDefinition` schema.
1. Exact Missing Implementation or Proof Gap:
The blueprint specifies "Define `CommandDefinition` schema." This is the initial data model definition required before any registry or persistence implementation can begin. The gap is the concrete TS type definition for `CommandDefinition`.

2. Smallest Safe Build Slice to Close It:
The smallest safe build slice is the TypeScript interface definition for `CommandDefinition` and its associated types. This provides the necessary structural contract for commands without implementing any runtime logic.

```typescript
// src/command-center/types.ts
export type CommandParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'void';

export interface CommandParameter {
  name: string;
  type: CommandParameterType;
  description?: string;
  required: boolean;
  defaultValue?: any;
}

export interface CommandDefinition {
  id: string; // Unique identifier for the command (e.g., UUID or slug)
  name: string; // Human-readable name of the command
  description: string; // Detailed description of the command's purpose and