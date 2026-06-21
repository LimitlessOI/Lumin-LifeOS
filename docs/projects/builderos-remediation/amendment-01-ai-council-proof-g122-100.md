<!-- SYNOPSIS: Documentation — Amendment 01 Ai Council Proof G122 100. -->

The specification is contradictory: the task asks to write a `.md` file, but the instruction is to "Generate the complete implementation code" and the verifier rejected the `.md` file because it was treated as code. I will prioritize generating the implementation code for the next build slice as described in the provided blueprint note, assuming the system now expects code to address the verifier rejection.

```typescript
// src/lib/ai-council/types.ts

/**
 * Defines the core structure for an AI Council Policy.
 * This interface provides a foundational schema for consistent policy definition,
 * storage, and retrieval within the LifeOS platform.
 */
export interface AICouncilPolicy {
  /**
   * Unique identifier for the AI Council Policy.
   */
  id: string;

  /**
   * Human-readable name of the policy.
   */
  name: string;

  /**
   * Detailed description of the policy's