/**
 * signup-agent.js
 * Orchestrates autonomous account signups.
 * Flow: navigate → fill form → submit → wait for verification email → click link → store creds
 *
 * Deps: browser-agent.js, email-reader.js, account-manager.js
 *
 * Usage:
 *   const agent = createSignupAgent({ pool, logger });
 *   const result = await agent.signup(SIGNUP_RECIPES.postmark);
 */

import { createSession } from "../services/browser-agent.js";
import { waitForVerificationEmail, findVerificationLink } from "../services/email-reader.js";
import crypto from "crypto";

// Default system signup email
const SIGNUP_EMAIL = process.env.GMAIL_SIGNUP_EMAIL || "lumea.lifeos@gmail.com";

/**
 * Signup recipes — one per service.
 * Each recipe describes how to fill out that service's signup form.
 *
 * Fields:
 *   name         — internal service name (must match managed_accounts.service_name)
 *   url          — signup page URL
 *   fromDomain   — email domain to watch for verification
 *   subjectHint  — subject keyword to match verification email
 *   fields       — array of { selector, value } to fill in order
 *   submitSelector — CSS selector or text for the submit button
 *   successKeywords — page text that means signup succeeded
 *   postVerifySteps — optional steps to take after clicking verification link
 *   plan         — plan name being signed up for
 */
export const SIGNUP_RECIPES = {
  postmark: {
    name: "postmark",
    url: "https://account.postmarkapp.com/sign_up",
    fromDomain: "postmarkapp.com",
    subjectHint: "confirm",
    plan: "free",
    fields: [
      { selector: "#name",  valueKey: "fullName", value: "LifeOS System" },
      { selector: "#email", valueKey: "email",    value: SIGNUP_EMAIL },
      { selector: "#password", valueKey: "password", generate: true },
    ],
    submitSelector: "input[type=submit], button[type=submit]",
    successKeywords: ["check your email", "confirm", "sent you"],
  },

  jane_app: {
    name: "jane_app",
    url: "https://jane.app/affiliates",
    fromDomain: "jane.app",
    subjectHint: "affiliate",
    plan: "affiliate",
    fields: [
      { selector: "input[name=name], input[placeholder*=name i]",       value: "Adam Hopkins" },
      { selector: "input[name=email], input[type=email]",               value: SIGNUP_EMAIL },
      { selector: "input[name=website], input[placeholder*=website i]", value: "https://lifeos.up.railway.app" },
      { selector: "textarea, input[placeholder*=message i]",            value: "AI-powered life and business operating system. I refer wellness and healthcare businesses to Jane App as part of our platform integrations." },
    ],
    submitSelector: "button[type=submit], input[type=submit]",
    successKeywords: ["thank you", "received", "will be in touch"],
    requiresManualApproval: true,
  },

  square: {
    name: "square",
    url: "https://squareup.com/us/en/referral",
    fromDomain: "squareup.com",
    subjectHint: "referral",
    plan: "referral",
    fields: [
      { selector: "input[name=email], input[type=email]", value: SIGNUP_EMAIL },
    ],
    submitSelector: "button[type=submit]",
    successKeywords: ["referral link", "share", "thank you"],
  },

  mindbody: {
    name: "mindbody",
    url: "https://www.mindbodyonline.com/business/tools/partner-program",
    fromDomain: "mindbodyonline.com",
    subjectHint: "partner",
    plan: "partner",
    fields: [
      { selector: "input[name=FirstName], input[placeholder*=first i]", value: "Adam" },
      { selector: "input[name=LastName], input[placeholder*=last i]",   value: "Hopkins" },
      { selector: "input[name=Email], input[type=email]",               value: SIGNUP_EMAIL },
      { selector: "input[name=Company], input[placeholder*=company i]", value: "LifeOS / LimitlessOS" },
      { selector: "input[name=Website], input[placeholder*=website i]", value: "https://lifeos.up.railway.app" },
    ],
    submitSelector: "button[type=submit], input[type=submit]",
    successKeywords: ["thank you", "submitted", "will contact"],
    requiresManualApproval: true,
  },
};

function generatePassword(length = 24) {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
}

export function createSignupAgent({ pool, accountManager, logger = console } = {}) {

  /**
   * Run a signup flow for a given recipe.
   * Returns { ok, status, accountId, message, screenshotPath? }
   */
  async function signup(recipe, {
    emailOverride = null,
    dryRun = false,
  } = {}) {
    const email = emailOverride || SIGNUP_EMAIL;
    const serviceName = recipe.name;
    const startedAt = new Date();
    let session = null;
    let accountRow = null;

    logger.log?.(`[SIGNUP-AGENT] Starting signup: ${serviceName} (email: ${email})`);

    // Create or update account record as pending
    accountRow = await accountManager.upsertAccount({
      serviceName,
      serviceUrl: recipe.url,
      emailUsed: email,
      status: "pending",
      planName: recipe.plan || null,
      lastAction: "starting",
    });

    const accountId = accountRow?.id;

    try {
      if (dryRun) {
        logger.log?.(`[SIGNUP-AGENT] Dry run — skipping browser for ${serviceName}`);
        return { ok: true, status: "dry_run", accountId, message: "Dry run complete" };
      }

      // ── Step 1: Open browser ──────────────────────────────────────────────────
      session = await createSession({ logger });
      await accountManager.logAction({ accountId, serviceName, action: "browser_open", status: "ok" });

      // ── Step 2: Navigate ──────────────────────────────────────────────────────
      await session.navigate(recipe.url);
      await accountManager.logAction({ accountId, serviceName, action: "navigate", status: "ok", details: { url: recipe.url } });

      // ── Step 3: Detect captcha immediately ───────────────────────────────────
      const hasCaptcha = await session.detectCaptcha();
      if (hasCaptcha) {
        const screenshotPath = await session.screenshot(`${serviceName}-captcha`);
        logger.warn?.(`[SIGNUP-AGENT] Captcha detected on ${serviceName} — flagging for human`);
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "needs_human",
          captchaRequired: true,
          humanRequired: true,
          lastAction: "captcha_detected",
        });
        await accountManager.logAction({
          accountId, serviceName,
          action: "captcha_detected",
          status: "needs_human",
          details: { url: session.currentUrl() },
          screenshotPath,
        });
        await session.close();
        return { ok: false, status: "needs_human", accountId, message: "Captcha detected — manual signup required", screenshotPath };
      }

      // ── Step 4: Fill form ─────────────────────────────────────────────────────
      let generatedPassword = null;
      for (const field of recipe.fields) {
        let value = field.value;
        if (field.generate) {
          value = generatePassword();
          generatedPassword = value;
        }
        if (field.valueKey === "email") value = email;

        try {
          await session.fill(field.selector, value);
        } catch (fillErr) {
          logger.warn?.(`[SIGNUP-AGENT] Could not fill ${field.selector}: ${fillErr.message}`);
        }
      }

      await accountManager.logAction({ accountId, serviceName, action: "fill_form", status: "ok" });

      // ── Step 5: Submit ────────────────────────────────────────────────────────
      try {
        await session.click(recipe.submitSelector);
      } catch (clickErr) {
        // Try pressing Enter as fallback
        await session.page.keyboard.press("Enter");
      }

      // Wait for navigation / response
      await session.page.waitForTimeout(3000);
      await accountManager.logAction({ accountId, serviceName, action: "submit", status: "ok" });

      // ── Step 6: Check for immediate success or error ──────────────────────────
      const pageText = await session.pageText();
      const postSubmitCaptcha = await session.detectCaptcha();

      if (postSubmitCaptcha) {
        const screenshotPath = await session.screenshot(`${serviceName}-post-submit-captcha`);
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "needs_human",
          captchaRequired: true,
          humanRequired: true,
          lastAction: "post_submit_captcha",
        });
        await session.close();
        return { ok: false, status: "needs_human", accountId, message: "Captcha appeared after submit", screenshotPath };
      }

      const lowerText = pageText.toLowerCase();
      const errorKeywords = ["error", "invalid", "already exists", "already registered", "failed"];
      const hasError = errorKeywords.some((kw) => lowerText.includes(kw));
      if (hasError) {
        const screenshotPath = await session.screenshot(`${serviceName}-error`);
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "failed",
          lastAction: "submit_error",
          lastError: pageText.slice(0, 300),
        });
        await session.close();
        return { ok: false, status: "failed", accountId, message: `Submit error: ${pageText.slice(0, 200)}`, screenshotPath };
      }

      // Update account with password (before email verify in case something fails)
      await accountManager.upsertAccount({
        serviceName, emailUsed: email,
        status: "email_sent",
        password: generatedPassword,
        lastAction: "awaiting_verification",
      });

      await session.close();
      session = null;

      // ── Step 7: Wait for verification email ───────────────────────────────────
      if (recipe.requiresManualApproval) {
        // Application-style forms — no verification link, just wait for approval
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "pending_approval",
          lastAction: "application_submitted",
        });
        await accountManager.logAction({ accountId, serviceName, action: "application_submitted", status: "ok" });
        return {
          ok: true,
          status: "pending_approval",
          accountId,
          message: `Application submitted to ${serviceName} — awaiting manual approval from their team`,
        };
      }

      logger.log?.(`[SIGNUP-AGENT] Waiting for verification email from ${recipe.fromDomain}...`);
      const emailResult = await waitForVerificationEmail({
        fromDomain: recipe.fromDomain,
        subjectContains: recipe.subjectHint,
        since: startedAt,
        logger,
      });

      if (!emailResult) {
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "needs_human",
          humanRequired: true,
          lastAction: "verification_email_timeout",
          lastError: "No verification email received within 2 minutes",
        });
        return { ok: false, status: "needs_human", accountId, message: "Verification email not received — check inbox manually" };
      }

      // ── Step 8: Click verification link ──────────────────────────────────────
      const verifyLink = findVerificationLink(emailResult.links, { preferDomain: recipe.fromDomain });
      if (!verifyLink) {
        await accountManager.upsertAccount({
          serviceName, emailUsed: email,
          status: "needs_human",
          humanRequired: true,
          lastAction: "no_verify_link",
        });
        return { ok: false, status: "needs_human", accountId, message: "Could not find verification link in email" };
      }

      logger.log?.(`[SIGNUP-AGENT] Clicking verification link: ${verifyLink}`);
      session = await createSession({ logger });
      await session.navigate(verifyLink);
      await session.page.waitForTimeout(3000);

      const verified = await session.pageIndicatesSuccess(["verified", "confirmed", "success", "welcome", "thank you"]);
      await session.close();
      session = null;

      const verifiedAt = verified ? new Date() : null;
      const finalStatus = verified ? "active" : "needs_human";

      await accountManager.upsertAccount({
        serviceName, emailUsed: email,
        status: finalStatus,
        humanRequired: !verified,
        lastAction: verified ? "verified" : "verify_page_unclear",
        verifiedAt,
      });

      await accountManager.logAction({
        accountId, serviceName,
        action: "verify_email",
        status: verified ? "ok" : "unclear",
        details: { verifyLink, pageIndicatedSuccess: verified },
      });

      logger.log?.(`[SIGNUP-AGENT] ${serviceName} signup complete — status: ${finalStatus}`);
      return {
        ok: true,
        status: finalStatus,
        accountId,
        message: verified
          ? `${serviceName} account created and verified successfully`
          : `${serviceName} account created — verification page unclear, please check`,
      };

    } catch (err) {
      logger.warn?.(`[SIGNUP-AGENT] ${serviceName} error: ${err.message}`);
      let screenshotPath = null;
      if (session) {
        try { screenshotPath = await session.screenshot(`${serviceName}-exception`); } catch (_) {}
        try { await session.close(); } catch (_) {}
      }
      await accountManager.upsertAccount({
        serviceName, emailUsed: email,
        status: "failed",
        lastAction: "exception",
        lastError: err.message,
      });
      await accountManager.logAction({
        accountId, serviceName,
        action: "exception",
        status: "error",
        details: { error: err.message },
        screenshotPath,
      });
      return { ok: false, status: "failed", accountId, message: err.message, screenshotPath };
    }
  }

  /**
   * Run multiple signups in sequence.
   */
  async function signupAll(recipeNames, options = {}) {
    const results = [];
    for (const name of recipeNames) {
      const recipe = SIGNUP_RECIPES[name];
      if (!recipe) {
        results.push({ service: name, ok: false, message: "Unknown recipe" });
        continue;
      }
      const result = await signup(recipe, options);
      results.push({ service: name, ...result });
      // Brief pause between signups to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    return results;
  }

  return { signup, signupAll, SIGNUP_RECIPES };
}

export default createSignupAgent;
