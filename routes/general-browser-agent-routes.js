/**
 * SYNOPSIS: Founder-lane browser agent — any-site goals + founder-authorized account signup.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import fs from 'fs';
import { execFileSync } from 'child_process';
import { createAccountManager } from '../services/account-manager.js';
import { createTCBrowserAgent } from '../services/tc-browser-agent.js';
import { runGoalOnSession } from '../services/general-browser-agent-live.js';
import { getChromiumLaunchOptions, createSession, probeLaunchConfigs } from '../services/browser-agent.js';
import { createBrowserSignupOrchestrator } from '../services/browser-signup-orchestrator.js';
import { evaluateFounderPaymentReadiness } from '../services/founder-payment-vault.js';

export function registerGeneralBrowserAgentRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const pool = deps.pool;
  const logger = deps.logger ?? console;

  if (typeof requireKey !== 'function') {
    throw new Error('registerGeneralBrowserAgentRoutes requires deps.requireKey');
  }

  let accountManagerPromise = null;
  const getAccountManager = async () => {
    if (!accountManagerPromise) {
      accountManagerPromise = (async () => {
        const am = createAccountManager({ pool, logger });
        if (typeof am.ensureSchema === 'function') await am.ensureSchema();
        return am;
      })();
    }
    return accountManagerPromise;
  };

  let orchestratorPromise = null;
  const getOrchestrator = async () => {
    if (!orchestratorPromise) {
      orchestratorPromise = (async () => {
        const accountManager = await getAccountManager();
        return createBrowserSignupOrchestrator({ pool, accountManager, callCouncilMember, logger });
      })();
    }
    return orchestratorPromise;
  };

  app.get('/api/v1/browser-agent/diag', requireKey, async (req, res) => {
    const opts = getChromiumLaunchOptions({});
    const execPath = opts.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || null;
    const diag = {
      env_executable_path: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      chrome_bin: process.env.CHROME_BIN || null,
      resolved_executable_path: execPath,
      executable_exists: execPath ? fs.existsSync(execPath) : false,
      candidates: {},
      launch: null,
      payment_vault: evaluateFounderPaymentReadiness(),
      signup_email: process.env.GMAIL_SIGNUP_EMAIL || null,
      signup_imap_ready: Boolean(process.env.GMAIL_SIGNUP_APP_PASSWORD),
    };
    for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) {
      diag.candidates[p] = fs.existsSync(p);
    }
    const exe = execPath || '/usr/bin/chromium';
    try {
      diag.chromium_version = execFileSync(exe, ['--version'], { timeout: 10_000 }).toString().trim();
    } catch (err) {
      diag.chromium_version = { error: String(err.message || err).split('\n')[0] };
    }
    try {
      const ldd = execFileSync('ldd', [exe], { timeout: 10_000 }).toString();
      diag.ldd_missing = ldd.split('\n').filter((l) => /not found/.test(l)).map((l) => l.trim());
    } catch (err) {
      diag.ldd_missing = { error: String(err.message || err).split('\n')[0] };
    }
    let session = null;
    try {
      session = await createSession();
      const obs = await session.observe?.().catch(() => null);
      diag.launch = { ok: true, url: obs?.url ?? null };
    } catch (err) {
      diag.launch = { ok: false, error: err.message };
    } finally {
      if (session?.close) await session.close().catch(() => {});
    }
    if (String(req.query.matrix ?? '1') !== '0') {
      try {
        diag.launch_matrix = await probeLaunchConfigs();
      } catch (err) {
        diag.launch_matrix = { error: err.message };
      }
    }
    return res.json(diag);
  });

  app.get('/api/v1/browser-agent/capabilities', requireKey, async (_req, res) => {
    const orchestrator = await getOrchestrator();
    res.json({
      ok: true,
      capabilities: {
        generic_browser_goal: true,
        glvar_browser_goal: true,
        founder_authority_signup: true,
        consent_gated_signup: true,
        payment_vault: evaluateFounderPaymentReadiness(),
        signup_email: process.env.GMAIL_SIGNUP_EMAIL || null,
        signup_recipes: Object.keys(orchestrator.SIGNUP_RECIPES),
      },
    });
  });

  app.post('/api/v1/browser-agent/run', requireKey, async (req, res) => {
    const {
      goal,
      url = null,
      startUrl = null,
      site = null,
      mustContain = [],
      mustHaveSelector = [],
      expectSiteHost = null,
      expectAccountText = null,
      maxSteps = 20,
    } = req.body || {};

    if (!goal || !String(goal).trim()) return res.status(400).json({ ok: false, error: 'goal is required' });
    if (typeof callCouncilMember !== 'function') {
      return res.status(503).json({ ok: false, error: 'model decider unavailable (callCouncilMember not injected)' });
    }

    let session = null;
    const screenshots = [];
    try {
      const targetUrl = url || startUrl;
      const useGlvar = site === 'glvar' && !targetUrl;

      if (useGlvar) {
        const accountManager = await getAccountManager();
        const tcBrowser = createTCBrowserAgent({ accountManager, logger });
        const login = await tcBrowser.loginToGLVAR(false);
        session = login.session;
      } else {
        if (!targetUrl) {
          return res.status(400).json({ ok: false, error: 'url or startUrl required (or site: glvar for MLS login)' });
        }
        session = await createSession({ logger });
      }

      const callModel = (member, prompt) => callCouncilMember(member, prompt, { taskType: 'browser_agent' });
      const host = targetUrl ? new URL(targetUrl).hostname.replace(/^www\./, '') : expectSiteHost;

      const result = await runGoalOnSession({
        session,
        goal: String(goal),
        startUrl: targetUrl || startUrl,
        callModel,
        tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'],
        mustContain,
        mustHaveSelector,
        expectSiteHost: host || expectSiteHost,
        expectAccountText,
        maxSteps: Math.min(Number(maxSteps) || 20, 30),
        onScreenshot: ({ step, screenshot }) => { if (screenshot) screenshots.push({ step, screenshot }); },
        logger,
      });

      return res.json({
        ok: result.ok,
        reached: result.reached,
        reason: result.reason,
        evidence: result.evidence,
        template: result.template,
        steps: result.steps,
        screenshots,
      });
    } catch (err) {
      logger.error?.({ err: err.message }, '[BROWSER-AGENT] run failed');
      return res.status(500).json({ ok: false, error: err.message, screenshots });
    } finally {
      if (session?.close) await session.close().catch(() => {});
    }
  });

  /**
   * POST /api/v1/browser-agent/signup
   * Body: { url, service?, planHint?, expectedCost?, email?, dryRun?, founder_authority? }
   * founder_authority:true (or founderAuthority) = full authority including card from Railway vault.
   */
  app.post('/api/v1/browser-agent/signup', requireKey, async (req, res) => {
    try {
      const orchestrator = await getOrchestrator();
      const body = req.body || {};
      const founderAuthority = body.founder_authority === true || body.founderAuthority === true;

      if (!process.env.GMAIL_SIGNUP_APP_PASSWORD && !body.dryRun && !body.skipEmailVerify) {
        return res.status(503).json({
          ok: false,
          error: 'GMAIL_SIGNUP_APP_PASSWORD not set — cannot verify signup emails',
        });
      }

      if (body.recipe || (body.service && orchestrator.SIGNUP_RECIPES[body.service])) {
        const key = body.recipe || body.service;
        res.status(202).json({ ok: true, message: `Signup started for recipe ${key}`, recipe: key });
        orchestrator.runKnownRecipe(key, { emailOverride: body.email, dryRun: body.dryRun }).catch((err) => {
          logger.warn?.('[BROWSER-AGENT] recipe signup failed', { error: err.message });
        });
        return;
      }

      if (body.dryRun) {
        const result = await orchestrator.runSignup({ ...body, founderAuthority });
        return res.json(result);
      }

      if (!body.url) return res.status(400).json({ ok: false, error: 'url is required' });

      res.status(202).json({
        ok: true,
        message: founderAuthority
          ? 'Founder-authorized signup started — will complete payment from vault if needed'
          : 'Signup job started — stops at payment for consent unless founder_authority:true',
        url: body.url,
        founder_authority: founderAuthority,
      });

      orchestrator.startSignup({ ...body, founderAuthority }).then((result) => {
        logger.info?.('[BROWSER-AGENT] signup finished', { status: result.status, service: result.service });
      }).catch((err) => {
        logger.error?.('[BROWSER-AGENT] signup failed', { error: err.message });
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/browser-agent/signup/sync', requireKey, async (req, res) => {
    try {
      const orchestrator = await getOrchestrator();
      const body = req.body || {};
      const founderAuthority = body.founder_authority === true || body.founderAuthority === true;
      const result = await orchestrator.startSignup({ ...body, founderAuthority });
      const code = result.status === 'awaiting_consent' || result.ok ? 200 : 400;
      return res.status(code).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/browser-agent/signup/approve', requireKey, async (req, res) => {
    try {
      const orchestrator = await getOrchestrator();
      const body = req.body || {};
      if (body.approved !== true) {
        return res.status(400).json({
          ok: false,
          error: 'Set approved:true after you agree to the proposed plan and cost',
        });
      }
      const result = await orchestrator.approveSignup(body);
      return res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/browser-agent/setup/google-youtube-oauth', requireKey, async (req, res) => {
    try {
      const orchestrator = await getOrchestrator();
      const result = await orchestrator.setupGoogleYoutubeOauth({
        redirectUri: req.body?.redirectUri || null,
      });
      const code = result.ok ? 200 : (result.status === 'needs_human' || result.status === 'blocked' ? 409 : 500);
      return res.status(code).json({
        ok: !!result.ok,
        ...result,
        note: 'Passwords are read from Railway env on tip only and never returned in this response.',
      });
    } catch (err) {
      logger.error?.({ err: err.message }, '[BROWSER-AGENT] google youtube oauth setup failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  logger.info?.('✅ [BROWSER-AGENT] Routes: /run, /signup, /signup/sync, /signup/approve, /setup/google-youtube-oauth, /capabilities, /diag');
}

export default registerGeneralBrowserAgentRoutes;
