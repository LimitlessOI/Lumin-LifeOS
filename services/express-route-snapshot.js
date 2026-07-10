/**
 * SYNOPSIS: Collect mounted Express routes for boot assertions (no AI-guard side effects).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

function sanitizeLayerPath(source = "") {
  const src = String(source || "");
  // Express mounts from app.use(router) with no path → ^\/?(?=\/|$) — treat as "".
  // Without this, the broken residue polluted every nested route (e.g. "/(=/|$/factory/...").
  if (
    src === "^\\/?(?=\\/|$)"
    || src === "^(?=\\/|$)"
    || /^\^\\\/\?\(\?=\\\/\|\$\)$/.test(src)
    || /^\^\(\?=\\\/\|\$\)$/.test(src)
  ) {
    return "";
  }

  const cleaned = src
    .replace(/^\^\\\//, "/")
    .replace(/\\\/\?\(\?\=\\\/\|\$\)/, "")
    .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ":param")
    .replace(/\\\//g, "/")
    .replace(/\$$/, "")
    .replace(/\(\?\=\\\/\|\$\)/, "")
    .replace(/\(\?:\[\^\\\/]\+\?\)/g, ":param")
    .replace(/\\\./g, ".")
    .replace(/\(\?:\(\.\*\)\)\?/g, "")
    .replace(/\(\.\*\)/g, "*")
    .replace(/\?/g, "")
    .replace(/\(\?:/g, "")
    .replace(/\)/g, "");

  if (!cleaned || cleaned === "/" || cleaned === "(=/|$") {
    return "";
  }

  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function joinPaths(base, addition) {
  const normalize = (value) =>
    (value || "")
      .toString()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

  const baseClean = normalize(base);
  const additionClean = normalize(addition);

  if (!baseClean && !additionClean) return "/";
  if (!baseClean) return `/${additionClean}`;
  if (!additionClean) return `/${baseClean}`;
  return `/${baseClean}/${additionClean}`;
}

export function collectExpressRoutes(stack = [], parentPath = "") {
  const routes = [];

  for (const layer of stack || []) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      const methods = Object.keys(layer.route.methods || {}).map((method) =>
        method.toUpperCase()
      );

      for (const method of methods) {
        for (const routePath of routePaths) {
          if (!routePath && !parentPath) {
            routes.push(`${method} /`);
            continue;
          }
          routes.push(`${method} ${joinPaths(parentPath, routePath)}`);
        }
      }
    }

    if (layer.name === "router" && layer.handle?.stack) {
      const nestedPrefix = sanitizeLayerPath(layer.regexp?.source);
      const childPrefix = nestedPrefix
        ? joinPaths(parentPath, nestedPrefix)
        : parentPath;
      routes.push(...collectExpressRoutes(layer.handle.stack, childPrefix));
    }
  }

  return routes;
}

export function listAppRoutes(app) {
  const stack = app?._router?.stack || [];
  return [...new Set(collectExpressRoutes(stack))].sort();
}
