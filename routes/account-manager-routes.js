/**
 * SYNOPSIS: account-manager-routes.js — managed accounts + LifeOS connect guide APIs.
 * Mounted at: /api/v1/accounts
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from "express";
import { createSignupAgent, SIGNUP_RECIPES } from "../core/signup-agent.js";
import { createAccountManager } from "../services/account-manager.js";
import { buildConnectGuide, imapCredsForEmail, inboxUrlForEmail } from "../services/lifeos-connect-guide.js";
import {
  waitForVerificationEmail,
  findRecentVerificationEmail,
  findVerificationLink,
} from "../services/email-reader.js";
import { createSession } from "../services/browser-agent.js";

export function createAccountManagerRoutes({ requireKey, accountManager, pool, logger = console } = {}) {
  if (typeof requireKey !== "function") {
    throw new Error("createAccountManagerRoutes requires requireKey middleware");
  }
  if (!accountManager || typeof accountManager.listAccounts !== "function") {
    throw new Error("createAccountManagerRoutes requires accountManager");
  }
  const router = express.Router();
  const signupAgent = createSignupAgent({ pool, accountManager, logger });

  async function findAccount(service, emailHint = null) {
    if (emailHint) {
      const direct = await accountManager.getAccount(service, emailHint);
      if (direct) return direct;
    }
    const all = await accountManager.listAccounts();
    const matches = all.filter((a) => a.service_name === service);
    if (!matches.length) return null;
    matches.sort((a, b) => Number(b.id) - Number(a.id));
    const top = matches[0];
    return accountManager.getAccount(service, top.email_used);
  }

  router.get("/", requireKey, async (req, res) => {
    try {
      const status = req.query.status || null;
      const accounts = await accountManager.listAccounts({ status });
      res.json({ ok: true, accounts, count: accounts.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get("/status", requireKey, async (req, res) => {
    try {
      const status = await accountManager.getStatus();
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get("/attention", requireKey, async (req, res) => {
    try {
      const all = await accountManager.listAccounts();
      const attention = all.filter(
        (a) =>
          a.human_required ||
          a.captcha_required ||
          ["needs_human", "email_sent", "awaiting_consent", "paying"].includes(a.status),
      );
      const items = attention.map((a) => ({
        ...a,
        guide: buildConnectGuide(a),
      }));
      res.json({ ok: true, items, count: items.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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

  router.post("/connect", requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const url = String(body.url || "").trim();
      const service = String(body.service || body.serviceName || "").trim() || null;
      if (!url && !service) {
        return res.status(400).json({ ok: false, error: "url or service is required" });
      }
      const email =
        body.email ||
        (body.preferWorkEmail === false
          ? process.env.GMAIL_SIGNUP_EMAIL
          : process.env.WORK_EMAIL || process.env.GMAIL_SIGNUP_EMAIL);

      if (service && SIGNUP_RECIPES[service]) {
        res.status(202).json({
          ok: true,
          mode: "recipe",
          service,
          message: `Signup started for ${service}`,
          guide_page: "lifeos-connect.html",
          shell_action: { type: "navigate", page: "lifeos-connect.html" },
        });
        signupAgent.signup(SIGNUP_RECIPES[service], { emailOverride: email, dryRun: !!body.dryRun }).catch((err) => {
          logger.warn?.("[ACCOUNT-ROUTES] connect recipe failed", { error: err.message });
        });
        return;
      }

      if (!url) return res.status(400).json({ ok: false, error: "url is required for open connect" });

      const base = `${req.protocol}://${req.get("host")}`;
      const signupUrl = `${base}/api/v1/browser-agent/signup`;
      res.status(202).json({
        ok: true,
        mode: "browser_agent",
        url,
        service: service || null,
        email,
        message: "Connect started — LifeOS Connect shows guided steps if a human click is required",
        guide_page: "lifeos-connect.html",
        shell_action: { type: "navigate", page: "lifeos-connect.html" },
      });

      try {
        const key = req.get("x-command-key") || req.get("x-lifeos-key") || "";
        await fetch(signupUrl, {
          method: "POST",
          headers: { "content-type": "application/json", "x-command-key": key },
          body: JSON.stringify({
            url,
            serviceName: service,
            email,
            founder_authority: body.founder_authority !== false,
            planHint: body.planHint || null,
          }),
        });
      } catch (err) {
        logger.warn?.("[ACCOUNT-ROUTES] connect proxy signup failed", { error: err.message });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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
    if (!process.env.GMAIL_SIGNUP_APP_PASSWORD && !process.env.WORK_EMAIL_APP_PASSWORD && !dryRun) {
      return res.status(503).json({
        ok: false,
        error: "No signup IMAP password set — cannot verify accounts",
      });
    }
    const jobId = `signup-${service}-${Date.now()}`;
    res.json({ ok: true, jobId, message: `Signup started for ${service}`, service, dryRun });
    signupAgent.signup(recipe, { dryRun, emailOverride: email }).catch((err) => {
      logger.warn?.(`[ACCOUNT-ROUTES] signup job ${jobId} failed: ${err.message}`);
    });
  });

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
        notes: notes || `Manually stored on ${new Date().toISOString().slice(0, 10)}`,
        accountId: metadata?.accountId || null,
        lastAction: "manual_store",
        metadata,
      });
      res.json({ ok: true, message: `Credentials stored for ${service}`, id: account.id });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get("/:service/guide", requireKey, async (req, res) => {
    try {
      const account = await findAccount(req.params.service, req.query.email || null);
      if (!account) return res.status(404).json({ ok: false, error: "Account not found" });
      const { password: _p, apiKey: _a, ...safe } = account;
      res.json({ ok: true, account: safe, guide: buildConnectGuide(safe) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post("/:service/reveal", requireKey, async (req, res) => {
    try {
      const field = String(req.body?.field || req.query.field || "").toLowerCase();
      if (!["password", "apikey", "api_key"].includes(field)) {
        return res.status(400).json({ ok: false, error: "field must be password or apiKey" });
      }
      const account = await findAccount(req.params.service, req.body?.email || req.query.email || null);
      if (!account) return res.status(404).json({ ok: false, error: "Account not found" });
      const value = field === "password" ? account.password : account.apiKey;
      if (!value) return res.status(404).json({ ok: false, error: `${field} not stored` });
      await accountManager.logAction({
        accountId: account.id,
        serviceName: account.service_name,
        action: "secret_reveal",
        status: "ok",
        details: { field: field === "password" ? "password" : "apiKey" },
      });
      res.json({
        ok: true,
        field: field === "password" ? "password" : "apiKey",
        value,
        hint: field === "password" ? account.maskedPassword : account.api_key_hint,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post("/:service/resume-verify", requireKey, async (req, res) => {
    try {
      const account = await findAccount(req.params.service, req.body?.email || req.query.email || null);
      if (!account) return res.status(404).json({ ok: false, error: "Account not found" });
      const host = (() => {
        try {
          return new URL(account.service_url || "https://example.com").hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      })();
      const imap = imapCredsForEmail(account.email_used);
      if (!imap.appPassword) {
        return res.status(503).json({
          ok: false,
          error: "IMAP password missing for this mailbox",
          inboxUrl: inboxUrlForEmail(account.email_used),
          guide: buildConnectGuide(account),
        });
      }
      // Look back from account creation (not a 30-min window) — resume often runs hours later.
      const createdAt = account.created_at ? new Date(account.created_at) : null;
      const floorMs = Date.now() - 48 * 3600 * 1000;
      const createdMs =
        createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.getTime() - 15 * 60 * 1000
          : floorMs;
      const since = new Date(Math.max(floorMs, createdMs));
      let emailResult = await findRecentVerificationEmail({
        email: imap.email,
        appPassword: imap.appPassword,
        fromDomain: host,
        subjectContains: account.service_name || null,
        since,
        logger,
      });
      if (!emailResult) {
        emailResult = await waitForVerificationEmail({
          email: imap.email,
          appPassword: imap.appPassword,
          fromDomain: host,
          since,
          timeoutMs: 45_000,
          logger,
        });
      }
      if (!emailResult) {
        return res.status(404).json({
          ok: false,
          error: "Verification email not found yet",
          since: since.toISOString(),
          inboxUrl: inboxUrlForEmail(account.email_used),
          guide: buildConnectGuide(account),
        });
      }
      const verifyLink = findVerificationLink(emailResult.links, { preferDomain: host });
      if (!verifyLink) {
        return res.status(404).json({ ok: false, error: "No verify link in email", subject: emailResult.subject });
      }
      const session = await createSession({ logger });
      await session.navigate(verifyLink);
      await session.page.waitForTimeout(3000);
      const screenshotPath = await session.screenshot(`${account.service_name}-verify`).catch(() => null);
      await session.close().catch(() => {});
      await accountManager.upsertAccount({
        serviceName: account.service_name,
        emailUsed: account.email_used,
        status: "active",
        verifiedAt: new Date(),
        humanRequired: false,
        lastAction: "resume_verify_clicked",
        metadata: { ...(account.metadata || {}), verifyLinkHost: host },
      });
      await accountManager.logAction({
        accountId: account.id,
        serviceName: account.service_name,
        action: "resume_verify",
        status: "ok",
        details: { subject: emailResult.subject },
        screenshotPath,
      });
      res.json({
        ok: true,
        status: "active",
        message: "Verification link opened by system",
        guide: buildConnectGuide({ ...account, status: "active", verified_at: new Date().toISOString() }),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get("/:service", requireKey, async (req, res) => {
    try {
      const account = await findAccount(req.params.service, req.query.email || null);
      if (!account) {
        return res.status(404).json({ ok: false, error: "Account not found" });
      }
      const { password: _p, apiKey: _a, ...safe } = account;
      res.json({ ok: true, account: safe, guide: buildConnectGuide(safe) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get("/:service/log", requireKey, async (req, res) => {
    try {
      const account = await findAccount(req.params.service, req.query.email || null);
      if (!account) {
        return res.status(404).json({ ok: false, error: "Account not found" });
      }
      const log = await accountManager.getLog(account.id, req.query.limit);
      res.json({ ok: true, log, count: log.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.patch("/:service", requireKey, async (req, res) => {
    try {
      const existing = await findAccount(req.params.service, req.query.email || req.body?.email || null);
      const email = existing?.email_used || req.query.email || process.env.GMAIL_SIGNUP_EMAIL;
      const { status, notes, accountId: extId, humanRequired, lastAction } = req.body || {};
      const account = await accountManager.upsertAccount({
        serviceName: req.params.service,
        emailUsed: email,
        status,
        notes,
        accountId: extId,
        humanRequired,
        lastAction: lastAction || "manual_update",
      });
      res.json({ ok: true, account });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function registerAccountManagerRoutes(app, deps = {}) {
  const { requireKey, pool, logger = console, accountManager } = deps;
  if (typeof requireKey !== "function") {
    throw new Error("registerAccountManagerRoutes requires requireKey");
  }
  const mgr =
    accountManager && typeof accountManager.listAccounts === "function"
      ? accountManager
      : pool
        ? createAccountManager({ pool, logger })
        : null;
  if (!mgr) {
    throw new Error("registerAccountManagerRoutes requires accountManager or pool");
  }
  app.use(
    "/api/v1/accounts",
    createAccountManagerRoutes({ requireKey, accountManager: mgr, pool, logger }),
  );
}

export default createAccountManagerRoutes;
