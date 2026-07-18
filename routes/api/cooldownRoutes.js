/**
 * SYNOPSIS: HTTP route module — CooldownRoutes.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import express from 'express';

const cooldowns = new Map();

function getCooldown(provider) {
  return cooldowns.get(provider) || 0;
}

function setCooldown(provider, cooldown) {
  cooldowns.set(provider, cooldown);
}

function registerCooldownRoutes(app) {
  const router = express.Router();

  router.get('/cooldowns/:provider', (req, res) => {
    const provider = req.params.provider;
    const cooldown = getCooldown(provider);
    res.json({ provider, cooldown });
  });

  router.post('/cooldowns/:provider', (req, res) => {
    const provider = req.params.provider;
    const { cooldown } = req.body;
    setCooldown(provider, cooldown);
    res.status(200).send(`Cooldown for ${provider} set to ${cooldown}`);
  });

  app.use('/api', router);
}

export { registerCooldownRoutes };
