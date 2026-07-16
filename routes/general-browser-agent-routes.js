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

  /** Resolve vault row by service even when GMAIL_SIGNUP_EMAIL ≠ stored email_used. */
  async function resolveVaultAccount(accountManager, serviceName) {
    const wanted = String(serviceName || '').trim();
    if (!wanted) return null;
    const direct = await accountManager.getAccount(wanted).catch(() => null);
    if (direct?.password || direct?.apiKey) {
      return {
        ...direct,
        emailUsed: direct.emailUsed || direct.email_used,
      };
    }
    const rows = await accountManager.listAccounts().catch(() => []);
    const row = (rows || []).find((a) => String(a.service_name) === wanted)
      || (rows || []).find((a) => String(a.service_name).startsWith(wanted));
    if (!row?.email_used) return direct;
    const full = await accountManager.getAccount(row.service_name, row.email_used).catch(() => null);
    if (!full) return null;
    return {
      ...full,
      emailUsed: full.emailUsed || full.email_used || row.email_used,
    };
  }

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
      vaultService = null,
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
      let effectiveGoal = String(goal);

      if (vaultService) {
        const accountManager = await getAccountManager();
        const acct = await resolveVaultAccount(accountManager, String(vaultService));
        if (!acct?.emailUsed || !acct?.password) {
          return res.status(404).json({
            ok: false,
            error: `vaultService ${vaultService}: email/password not found`,
          });
        }
        effectiveGoal = [
          `Log in with email ${acct.emailUsed} and password ${acct.password}.`,
          'If already logged in, continue.',
          'Do not invent credentials.',
          effectiveGoal,
        ].join('\n');
      }

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
      const stepCap = Math.min(Math.max(Number(maxSteps) || 20, 1), 80);

      const result = await runGoalOnSession({
        session,
        goal: effectiveGoal,
        startUrl: targetUrl || startUrl,
        callModel,
        tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'],
        mustContain,
        mustHaveSelector,
        expectSiteHost: host || expectSiteHost,
        expectAccountText,
        maxSteps: stepCap,
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
        vaultService: vaultService || null,
        maxSteps: stepCap,
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
   * POST /api/v1/browser-agent/cloudflare-railway-dns
   * System path: create taloaos.com Railway DNS in Cloudflare via vaulted browser,
   * and/or mint+store a Zone.DNS API token then call apply-cloudflare-dns.
   */
  app.post('/api/v1/browser-agent/cloudflare-railway-dns', requireKey, async (req, res) => {
    const screenshots = [];
    let session = null;
    try {
      const tipBase = String(process.env.PUBLIC_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
      const cmdKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_COMMAND_KEY || '';
      const tokenIn = String(req.body?.token || process.env.CLOUDFLARE_API_TOKEN || '').trim();

      if (tokenIn && tipBase && cmdKey) {
        const applyRes = await fetch(`${tipBase}/api/v1/railway/managed-env/custom-domains/apply-cloudflare-dns`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-command-key': cmdKey },
          body: JSON.stringify({
            token: tokenIn,
            zoneId: req.body?.zoneId || process.env.CLOUDFLARE_ZONE_ID || undefined,
            proxied: req.body?.proxied === true,
            persistToken: true,
          }),
        });
        const applied = await applyRes.json().catch(() => ({}));
        if (applied?.ok) {
          return res.json({ ok: true, path: 'cloudflare_api', applied });
        }
      }

      const accountManager = await getAccountManager();
      const acct = await resolveVaultAccount(accountManager, 'cloudflare')
        || await resolveVaultAccount(accountManager, 'cloudflare_dns_taloaos');
      if (!acct?.emailUsed || !acct?.password) {
        return res.status(503).json({
          ok: false,
          error: 'No Cloudflare vault password — cannot drive DNS without API token or login',
          next: 'POST /accounts/store for cloudflare password, or set CLOUDFLARE_API_TOKEN',
          vault_debug: {
            signup_email_set: Boolean(process.env.GMAIL_SIGNUP_EMAIL),
          },
        });
      }
      if (typeof callCouncilMember !== 'function') {
        return res.status(503).json({ ok: false, error: 'model decider unavailable' });
      }

      // Pull live Railway recipe so the agent uses exact CNAME/TXT values
      let recipeText = '';
      if (tipBase && cmdKey) {
        try {
          const dRes = await fetch(`${tipBase}/api/v1/railway/managed-env/custom-domains`, {
            headers: { 'x-command-key': cmdKey },
          });
          const dJson = await dRes.json();
          const rows = dJson?.domains?.customDomains || [];
          recipeText = rows.map((row) => {
            const cname = (row?.status?.dnsRecords || []).find((r) => String(r.recordType || '').includes('CNAME'));
            return [
              `Host ${row.domain}:`,
              `  CNAME name=${cname?.hostlabel || row.domain} → ${cname?.requiredValue}`,
              `  TXT name=${cname?.hostlabel || row.domain} content=${row?.status?.verificationToken}`,
            ].join('\n');
          }).join('\n');
        } catch (err) {
          recipeText = `Fallback records:\nCNAME sitebuilder → nfjw1neq.up.railway.app\nTXT sitebuilder → railway-verify=73acff56d900a5552d9aba0066c5876259059826f438afd4eeac5fd367390dcb\nCNAME app → xvcywfpk.up.railway.app\nTXT app → railway-verify=4316ed9d9b47ec7d9a0351d820b083119988e90583f8dc546cc5a31b92f4ff57`;
          logger.warn?.({ err: err.message }, '[BROWSER-AGENT] custom-domains fetch failed');
        }
      }

      const goal = [
        `Log into Cloudflare with email ${acct.emailUsed} and password ${acct.password}.`,
        'Open DNS for zone taloaos.com.',
        'Create these DNS records if missing. Proxy OFF (DNS only / grey cloud):',
        recipeText || 'Use Railway custom-domain recipe for sitebuilder + app.',
        'Also set SSL/TLS encryption mode to Full if you can reach that page.',
        'PREFERRED durable path: My Profile → API Tokens → Create Token with Zone.DNS Edit on taloaos.com.',
        'If you create a token, put the raw token string alone on the final page title or a visible text box labeled CLOUDFLARE_API_TOKEN=...',
        'Stop only on captcha/2FA. Success = all four DNS records exist OR a usable API token is visible.',
      ].join('\n');

      session = await createSession({ logger });
      const callModel = (member, prompt) => callCouncilMember(member, prompt, { taskType: 'browser_agent' });
      const result = await runGoalOnSession({
        session,
        goal,
        startUrl: 'https://dash.cloudflare.com/login',
        callModel,
        tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'],
        expectSiteHost: 'dash.cloudflare.com',
        maxSteps: Math.min(Number(req.body?.maxSteps) || 70, 80),
        onScreenshot: ({ step, screenshot }) => { if (screenshot) screenshots.push({ step, screenshot }); },
        logger,
      });

      // Best-effort: only accept explicitly labeled token (never scrape random blobs)
      const blob = JSON.stringify(result || {});
      const tokenMatch = blob.match(/CLOUDFLARE_API_TOKEN=([A-Za-z0-9_\-]{30,})/);
      let applied = null;
      const maybeToken = tokenMatch?.[1] || null;
      if (maybeToken && tipBase && cmdKey) {
        try {
          await accountManager.upsertAccount({
            serviceName: 'cloudflare',
            serviceUrl: 'https://dash.cloudflare.com/',
            emailUsed: acct.emailUsed,
            apiKey: maybeToken,
            status: 'active',
            lastAction: 'api_token_captured',
          });
          const applyRes = await fetch(`${tipBase}/api/v1/railway/managed-env/custom-domains/apply-cloudflare-dns`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-command-key': cmdKey },
            body: JSON.stringify({ token: maybeToken, proxied: false, persistToken: true }),
          });
          applied = await applyRes.json().catch(() => null);
          if (applied?.ok) {
            // Persist token on Railway for future boots
            await fetch(`${tipBase}/api/v1/railway/managed-env/bulk`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-command-key': cmdKey },
              body: JSON.stringify({
                vars: {
                  CLOUDFLARE_API_TOKEN: maybeToken,
                  ...(applied?.applied?.zoneId ? { CLOUDFLARE_ZONE_ID: applied.applied.zoneId } : {}),
                },
                actor: 'browser-agent-cloudflare-railway-dns',
              }),
            }).catch(() => null);
          }
        } catch (err) {
          logger.warn?.({ err: err.message }, '[BROWSER-AGENT] token apply failed');
        }
      }

      await accountManager.upsertAccount({
        serviceName: 'cloudflare_dns_taloaos',
        serviceUrl: 'https://dash.cloudflare.com/',
        emailUsed: acct.emailUsed,
        status: (applied?.ok || result.ok) ? 'active' : 'needs_human',
        planName: 'taloaos.com Railway DNS',
        lastAction: applied?.ok ? 'dns_applied_via_api' : (result.reason || 'browser_dns_attempt'),
        humanRequired: !(applied?.ok || result.ok),
      }).catch(() => null);

      return res.json({
        ok: Boolean(applied?.ok || result.ok),
        path: applied?.ok ? 'browser_then_api' : 'browser',
        browser: {
          ok: result.ok,
          reached: result.reached,
          reason: result.reason,
          steps: result.steps,
          evidence: result.evidence,
        },
        applied,
        screenshots,
      });
    } catch (err) {
      logger.error?.({ err: err.message }, '[BROWSER-AGENT] cloudflare-railway-dns failed');
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
      const redirectUri = req.body?.redirectUri || null;
      const sync = req.body?.sync === true;

      if (!sync) {
        res.status(202).json({
          ok: true,
          status: 'started',
          message: 'Google YouTube OAuth setup started on tip browser (uses Railway email/app password in-process; never returned).',
        });
        orchestrator.setupGoogleYoutubeOauth({ redirectUri }).then((result) => {
          logger.info?.('[BROWSER-AGENT] google youtube oauth setup finished', {
            status: result.status,
            blocker: result.blocker || null,
            ok: !!result.ok,
          });
        }).catch((err) => {
          logger.error?.({ err: err.message }, '[BROWSER-AGENT] google youtube oauth setup failed');
        });
        return;
      }

      const result = await orchestrator.setupGoogleYoutubeOauth({ redirectUri });
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