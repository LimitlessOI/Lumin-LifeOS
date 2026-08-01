/**
 * SYNOPSIS: HTTP route module — Therapist Integration Routes.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
export function registerTherapistRoutes(app) {
  // setupIntegration: expose therapist integration endpoint.
  // POST /api/therapist/integration
  app.post('/api/therapist/integration', (req, res) => {
    const payload = req.body || {};
    res.status(201).json({ ok: true, setup: payload });
  });
}

export const registerTherapistIntegrationRoutes = registerTherapistRoutes;
