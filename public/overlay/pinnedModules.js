/**
 * SYNOPSIS: Registers PinnedModules routes/handlers (public/overlay/pinnedModules.js).
 */
const pinnedModules = new Set();

export function registerPinnedModules(moduleList) {
  moduleList.forEach(module => pinnedModules.add(module));
}

export function getPinnedModules() {
  return Array.from(pinnedModules);
}

export function enableSplitView() {
  // Logic to enable split view for pinned modules
  console.log('Split view enabled for pinned modules');
}
