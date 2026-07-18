/**
 * SYNOPSIS: Autonomous account signup — founder authority may complete paid checkout from vault.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import { createSession } from './browser-agent.js';
import { waitForVerificationEmail, findVerificationLink } from './email-reader.js';
import { createSignupAgent, SIGNUP_RECIPES } from '../core/signup-agent.js';
import { runGoalOnSession } from './general-browser-agent-live.js';
import { detectPaymentBoundary, extractPaymentProposal } from './browser-payment-boundary.js';
import { fillPaymentFields, getFounderPaymentVault } from './founder-payment-vault.js';

const SIGNUP_EMAIL = process.env.GMAIL_SIGNUP_EMAIL || 'lumea.lifeos@gmail.com';

function slugServiceName(input) {
  try {
    const host = new URL(input).hostname.replace(/^www\./, '');
    return host.split('.')[0] || 'unknown';
  } catch {
    return String(input || 'unknown').slice(0, 40).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  }
}

function hostFromUrl(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function generatePassword(length = 24) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

function createConsentToken() {
  return crypto.randomBytes(16).toString('hex');
}

function buildSignupGoal({ url, serviceName, email, password, allowPayment = false, planHint = null }) {
  const lines = [
    `Create an account on ${serviceName || 'this website'}.`,
    `Start at ${url}.`,
    `Use email: ${email}.`,
    `If a password field is required use: ${password}.`,
    planHint ? `Target plan/tier: ${planHint}.` : null,
    'Find Sign up / Register / Get started, fill the form, accept terms, submit.',
  ].filter(Boolean);

  if (!allowPayment) {
    lines.push('Stop before entering credit card or payment — do not submit paid checkout yet.');
    lines.push('Say done when you reach payment/checkout OR account is created OR verification email sent.');
  } else {
    lines.push('Payment fields will be filled separately — click Continue/Subscribe/Pay after form is ready.');
    lines.push('Say done when account is active, subscription confirmed, or welcome dashboard visible.');
  }

  return lines.join(' ');
}

function buildPaymentCompletionGoal({ planHint, expectedCost }) {
  return [
    'Complete the paid checkout on this page.',
    planHint ? `Approved plan: ${planHint}.` : null,
    expectedCost ? `Approved cost: ${expectedCost}.` : null,
    'Submit payment, confirm subscription, finish signup.',
    'Say done when purchase succeeds or welcome/dashboard appears.',
  ].filter(Boolean).join(' ');
}

async function verifyEmailAfterSignup({ host, startedAt, service, email, accountManager, accountId, logger }) {
  const { imapCredsForEmail } = await import('./lifeos-connect-guide.js');
  const imap = imapCredsForEmail(email);
  const emailResult = await waitForVerificationEmail({
    email: imap.email,
    appPassword: imap.appPassword,
    fromDomain: host,
    since: startedAt,
    timeoutMs: 120_000,
    logger,
  });

  if (!emailResult) {
    await accountManager.upsertAccount({
      serviceName: service,
      emailUsed: email,
      status: 'needs_human',
      humanRequired: true,
      lastAction: 'verification_email_timeout',
    });
    return { ok: false, status: 'needs_human', message: 'Verification email not received within 2 minutes' };
  }

  const verifyLink = findVerificationLink(emailResult.links, { preferDomain: host });
  if (!verifyLink) {
    await accountManager.upsertAccount({
      serviceName: service,
      emailUsed: email,
      status: 'needs_human',
      humanRequired: true,
      lastAction: 'no_verify_link',
    });
    return { ok: false, status: 'needs_human', message: 'No verification link in email' };
  }

  const session = await createSession({ logger });
  await session.navigate(verifyLink);
  await session.page.waitForTimeout(3000);
  const verified = await session.pageIndicatesSuccess();
  const screenshotPath = await session.screenshot(`${service}-verified`).catch(() => null);
  await session.close();

  const finalStatus = verified ? 'active' : 'needs_human';
  await accountManager.upsertAccount({
    serviceName: service,
    emailUsed: email,
    status: finalStatus,
    verifiedAt: verified ? new Date() : null,
    humanRequired: !verified,
    lastAction: verified ? 'verified' : 'verify_unclear',
    metadata: { verifyLink },
  });

  return {
    ok: true,
    status: finalStatus,
    verified,
    verifyLink,
    screenshotPath,
    message: verified ? `${service} account verified` : `${service} verify page unclear`,
  };
}

export function createBrowserSignupOrchestrator({ pool, accountManager, callCouncilMember, logger = console } = {}) {
  const signupAgent = createSignupAgent({ pool, accountManager, logger });

  async function runBrowserLoop({
    session,
    goal,
    startUrl,
    host,
    maxSteps,
    onScreenshot,
    onAfterStep,
    mustContain = [],
  }) {
    const callModel = (member, prompt) => callCouncilMember(member, prompt, { taskType: 'browser_agent' });
    return runGoalOnSession({
      session,
      goal,
      startUrl,
      callModel,
      tiers: ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openai_gpt', 'claude_sonnet'],
      expectSiteHost: host,
      maxSteps,
      onScreenshot,
      onAfterStep,
      mustContain,
      mustHaveSelector: [],
      logger,
    });
  }

  async function completePaidCheckout({
    session,
    service,
    email,
    accountId,
    host,
    planHint,
    expectedCost,
    meta = {},
    skipEmailVerify = false,
    screenshots = [],
  }) {
    const vault = getFounderPaymentVault();
    if (!vault.ready) {
      await accountManager.upsertAccount({
        serviceName: service,
        emailUsed: email,
        status: 'needs_human',
        humanRequired: true,
        lastAction: 'payment_vault_missing',
        metadata: { ...meta, blockers: vault.blockers },
      });
      return {
        ok: false,
        status: 'needs_human',
        accountId,
        service,
        error: 'Payment vault not configured',
        blockers: vault.blockers,
        hint: 'Set FOUNDER_PAYMENT_CARD_* in Railway',
        screenshots,
      };
    }

    const fillResult = await fillPaymentFields(session, vault.card, logger);
    if (!fillResult.ok) {
      logger.warn?.('[SIGNUP] Programmatic card fill partial — continuing with AI checkout step');
    }

    const checkoutResult = await runBrowserLoop({
      session,
      goal: buildPaymentCompletionGoal({ planHint, expectedCost }),
      startUrl: null,
      host,
      maxSteps: 15,
      onScreenshot: ({ step, screenshot }) => {
        if (screenshot) screenshots.push({ step, screenshot });
      },
      onAfterStep: async () => {
        if (await session.detectCaptcha()) {
          return { stop: true, reason: 'captcha', ok: false };
        }
        return { stop: false };
      },
    });

    const paidOk = checkoutResult.reached || checkoutResult.ok;
    await accountManager.upsertAccount({
      serviceName: service,
      emailUsed: email,
      status: paidOk ? 'email_sent' : 'needs_human',
      lastAction: paidOk ? 'payment_submitted' : checkoutResult.reason,
      metadata: {
        ...meta,
        founderAuthorityPayment: true,
        paymentMasked: vault.masked,
        template: checkoutResult.template,
      },
    });

    await accountManager.logAction({
      accountId,
      serviceName: service,
      action: 'payment_founder_authority_executed',
      status: paidOk ? 'ok' : 'unclear',
      details: {
        planHint,
        expectedCost,
        cardLast4: vault.masked?.last4,
      },
    });

    if (!paidOk) {
      return {
        ok: false,
        status: checkoutResult.reason === 'captcha' ? 'needs_human' : 'needs_human',
        accountId,
        service,
        reason: checkoutResult.reason,
        steps: checkoutResult.steps,
        screenshots,
      };
    }

    if (skipEmailVerify) {
      return {
        ok: true,
        status: 'active',
        accountId,
        service,
        message: `${service} paid signup completed under founder authority`,
        cardLast4: vault.masked?.last4,
        screenshots,
      };
    }

    const verify = await verifyEmailAfterSignup({
      host,
      startedAt: new Date(),
      service,
      email,
      accountManager,
      accountId,
      logger,
    });

    return {
      ok: verify.ok,
      status: verify.status,
      accountId,
      service,
      ...verify,
      cardLast4: vault.masked?.last4,
      screenshots,
    };
  }

  async function runKnownRecipe(recipeKey, options = {}) {
    const recipe = SIGNUP_RECIPES[recipeKey];
    if (!recipe) return { ok: false, error: `Unknown recipe: ${recipeKey}` };
    return signupAgent.signup(recipe, options);
  }

  async function startSignup({
    url,
    serviceName = null,
    planHint = null,
    expectedCost = null,
    email = SIGNUP_EMAIL,
    skipEmailVerify = false,
    maxSteps = 25,
    founderAuthority = false,
  } = {}) {
    maxSteps = Math.min(Math.max(Number(maxSteps) || 25, 1), 80);
    if (!url) return { ok: false, error: 'url is required' };
    if (!callCouncilMember) return { ok: false, error: 'callCouncilMember unavailable' };
    if (!accountManager) return { ok: false, error: 'accountManager unavailable' };

    const service = serviceName || slugServiceName(url);
    const host = hostFromUrl(url);
    const password = generatePassword();
    const startedAt = new Date();
    const consentToken = createConsentToken();
    let session = null;
    const screenshots = [];

    const accountRow = await accountManager.upsertAccount({
      serviceName: service,
      serviceUrl: url,
      emailUsed: email,
      status: 'pending',
      planName: planHint || null,
      lastAction: 'signup_start',
      metadata: {
        signupMode: founderAuthority ? 'founder_authority' : 'consent_gated',
        url,
        planHint,
        expectedCost,
        consentToken,
        founderAuthority: !!founderAuthority,
        passwordGenerated: true,
      },
    });
    const accountId = accountRow?.id;

    try {
      session = await createSession({ logger });
      let paymentProposal = null;

      const onScreenshot = async ({ step, screenshot }) => {
        if (screenshot) screenshots.push({ step, screenshot });
      };

      const onAfterStep = async ({ observation }) => {
        if (await session.detectCaptcha()) {
          return { stop: true, reason: 'captcha', ok: false, handoff: { type: 'captcha', url: observation.url } };
        }
        const payment = detectPaymentBoundary(observation);
        if (payment.isPayment) {
          paymentProposal = extractPaymentProposal(observation);
          return {
            stop: true,
            ok: true,
            reason: 'awaiting_consent',
            handoff: {
              type: founderAuthority ? 'founder_authority_payment' : 'consent_required',
              message: founderAuthority
                ? 'Founder authority — completing payment from vault.'
                : 'Review proposed plan/cost. Call POST /api/v1/browser-agent/signup/approve with consentToken when ready.',
            },
          };
        }
        return { stop: false };
      };

      const result = await runBrowserLoop({
        session,
        goal: buildSignupGoal({ url, serviceName: service, email, password, allowPayment: false, planHint }),
        startUrl: url,
        host,
        maxSteps,
        onScreenshot,
        onAfterStep,
      });

      if (result.reason === 'awaiting_consent' && paymentProposal) {
        const meta = {
          url,
          consentToken,
          paymentUrl: paymentProposal.paymentUrl,
          proposedCosts: paymentProposal.proposedCosts,
          proposedPlanSummary: paymentProposal.proposedPlanSummary,
          expectedCost: expectedCost || paymentProposal.proposedCosts?.[0] || null,
          planHint,
          template: result.template,
          founderAuthority: !!founderAuthority,
        };

        if (founderAuthority) {
          await accountManager.upsertAccount({
            serviceName: service,
            emailUsed: email,
            status: 'paying',
            password,
            planName: planHint || paymentProposal.proposedPlanSummary?.slice(0, 120) || null,
            lastAction: 'founder_authority_payment',
            metadata: meta,
          });

          const paid = await completePaidCheckout({
            session,
            service,
            email,
            accountId,
            host: hostFromUrl(paymentProposal.paymentUrl) || host,
            planHint: planHint || paymentProposal.proposedPlanSummary,
            expectedCost: expectedCost || paymentProposal.proposedCosts?.[0] || null,
            meta,
            skipEmailVerify,
            screenshots,
          });
          await session.close().catch(() => {});
          session = null;
          return paid;
        }

        await session.close();
        session = null;

        await accountManager.upsertAccount({
          serviceName: service,
          emailUsed: email,
          status: 'awaiting_consent',
          password,
          planName: planHint || paymentProposal.proposedPlanSummary?.slice(0, 120) || null,
          lastAction: 'awaiting_consent',
          metadata: meta,
        });

        return {
          ok: true,
          status: 'awaiting_consent',
          accountId,
          service,
          email,
          consentToken,
          paymentUrl: paymentProposal.paymentUrl,
          proposedPlan: planHint || paymentProposal.proposedPlanSummary,
          proposedCosts: paymentProposal.proposedCosts,
          expectedCost: expectedCost || paymentProposal.proposedCosts?.[0] || null,
          message: `Ready for ${service}. Proposed: ${planHint || paymentProposal.proposedPlanSummary || 'paid plan'} at ${expectedCost || paymentProposal.proposedCosts?.[0] || 'see page'}. Approve to enter card from vault.`,
          template: result.template,
          steps: result.steps,
          screenshots,
          approveEndpoint: '/api/v1/browser-agent/signup/approve',
        };
      }

      await session.close();
      session = null;

      if (result.reason === 'captcha') {
        await accountManager.upsertAccount({
          serviceName: service,
          emailUsed: email,
          status: 'needs_human',
          captchaRequired: true,
          humanRequired: true,
          password,
          lastAction: 'captcha',
        });
        return { ok: false, status: 'needs_human', accountId, service, reason: 'captcha', screenshots };
      }

      await accountManager.upsertAccount({
        serviceName: service,
        emailUsed: email,
        status: result.reached ? 'email_sent' : 'needs_human',
        password,
        lastAction: result.reached ? 'signup_submitted' : result.reason,
        metadata: { template: result.template, url, consentToken, founderAuthority: !!founderAuthority },
      });

      if (!result.reached) {
        return { ok: false, status: 'needs_human', accountId, service, reason: result.reason, steps: result.steps, screenshots };
      }

      if (skipEmailVerify) {
        return { ok: true, status: 'email_sent', accountId, service, template: result.template, screenshots };
      }

      const verify = await verifyEmailAfterSignup({ host, startedAt, service, email, accountManager, accountId, logger });
      return { ok: verify.ok, status: verify.status, accountId, service, ...verify, template: result.template, screenshots };
    } catch (err) {
      if (session) await session.close().catch(() => {});
      await accountManager.upsertAccount({
        serviceName: service,
        emailUsed: email,
        status: 'failed',
        lastAction: 'exception',
        lastError: err.message,
      });
      return { ok: false, status: 'failed', accountId, service, error: err.message, screenshots };
    }
  }

  async function approveSignup({
    accountId,
    serviceName = null,
    consentToken,
    approved = false,
    planHint = null,
    expectedCost = null,
    skipEmailVerify = false,
  } = {}) {
    if (!approved) {
      return { ok: false, error: 'approved:true required — founder consent before paid checkout' };
    }
    if (!consentToken) {
      return { ok: false, error: 'consentToken required (from startSignup response)' };
    }

    const email = SIGNUP_EMAIL;
    let row;
    if (accountId) {
      const { rows } = await pool.query('SELECT * FROM managed_accounts WHERE id = $1 LIMIT 1', [accountId]);
      row = rows[0];
    } else if (serviceName) {
      row = await accountManager.getAccount(serviceName, email);
    }
    if (!row) return { ok: false, error: 'Account job not found' };

    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    if (meta.consentToken !== consentToken) {
      return { ok: false, error: 'Invalid consentToken' };
    }
    if (row.status !== 'awaiting_consent') {
      return { ok: false, error: `Account status is ${row.status}, expected awaiting_consent` };
    }

    const service = row.service_name;
    const paymentUrl = meta.paymentUrl || row.service_url;
    const host = hostFromUrl(paymentUrl);
    let session = null;
    const screenshots = [];

    try {
      session = await createSession({ logger });
      await session.navigate(paymentUrl);

      const result = await completePaidCheckout({
        session,
        service,
        email,
        accountId: row.id,
        host,
        planHint: planHint || meta.planHint || row.plan_name,
        expectedCost: expectedCost || meta.expectedCost,
        meta: { ...meta, consentApprovedAt: new Date().toISOString() },
        skipEmailVerify,
        screenshots,
      });
      await session.close().catch(() => {});
      return result;
    } catch (err) {
      if (session) await session.close().catch(() => {});
      await accountManager.upsertAccount({
        serviceName: service,
        emailUsed: email,
        status: 'failed',
        lastAction: 'approve_exception',
        lastError: err.message,
      });
      return { ok: false, status: 'failed', accountId: row.id, service, error: err.message };
    }
  }

  async function runSignup(opts = {}) {
    if (opts.dryRun) {
      return {
        ok: true,
        status: 'dry_run',
        message: 'Dry run — no browser launched',
        founderAuthority: !!opts.founderAuthority,
        paymentVault: getFounderPaymentVault().ready,
        email: opts.email || SIGNUP_EMAIL,
      };
    }
    if (opts.recipe && SIGNUP_RECIPES[opts.recipe]) {
      return runKnownRecipe(opts.recipe, { emailOverride: opts.email, dryRun: opts.dryRun });
    }
    if (opts.service && SIGNUP_RECIPES[opts.service]) {
      return runKnownRecipe(opts.service, { emailOverride: opts.email, dryRun: opts.dryRun });
    }
    if (opts.approved || opts.consentToken) {
      return approveSignup(opts);
    }
    return startSignup(opts);
  }

  async function setupGoogleYoutubeOauth({ redirectUri } = {}) {
    const email = process.env.WORK_EMAIL || process.env.GMAIL_SIGNUP_EMAIL || SIGNUP_EMAIL;
    const password = process.env.WORK_EMAIL_APP_PASSWORD || process.env.GMAIL_SIGNUP_APP_PASSWORD || '';
    const callback = redirectUri
      || `${String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '')}/api/v1/marketing/youtube/callback`;

    if (!email || !password) {
      return {
        ok: false,
        status: 'blocked',
        blocker: 'GOOGLE_LOGIN_CREDS_MISSING',
        message: 'WORK_EMAIL/GMAIL_SIGNUP_EMAIL + app password required on tip',
      };
    }
    if (!callback.includes('/api/v1/marketing/youtube/callback')) {
      return { ok: false, status: 'blocked', blocker: 'REDIRECT_URI_INVALID', message: 'callback URI missing' };
    }

    const session = await createSession({ logger });
    const page = session.page;
    try {
      await session.navigate(`https://accounts.google.com/signin/v2/identifier?continue=${encodeURIComponent('https://console.cloud.google.com/apis/credentials')}`);
      await page.waitForTimeout(1500);

      const emailSel = 'input[type="email"], input[name="identifier"]';
      await page.waitForSelector(emailSel, { timeout: 20000 });
      await page.click(emailSel, { clickCount: 3 });
      await page.type(emailSel, email, { delay: 25 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
        page.keyboard.press('Enter'),
      ]);
      await page.waitForTimeout(2000);

      const bodyText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 2000));
      const passwordSel = 'input[type="password"], input[name="Passwd"]';
      const hasPassword = await page.$(passwordSel);
      if (!hasPassword) {
        const shot = await session.screenshot('google-oauth-no-password');
        return {
          ok: false,
          status: 'needs_human',
          blocker: 'GOOGLE_LOGIN_CHALLENGE',
          message: 'Google did not show a password field (captcha, account chooser, or block).',
          evidence: bodyText.slice(0, 400),
          screenshot: shot,
          emailUsed: email,
        };
      }

      await page.click(passwordSel, { clickCount: 3 });
      await page.type(passwordSel, password, { delay: 25 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null),
        page.keyboard.press('Enter'),
      ]);
      await page.waitForTimeout(3000);

      const after = await page.evaluate(() => ({
        url: location.href,
        text: (document.body?.innerText || '').slice(0, 1200),
      }));
      const denied = /wrong password|couldn't sign you in|2-step|verify it.s you|account recovery|unusual activity|app password/i.test(after.text)
        || /challenge|signin\/rejected|v3\/signin\/challenge/i.test(after.url);

      if (denied || !/console\.cloud\.google\.com/i.test(after.url)) {
        const shot = await session.screenshot('google-oauth-login-blocked');
        return {
          ok: false,
          status: 'needs_human',
          blocker: 'GOOGLE_WEB_LOGIN_REQUIRES_REAL_PASSWORD_OR_2FA',
          message: 'Railway only has Google App Passwords (IMAP). Google Cloud Console web login rejects app passwords and/or requires your 2FA. Paste GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, or complete one Google login yourself.',
          evidence: { url: after.url, text: after.text.slice(0, 500) },
          screenshot: shot,
          emailUsed: email,
          redirectUri: callback,
          next: [
            'Open Google Cloud Console as the account that should own the OAuth app',
            `Create Web OAuth client and add redirect: ${callback}`,
            'Enable YouTube Data API v3 + YouTube Analytics API',
            'Paste Client ID/Secret into Railway (managed-env allowlisted)',
            'Then click Connect YouTube on /marketing and sign in as your YouTube channel Google account',
          ],
        };
      }

      return {
        ok: false,
        status: 'needs_human',
        blocker: 'GOOGLE_CONSOLE_AUTOMATION_INCOMPLETE',
        message: 'Logged into Google Cloud, but creating OAuth client still needs a guided console click-path or pasted keys.',
        emailUsed: email,
        redirectUri: callback,
      };
    } catch (err) {
      return {
        ok: false,
        status: 'failed',
        error: err.message,
        blocker: 'GOOGLE_OAUTH_SETUP_EXCEPTION',
      };
    } finally {
      await session.close().catch(() => {});
    }
  }

  return {
    startSignup,
    approveSignup,
    runSignup,
    runKnownRecipe,
    setupGoogleYoutubeOauth,
    SIGNUP_RECIPES,
  };
}

export default createBrowserSignupOrchestrator;