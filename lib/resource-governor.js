/**
 * lib/resource-governor.js
 *
 * Minimal, safe implementation to satisfy server expectations.
 * - Provides Express middleware
 * - Exposes: noteRequest(), isAutonomyPaused(), setAutonomyPaused()
 * - Designed to be "fail-open" (never blocks requests) unless you explicitly pause.
 */

let paused = false;

// lightweight counters (optional, but useful if you later want to display them)
const stats = {
  startedAt: Date.now(),
  totalRequests: 0,
  byPath: new Map(),
};

function noteRequest(req) {
  try {
    stats.totalRequests += 1;
    const key = req?.path || req?.url || "unknown";
    stats.byPath.set(key, (stats.byPath.get(key) || 0) + 1);
  } catch {
    // never throw
  }
}

function isAutonomyPaused() {
  return paused === true;
}

function setAutonomyPaused(next) {
  paused = next === true;
}

let heavyLeaseCount = 0;

function acquireHeavyLease() {
  heavyLeaseCount += 1;
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      heavyLeaseCount = Math.max(0, heavyLeaseCount - 1);
    },
  };
}

async function runOllamaTask(fn) {
  if (typeof fn !== "function") {
    throw new Error("runOllamaTask requires a function");
  }

  const lease = acquireHeavyLease();
  try {
    return await fn();
  } finally {
    lease.release();
  }
}

function getStats() {
  // return a JSON-friendly snapshot
  const byPathObj = {};
  for (const [k, v] of stats.byPath.entries()) byPathObj[k] = v;
  return {
    paused,
    startedAt: new Date(stats.startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - stats.startedAt) / 1000),
    totalRequests: stats.totalRequests,
    byPath: byPathObj,
  };
}

function makeMiddleware() {
  return function resourceGovernorMiddleware(req, _res, next) {
    noteRequest(req);
    return next();
  };
}

// Export a callable function (server may call it as mw or pass app)
export default function resourceGovernor(arg1, arg2, arg3) {
  const mw = makeMiddleware();

  // Attach helpers onto the exported function object
  resourceGovernor.noteRequest = noteRequest;
  resourceGovernor.isAutonomyPaused = isAutonomyPaused;
  resourceGovernor.setAutonomyPaused = setAutonomyPaused;
  resourceGovernor.getStats = getStats;

  // If called as middleware: (req,res,next)
  if (arg1 && typeof arg1 === "object" && typeof arg2 === "object" && typeof arg3 === "function") {
    return mw(arg1, arg2, arg3);
  }

  // If called with an Express app: resourceGovernor(app)
  if (arg1 && typeof arg1.use === "function") {
    arg1.use(mw);
    return mw;
  }

  return mw;
}

// Ensure helpers exist even before first call
resourceGovernor.noteRequest = noteRequest;
resourceGovernor.isAutonomyPaused = isAutonomyPaused;
resourceGovernor.setAutonomyPaused = setAutonomyPaused;
resourceGovernor.getStats = getStats;
resourceGovernor.acquireHeavyLease = acquireHeavyLease;
resourceGovernor.runOllamaTask = runOllamaTask;
