<!-- SYNOPSIS: BUILDEROS TOPOLOGY AUDIT -->

# BUILDEROS TOPOLOGY AUDIT

**Status:** `DRAFT`  
**Last Updated:** 2026-05-25

No deletions were performed in this phase.

## Highest-Risk Duplicates

1. Command Center surfaces
   - canonical: `/lifeos-command-center`
   - legacy duplicate: `/command-center`
   - risk: operator reads legacy operational dashboard as governed cockpit

2. Memory systems
   - canonical direction: memory-capsule / Amendment 39 path
   - legacy duplicate: Amendment 02 memory and SSOT prose memory
   - risk: competing truth stores

3. Overnight / queue naming
   - canonical: `builder-continuous-queue-*`, governed overnight state/log
   - legacy duplicate: `builder-overnight-*`
   - risk: same subsystem appears as multiple runners

4. Proof/cert flows
   - canonical: Railway-backed Phase 14 and proof-freshness routes
   - legacy duplicate: local/manual shell proof workflows
   - risk: local proof mistaken for Railway truth

## Route / Service Classification

### KEEP_CANONICAL

- `routes/lifeos-command-center-routes.js`
- `routes/self-repair-executor-routes.js`
- `routes/autonomous-telemetry-routes.js`
- `services/oil-proof-freshness.js`
- `services/supervised-autonomy-readiness.js`
- `services/self-repair-executor.js`
- `services/self-repair-prevention-hook-planner.js`
- `services/autonomous-telemetry-service.js`
- `public/overlay/lifeos-command-center.html`

### KEEP_LEGACY

- `routes/command-center-routes.js`
- `public/overlay/command-center.html`
- `public/overlay/command-center.js`
- `public/overlay/command-center.css`
- `builder-overnight-*` compatible file names

### SALVAGE_IDEAS_ONLY

- old command-center operator density and auth patterns
- legacy overnight naming compatibility patterns
- candidate prevention rules not yet wired

### ARCHIVE_CANDIDATE

- stale quick-start / test-report command-center docs already marked legacy
- local/manual proof workflows once Railway-canonical paths fully replace them

### FORBIDDEN_CANDIDATE

- docs-only certification claims
- direct unreceipted autonomous repair logic
- duplicate telemetry writers claiming canonical truth

### UNKNOWN_DO_NOT_TOUCH

- uncalled service files that may still be reachable through non-obvious boot paths
- any route file not yet fully traced from `register-runtime-routes.js`

## Mounted Routes Audit

### Mounted and Canonical for BuilderOS

- `/api/v1/lifeos/builder/ready`
- `/api/v1/lifeos/command-center/phase14`
- `/api/v1/lifeos/command-center/proof-freshness`
- `/api/v1/lifeos/command-center/supervised-autonomy/readiness`
- `/api/v1/lifeos/command-center/self-repair/repair-queue`
- `/api/v1/lifeos/command-center/self-repair/prevention/hooks`
- `/api/v1/lifeos/autonomous-telemetry/efficiency`
- `/api/v1/lifeos/autonomous-telemetry/events`
- `/lifeos-command-center`

### Mounted but Legacy / Confusing

- `/command-center`

### Mounted Product Paths Not Counted Toward BuilderOS Alpha

- broad `/api/v1/lifeos/*` product routes
- TC/clientcare/family/consumer overlays

## Services with Active Callers

- `oil-proof-freshness`
- `supervised-autonomy-readiness`
- `self-repair-executor`
- `self-repair-prevention-hook-planner`
- `autonomous-telemetry-service`

## Services with Partial / Unknown Caller Status

- memory-capsule services in BuilderOS scoring context
- TSOS/product-facing efficiency routes

## DB Tables with Active Writes (BuilderOS-Relevant)

- `builder_audit_receipts`
- `security_receipts`
- `autonomous_telemetry_events`
- `builder_task_receipts`
- `builder_halt_log`

## DB Tables with Stale / Unproven BuilderOS Role

- memory tables not yet counted via approved runtime proof sources

## Risk Notes

- duplicate route stacks remain the largest structural fake-green risk
- telemetry is real but still missing some core metrics
- prevention is real but narrow
- memory remains structurally strong and operationally under-proven for BuilderOS Alpha
