/**
 * SYNOPSIS: Registers PASSQuoteRoutes routes/handlers (routes/passQuoteRoutes.js).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
[
  {
    "old_string": "import express from 'express';\nimport { confirmPASSQuote } from '../services/passQuoteService.js';\n\nconst router = express.Router();\n\nrouter.post('/confirm-pass-quote', async (req, res) => {\n  try {\n    const confirmationResult = await confirmPASSQuote(req.body);\n    res.status(200).json(confirmationResult);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nexport function registerPASSQuoteRoutes(app) {\n  app.use('/api', router);\n}",
    "new_string": "import express from 'express';\nimport { confirmPASSQuote } from '../services/passQuoteService.js';\n\nconst router = express.Router();\n\nrouter.post('/confirm-pass-quote', async (req, res) => {\n  try {\n    const confirmationResult = await confirmPASSQuote(req.body);\n    res.status(200).json(confirmationResult);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nexport function registerPASSQuoteRoutes(app) {\n  app.use('/api', router);\n}\n\nexport { registerPASSQuoteRoutes };"
  }
]
