/**
 * email-reader.js
 * IMAP-based inbox reader for system email accounts.
 * Primary use: catch verification emails during autonomous signups.
 *
 * Deps: imapflow
 * Env: GMAIL_SIGNUP_EMAIL, GMAIL_SIGNUP_APP_PASSWORD
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import { ImapFlow } from "imapflow";

const GMAIL_IMAP_HOST = "imap.gmail.com";
const GMAIL_IMAP_PORT = 993;

// How long to poll for a verification email before giving up
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
const POLL_INTERVAL_MS = 4_000;

function buildClient(email, appPassword) {
  return new ImapFlow({
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });
}

/**
 * Poll the inbox until a new email arrives from `fromDomain` (or matching `subjectContains`)
 * that was received after `since`.
 *
 * Returns { subject, from, body, links } or null on timeout.
 */
export async function waitForVerificationEmail({
  email = process.env.GMAIL_SIGNUP_EMAIL,
  appPassword = process.env.GMAIL_SIGNUP_APP_PASSWORD,
  fromDomain = null,        // e.g. "postmarkapp.com"
  subjectContains = null,   // e.g. "verify", "confirm"
  since = new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
} = {}) {
  if (!email || !appPassword) {
    throw new Error("GMAIL_SIGNUP_EMAIL and GMAIL_SIGNUP_APP_PASSWORD are required");
  }

  const deadline = Date.now() + timeoutMs;
  logger.log?.(`[EMAIL-READER] Waiting for verification email (domain: ${fromDomain}, subject: ${subjectContains})`);

  while (Date.now() < deadline) {
    const client = buildClient(email, appPassword);
    try {
      await client.connect();
      await client.mailboxOpen("INBOX");

      // Search criteria
      const criteria = { since };
      if (fromDomain) criteria.from = `@${fromDomain}`;
      if (subjectContains) criteria.subject = subjectContains;

      const messages = [];
      for await (const msg of client.fetch(criteria, {
        envelope: true,
        bodyStructure: true,
        source: true,
      })) {
        messages.push(msg);
      }

      await client.logout();

      if (messages.length > 0) {
        // Take the most recent match
        const msg = messages[messages.length - 1];
        const raw = msg.source?.toString("utf8") || "";
        const links = extractLinks(raw);
        const subject = msg.envelope?.subject || "";
        const from = msg.envelope?.from?.[0]?.address || "";

        logger.log?.(`[EMAIL-READER] Found email: "${subject}" from ${from} — ${links.length} links`);
        return { subject, from, body: raw, links };
      }
    } catch (err) {
      logger.warn?.(`[EMAIL-READER] IMAP error: ${err.message}`);
      try { await client.logout(); } catch (_) {}
    }

    await sleep(POLL_INTERVAL_MS);
  }

  logger.warn?.(`[EMAIL-READER] Timed out waiting for verification email`);
  return null;
}

/**
 * Extract all http/https URLs from a raw email body.
 */
export function extractLinks(rawBody) {
  const urlRegex = /https?:\/\/[^\s"'<>\]]+/g;
  const matches = rawBody.match(urlRegex) || [];
  // Deduplicate and clean trailing punctuation
  return [...new Set(matches.map((u) => u.replace(/[.,;)]+$/, "")))];
}

/**
 * Find the best verification link from a list of links.
 * Prioritizes links containing "verify", "confirm", "activate", "token".
 */
export function findVerificationLink(links, { preferDomain = null } = {}) {
  const keywords = ["verify", "confirm", "activate", "token", "validate", "account"];

  const scored = links.map((url) => {
    let score = 0;
    const lower = url.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 10;
    }
    if (preferDomain && lower.includes(preferDomain.toLowerCase())) score += 5;
    return { url, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].url : (links[0] || null);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default { waitForVerificationEmail, extractLinks, findVerificationLink };
