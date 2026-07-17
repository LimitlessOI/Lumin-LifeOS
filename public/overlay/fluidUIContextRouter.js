/**
 * SYNOPSIS: Exports resolveViewByUrlPattern — public/overlay/fluidUIContextRouter.js.
 */
import { parse } from 'url';

const routes = [
  { pattern: '/home', view: 'HomeView' },
  { pattern: '/about', view: 'AboutView' },
  { pattern: '/contact', view: 'ContactView' }
];

export function resolveViewByUrlPattern(url) {
  const parsedUrl = parse(url);
  const route = routes.find(route => route.pattern === parsedUrl.pathname);
  return route ? route.view : null;
}
