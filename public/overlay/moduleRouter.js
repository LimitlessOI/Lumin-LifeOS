/**
 * SYNOPSIS: Exports routeUIContext — public/overlay/moduleRouter.js.
 */
const routes = [
  { pattern: /^\/home/, context: 'homeView' },
  { pattern: /^\/profile/, context: 'profileView' },
  { pattern: /^\/settings/, context: 'settingsView' },
  { pattern: /^\/about/, context: 'aboutView' }
];

function matchRoute(url) {
  for (const route of routes) {
    if (route.pattern.test(url)) {
      return route.context;
    }
  }
  return 'defaultView';
}

export function routeUIContext(url) {
  return matchRoute(url);
}

export { matchRoute };
