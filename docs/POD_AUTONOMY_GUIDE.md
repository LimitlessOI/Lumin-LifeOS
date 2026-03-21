# POD Autonomy Guide

**Purpose:** This guide crystallizes the new “drone pod” architecture so every project is treated like a human engineering cell—ideas get scoped, drones are assigned, telemetry flows, and completion triggers the next iteration without human hand-offs (per the SSOT and companion contract).

## 1. Key primitives
- **Event bus (`core/event-bus.js`)** – a lightweight `EventEmitter` wrapper that lets pods broadcast lifecycle events (`pod:created`, `pod:completed`, `drone:assigned`, etc.).  
- **Telemetry recorder (`services/telemetry.js`)** – tracks metrics + traces (startup, endpoint hits, pod transitions) that are exposed at `/api/v1/ops/telemetry`.  
- **Pod manager (`core/pod-manager.js`)** – maintains pods/drones, reroutes idle drones into maintenance, emits events, and implements helpers such as `createPod`, `assignDroneToPod`, `markPodComplete`, `moveDronesBetweenPods`, and `getIdleDrones`.  
- **Routes (`startup/routes/server-routes.js`)** – consolidate overlay, Stripe, health, and telemetry/pod insights; exposes `/api/v1/ops/pods` and `/api/v1/ops/telemetry` for dashboards.

## 2. How a pod works
1. Create a pod via `podManager.createPod(...)` with a `name`, `project`, `priority`, and optional `labels`. Labels such as `core`, `growth`, or `followup` drive automation hooks.  
2. Register drones (`podManager.registerDrone`) describing their role/skills and assign them (`podManager.assignDroneToPod`). Idle drones are automatically rerouted to maintenance when projects complete.  
3. When a pod finishes, call `podManager.markPodComplete(podId, { note, nextProject })`.  
4. The system already subscribes to `pod:completed`: non-maintenance pods spawn a `followup` pod, move two drones from the maintenance pod to keep improving the same project, and record telemetry via `telemetry.startTrace("pod.auto-transition", ...)`.

## 3. Adding a new project/drone pod
1. **Register startup resources (if needed)** – extend `server.js` near the `moduleRouter` registration to `createPod`, `registerDrone`, and assign drones just like the `platform-core` and `growth-engineering` pods.  
2. **Expose project SPR** – update `startup/routes/server-routes.js` or your own route module to call `podManager.createPod` when a new project is ready, ensure telemetry records meaningful metrics, and call `eventBus.publish` for any custom events.  
3. **Ensure fail-closed alignment** – every new pod must embed SSOT/Companion references (mission, Homo Guardian, CEthO gating, etc.), snapshot the system before structural changes, and document the decision path as a “system fact” (see `memorySystem.storeMemory`).  
4. **Hook autop loops** – use `startAutonomySchedulers` or custom schedulers to trigger pod-specific tasks (test, deploy, audit). The new `telemetry.snapshot()` helps you confirm loops are healthy.

## 4. Operator checklist
- [ ] Snapshot before any structural change (the system already creates `systemSnapshots`).  
- [ ] Document the new pod in `docs/POD_AUTONOMY_GUIDE.md` or the command-center summary.  
- [ ] Keep drones busy: once a pod completes, follow-up pods are created automatically; idle drones are parked under `maintenance` pods but can be reassigned via `/api/v1/ops/pods` or new automation rules.  
- [ ] Validate telemetry and pods via `/api/v1/ops/telemetry` and `/api/v1/ops/pods`; use the tick bus for event-driven automation (subscribe to `eventBus` topics as needed).  
- [ ] Share the new pod’s progress in the SSOT companion log (the `memorySystem` fact might say “Project X enters optimization loop, drones Y/Z assigned”).  

## 5. Example snippet (new pod)
```js
const expansionPod = podManager.createPod({
  name: "expansion-engineering",
  project: "Premium Video Builder",
  priority: 2,
  labels: ["growth"],
});
const builderDrone = podManager.registerDrone({
  label: "pkg-builder",
  skills: ["video", "orchestration"],
});
podManager.assignDroneToPod(builderDrone.id, expansionPod.id);
eventBus.publish("project:intent", {
  project: expansionPod.project,
  due: "2026-04-01"
});
```

## 6. Lessons / best practices
- Treat the pod transition trace as the “handoff token.” Each `pod:completed` event triggers telemetry and no new work until follow-up pods are seeded.  
- The new telemetry/ops routes make each pod observable—monitor their health before letting drones self-program new features.  
- Idle drones are never deleted—they belong to maintenance pods (see `ensureMaintenancePod`), and productivity is measured via telemetry histograms at `/api/v1/ops/telemetry`.  

Following this guide keeps the system aligned with the mission (speed to validated revenue + radical honesty) while constantly improving each project in a human-like release cycle. Stay within the SSOT rules: snapshot before change, document reasoning, and surface telemetry before deploying. 
