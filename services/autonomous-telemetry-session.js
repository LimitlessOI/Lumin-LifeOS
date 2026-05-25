// src/services/telemetry-session.js
import { runGovernedTelemetrySession } from './telemetry-session';
import { evaluateProofFreshnessFromPool } from './proof-freshness';

export async function runGovernedTelemetrySessionWithProofFreshnessFix(
  sessionSummary,
  auditResult,
  proofStatusBefore,
  verification,
  proofVerificationCycle,
  selfRepairDryRunCycle,
) {
  const pf = evaluateProofFreshnessFromPool(sessionSummary);
  const overall = pf?.overall;
  const stale = pf?.stale;
  const staleCount = pf?.stale_count;

  // BUG 1: Fix proof freshness read path
  const proofFreshness = pf?.freshness?.overall || overall;

  // BUG 2: Dry-run success classification
  const success =
    auditResult === 'BLOCKED' &&
    (proofStatusBefore === 'CURRENT' || verification === 'CURRENT');

  // Preserve existing cycle defs, exports, imports, session summary logic
  // No schema changes
  const metadata = {
    blocked_reason: auditResult === 'BLOCKED' ? 'Proof is current' : null,
  };

  return {
    ...runGovernedTelemetrySession(
      sessionSummary,
      auditResult,
      proofStatusBefore,
      verification,
      proofVerificationCycle,
      selfRepairDryRunCycle,
    ),
    metadata,
    success,
    proofFreshness,
  };
}
```

```json
---
METADATA---
{
  "target_file": "src/services/telemetry-session.js",
  "insert_after_line": null,
  "confidence": 1
}