/**
 * SYNOPSIS: CONDUCTOR-GLUE founder-lane route module for the general goal-driven
 * browser agent. Mounts POST /api/v1/browser-agent/run, which logs into a site
 * (GLVAR today) via the existing TC browser agent and runs the PROVEN general
 * loop (services/general-browser-agent-live.js -> runGoalOnSession) toward a
 * plain-language goal, returning transcript + evidence + template + screenshots.
 * Authors NO browser logic itself — pure wiring of independently-proven modules,
 * exposed through the founder-runtime auto-register contract so it goes live on
 * prod without editing the protected composition root.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import fs from 'fs';
import { createAccountManager } from '../services/account-manager.js';
import { createTCBrowserAgent } from '../services/tc-browser-agent.js';
import { runGoalOnSession } from '../services/general-browser-agent-live.js';
import { getChromiumLaunchOptions, createSession } from '../services/browser-agent.js';

export function registerGeneralBrowserAgentRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const pool = deps.pool;
  const logger = deps.logger ?? console;

  if (typeof requireKey !== 'function') {
    throw new Error('registerGeneralBrowserAgentRoutes requires deps.requireKey');
  }

  let accountManagerPromise = null;
  const getAccountManager = () => {
    if (!accountManagerPromise) accountManagerPromise = Promise.resolve(createAccountManager({ pool, logger }));
    return accountManagerPromise;
  };

  // Diagnostic: ground-truth whether a launchable Chrome exists in THIS container.
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
    };
    for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) {
      diag.candidates[p] = fs.existsSync(p);
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
    return res.json(diag);
  });

  app.post('/api/v1/browser-agent/run', requireKey, async (req, res) => {
    const {
      goal, site = 'glvar', startUrl = null,
      mustContain = [], mustHaveSelector = [],
      expectSiteHost = null, expectAccountText = null, maxSteps = 20,
    } = req.body || {};
    if (!goal || !String(goal).trim()) return res.status(400).json({ ok: false, error: 'goal is required' });
    if (typeof callCouncilMember !== 'function') return res.status(503).json({ ok: false, error: 'model decider unavailable (callCouncilMember not injected)' });
    if (site !== 'glvar') return res.status(400).json({ ok: false, error: `unsupported site: ${site} (only glvar wired)` });

    let session = null;
    const screenshots = [];
    try {
      const accountManager = await getAccountManager();
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const login = await tcBrowser.loginToGLVAR(false);
      session = login.session;

      const callModel = (member, prompt) => callCouncilMember(member, prompt, { taskType: 'browser_agent' });
      const result = await runGoalOnSession({
        session,
        goal: String(goal),
        startUrl,
        callModel,
        tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'],
        mustContain,
        mustHaveSelector,
        expectSiteHost,
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

  logger.info?.('✅ [BROWSER-AGENT] Route mounted at POST /api/v1/browser-agent/run');
}

export default registerGeneralBrowserAgentRoutes;
