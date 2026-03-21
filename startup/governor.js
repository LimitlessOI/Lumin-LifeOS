import resourceGovernor from "../lib/resource-governor.js";

function getGovernorFunction(name) {
  return (
    (resourceGovernor && typeof resourceGovernor[name] === "function" && resourceGovernor[name]) ||
    (resourceGovernor?.default && typeof resourceGovernor.default[name] === "function" && resourceGovernor.default[name]) ||
    null
  );
}

export function acquireGovernorHeavyLease() {
  const fn = getGovernorFunction("acquireHeavyLease");
  if (fn) {
    return fn();
  }
  return { release: () => {} };
}

export async function runGovernorOllamaTask(fn) {
  const wrapper = getGovernorFunction("runOllamaTask");
  if (wrapper) {
    return await wrapper(fn);
  }
  return await fn();
}

export function isGovernorAutonomyPaused() {
  const fn = getGovernorFunction("isAutonomyPaused");
  if (fn) return !!fn();
  return false;
}

export default {
  acquireGovernorHeavyLease,
  runGovernorOllamaTask,
  isGovernorAutonomyPaused,
};
