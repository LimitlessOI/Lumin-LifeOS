/**
 * SYNOPSIS: Registers OptionalBoldTrailTestContactCleanupRoutes routes/handlers (routes/optionalBoldTrailTestContactCleanupRoutes.js).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
[
  {
    "old_string": "import { cleanUpTestContacts as cleanupTestContacts } from '../services/optionalBoldTrailTestContactCleanupService.js';",
    "new_string": "import { cleanUpTestContacts as cleanupTestContacts } from '../services/optionalBoldTrailTestContactCleanupService.js';\n\nexport function registerOptionalBoldTrailTestContactCleanupRoutes(app, ctx = {}) {\n  const { requireKey, pool } = ctx;\n  const auth = requireKey || ((_req, res) => res.status(503).json({ ok: false, error: 'auth_middleware_unavailable' }));\n\n  app.delete('/api/v1/lifeos/boldtrail/testcontacts/cleanup', auth, async (req, res) => {\n    try {\n      const { confirm, ...rest } = req.body || {};\n      const result = await cleanupTestContacts({ pool, confirm: confirm !== false, ...rest });\n      res.json({ ok: true, result });\n    } catch (error) {\n      res.status(500).json({ ok: false, error: error.message });\n    }\n  });\n}\n\nexport { registerOptionalBoldTrailTestContactCleanupRoutes };"
  }
]
