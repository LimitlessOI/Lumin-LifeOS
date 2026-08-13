/**
 * SYNOPSIS: Live HTTP surface for the Capability Registry (§15).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 * Live HTTP surface for the Capability Registry (§15).
 */
import { createCapabilityRegistryService } from "../services/taloa/capability-registry-service.js";

export function registerTaloaCapabilityRegistryRoutes(app, deps) {
  const service = createCapabilityRegistryService(deps);

  app.post("/api/v1/capabilities/report", deps.requireKey, (req, res) => {
    const { body_id, capabilities, reported_at } = req.body || {};

    if (!body_id || !capabilities || !reported_at) {
      return res.status(400).json({ error: "body_id, capabilities, and reported_at are required" });
    }

    try {
      const row = service.reportCapabilities({ body_id, capabilities, reported_at });
      return res.status(200).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/v1/capabilities/report", deps.requireKey, (req, res) => {
    const { body_id } = req.query;

    if (!body_id) {
      return res.status(400).json({ error: "body_id query parameter is required" });
    }

    try {
      const row = service.getCapabilities(body_id);
      if (!row) {
        return res.status(404).json({ error: "No capability report found for body_id" });
      }
      return res.status(200).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
}