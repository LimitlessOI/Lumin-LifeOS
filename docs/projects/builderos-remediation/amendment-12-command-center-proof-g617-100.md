<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G617 100. -->

The specification contains contradictory instructions regarding the expected output format (markdown file content vs. implementation code) and the target file path.
```typescript
// src/c2/interfaces/telemetry.ts

/**
 * Defines the core structure for telemetry data emitted by LifeOS agents
 * and ingested by the Command Center (C2).
 */
export interface TelemetryData {
  /**
   * Unix timestamp in milliseconds when the telemetry event occurred.
   * This provides a precise, machine-readable time for event ordering and analysis.
   */
  timestamp: number;
  /**
   * Unique identifier for the LifeOS agent instance emitting the telemetry.
   * This allows for tracing telemetry back to its source agent.
   */
  agentId: string;
  /**
   * Type of the telemetry event. This string categorizes the event,
   * allowing for different processing logic based on the event's nature.
   * Examples: 'heartbeat', 'error', 'resource_usage', 'log_message'.
   */
  eventType: string;
  /**
   * A flexible payload object containing event-specific data.
   * The structure of this object is expected to vary based on the `eventType`.
   * It allows for extensible telemetry without requiring schema changes for every new data point.
   */
  payload: Record<string, any>;
}
```