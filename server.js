/**
 * SYNOPSIS: BuilderOS runtime bootstrap entry.
 * @authority Legacy production spine — bootstrap only.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ⛔  COMPOSITION ROOT — DO NOT ADD FEATURE CODE HERE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This file exists for one job only: choose the correct runtime lane for
 * `node server.js` without importing the wrong module graph first.
 *
 * Founder-builder lane:
 * - minimal import graph
 * - founder shell, direct action, builder routes
 * - fast liveness for Railway and local alpha work
 *
 * Full runtime lane:
 * - legacy/full product surface
 * - broad product boots, schedulers, extended route graph
 *
 * The heavy implementations live beside this bootstrap:
 * - `server-founder-runtime.js`
 * - `server-full-runtime.js`
 *
 * Rules:
 * - no feature logic here
 * - no route mounting here
 * - no background jobs here
 * - no product initialization here
 * - preserve `export const pool` and `export default app` compatibility
 */

import { getRuntimeProfile, isFullRuntimeProfile } from "./services/runtime-modes.js";

const runtimeProfile = getRuntimeProfile();

const runtimeModule = isFullRuntimeProfile()
  ? await import("./server-full-runtime.js")
  : await import("./server-founder-runtime.js");

export const pool = runtimeModule.pool;
export default runtimeModule.default;

if (process.env.NODE_ENV !== "test") {
  const lane = isFullRuntimeProfile() ? "full" : "founder_builder";
  console.log(`[BOOTSTRAP] server.js selected runtime lane: ${lane} (${runtimeProfile})`);
}
