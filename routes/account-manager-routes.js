/**
 * account-manager-routes.js
 * API for the autonomous signup agent and credential vault.
 *
 * Mounted at: /api/v1/accounts
 *
 * Endpoints:
 *   GET  /                    — list all managed accounts
 *   GET  /status              — summary counts by status
 *   GET  /:service            — get single account details
 *   GET  /:service/log        — action log for account
 *   POST /signup              — trigger autonomous signup for one service
 *   POST /signup/batch        — trigger signups for multiple services
 *   PATCH /:service           — manually update account (status, notes, etc.)
 *   GET  /recipes             — list all available signup recipes
 */

import express from "express";
import { createSignupAgent, SIGNUP_RECIPES } from "../core/signup-agent.js";

export function createAccountManagerRoutes({ requireKey, accountManager, pool, logger = console }) {
  const router = express.Router();
  const signupAgent = createSignupAgent({ pool, accountManager, logger });

  // List all managed accounts (no secrets returned)
  router.get("/", requireKey, async (req, res) => {
    try {
      const status = req.query.status || null;
      const accounts = await accountManager.listAccounts({ status });
      res.json({ ok: true, accounts, count: accounts.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Status summary
  router.get("/status", requireKey, async (req, res) => {
    try {
      const status = await accountManager.getStatus();
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // List available signup recipes
  router.get("/recipes", requireKey, (req, res) => {
    const recipes = Object.entries(SIGNUP_RECIPES).map(([key, r]) => ({
      key,
      name: r.name,
      url: r.url,
      plan: r.plan || null,
      requiresManualApproval: r.requiresManualApproval || false,
    }));
    res.json({ ok: true, recipes, count: recipes.length });
  });

  // Trigger a signup for a single service
  router.post("/signup", requireKey, async (req, res) => {
    const { service, dryRun = false, email = null } = req.body || {};
    if (!service) {
      return res.status(400).json({ ok: false, error: "service is required" });
    }
    const recipe = SIGNUP_RECIPES[service];
    if (!recipe) {
      return res.status(400).json({
        ok: false,
        error: `Unknown service: ${service}. Available: ${Object.keys(SIGNUP_RECIPES).join(", ")}`,
      });
    }
    if (!process.env.GMAIL_SIGNUP_APP_PASSWORD && !dryRun) {
      return res.status(503).json({
        ok: false,
        error: "GMAIL_SIGNUP_APP_PASSWORD not set — email reader cannot verify accounts",
      });
    }
    // Run async — return immediately with job started
    const jobId = `signup-${service}-${Date.now()}`;
    res.json({ ok: true, jobId, message: `Signup started for ${service}`, service, dryRun });

    // Fire and forget (result stored in DB)
    signupAgent.signup(recipe, { dryRun, emailOverride: email }).catch((err) => {
      logger.warn?.(`[ACCOUNT-ROUTES] signup job ${jobId} failed: ${err.message}`);
    });
  });

  // Trigger signups for multiple services
  router.post("/signup/batch", requireKey, async (req, res) => {
    const { services, dryRun = false } = req.body || {};
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ ok: false, error: "services must be a non-empty array" });
    }
    const unknown = services.filter((s) => !SIGNUP_RECIPES[s]);
    if (unknown.length > 0) {
      return res.status(400).json({ ok: false, error: `Unknown services: ${unknown.join(", ")}` });
    }
    const jobId = `batch-signup-${Date.now()}`;
    res.json({ ok: true, jobId, message: `Batch signup started for: ${services.join(", ")}`, services, dryRun });

    signupAgent.signupAll(services, { dryRun }).catch((err) => {
      logger.warn?.(`[ACCOUNT-ROUTES] batch signup job ${jobId} failed: ${err.message}`);
    });
  });

  // Get single account (redacts password/apiKey)
  router.get("/:service", requireKey, async (req, res) => {
    try {
      const email = req.query.email || process.env.GMAIL_SIGNUP_EMAIL;
      const account = await accountManager.getAccount(req.params.service, email);
      if (!account) {
        return res.status(404).json({ ok: false, error: "Account not found" });
      }
      // Never return decrypted secrets via API
      const { password: _p, apiKey: _a, ...safe } = account;
      res.json({ ok: true, account: safe });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get action log for an account
  router.get("/:service/log", requireKey, async (req, res) => {
    try {
      const email = req.query.email || process.env.GMAIL_SIGNUP_EMAIL;
      const account = await accountManager.getAccount(req.params.service, email);
      if (!account) {
        return res.status(404).json({ ok: false, error: "Account not found" });
      }
      const log = await accountManager.getLog(account.id, req.query.limit);
      res.json({ ok: true, log, count: log.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Store credentials manually (for accounts not created via signup agent)
  router.post("/store", requireKey, async (req, res) => {
    try {
      const { service, email, username, password, apiKey, metadata, notes } = req.body || {};
      if (!service) return res.status(400).json({ ok: false, error: "service is required" });
      if (!password && !apiKey) return res.status(400).json({ ok: false, error: "password or apiKey is required" });
      const account = await accountManager.upsertAccount({
        serviceName: service,
        emailUsed: email || username || service,
        username: username || email,
        password,
        apiKey,
        status: "active",
        notes: notes || `Manually stored on ${new Date().toISOString().slice(0,10)}`,
        accountId: metadata?.accountId || null,
        lastAction: "manual_store",
        metadata,
      });
      res.json({ ok: true, message: `Credentials stored for ${service}`, id: account.id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Manually update account status/notes
  router.patch("/:service", requireKey, async (req, res) => {
    try {
      const email = req.query.email || process.env.GMAIL_SIGNUP_EMAIL;
      const { status, notes, accountId: extId } = req.body || {};
      const account = await accountManager.upsertAccount({
        serviceName: req.params.service,
        emailUsed: email,
        status,
        notes,
        accountId: extId,
        lastAction: "manual_update",
      });
      res.json({ ok: true, account });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default createAccountManagerRoutes;
