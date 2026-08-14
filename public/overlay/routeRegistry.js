/**
 * SYNOPSIS: LifeOS overlay UI — RouteRegistry.
 */
const ROUTE_CONTEXT_MAP = {
  '/insurance-portal': 'insurance',
  '/banking-site': 'banking',
  '/generic-form': 'form',
  // Add other routes and their contexts here
};

function lookupRouteContext(path) {
  for (const routePattern in ROUTE_CONTEXT_MAP) {
    if (path.startsWith(routePattern)) {
      return ROUTE_CONTEXT_MAP[routePattern];
    }
  }
  return 'default'; // Fallback context
}

export { ROUTE_CONTEXT_MAP, lookupRouteContext };