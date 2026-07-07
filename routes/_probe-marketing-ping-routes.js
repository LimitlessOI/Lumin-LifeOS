// SYNOPSIS: Exposes a health check endpoint for MarketingOS.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

export function registerProbePing(app, deps) {
  app.get("/api/v1/marketing/_probe_ping", (req, res) => res.json({ ok: true }));
}

export default registerProbePing;