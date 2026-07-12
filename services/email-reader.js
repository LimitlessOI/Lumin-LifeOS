/**
 * SYNOPSIS: IMAP inbox reader for signup verification emails (Gmail app password).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Deps: imapflow
 * Env: GMAIL_SIGNUP_EMAIL, GMAIL_SIGNUP_APP_PASSWORD
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
async function searchMailboxOnce({
  client,
  mailbox,
  since,
  fromDomain = null,
  subjectContains = null,
}) {
  await client.mailboxOpen(mailbox);
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
  return messages;
}

function toEmailResult(msg) {
  const raw = msg.source?.toString("utf8") || "";
  return {
    subject: msg.envelope?.subject || "",
    from: msg.envelope?.from?.[0]?.address || "",
    body: raw,
    links: extractLinks(raw),
    date: msg.envelope?.date || null,
  };
}

/**
 * One-shot scan of INBOX + Spam for a verification email.
 * Use when resume-verify runs long after signup (lookback beyond a few minutes).
 */
export async function findRecentVerificationEmail({
  email = process.env.GMAIL_SIGNUP_EMAIL,
  appPassword = process.env.GMAIL_SIGNUP_APP_PASSWORD,
  fromDomain = null,
  subjectContains = null,
  since = new Date(Date.now() - 48 * 3600 * 1000),
  mailboxes = ["INBOX", "[Gmail]/Spam"],
  logger = console,
} = {}) {
  if (!email || !appPassword) {
    throw new Error("GMAIL_SIGNUP_EMAIL and GMAIL_SIGNUP_APP_PASSWORD are required");
  }

  const client = buildClient(email, appPassword);
  try {
    await client.connect();
    const attempts = [];
    if (fromDomain || subjectContains) {
      attempts.push({ fromDomain, subjectContains });
    }
    // Fallbacks: domain-only miss is common (mail comes from ESP hosts).
    attempts.push({ fromDomain: null, subjectContains: subjectContains || "verif" });
    attempts.push({ fromDomain: null, subjectContains: "confirm" });
    attempts.push({ fromDomain: null, subjectContains: null });

    for (const attempt of attempts) {
      for (const mailbox of mailboxes) {
        try {
          const messages = await searchMailboxOnce({
            client,
            mailbox,
            since,
            fromDomain: attempt.fromDomain,
            subjectContains: attempt.subjectContains,
          });
          if (!messages.length) continue;

          let chosen = messages[messages.length - 1];
          if (fromDomain) {
            const domainHit = [...messages].reverse().find((msg) => {
              const from = msg.envelope?.from?.[0]?.address || "";
              const raw = msg.source?.toString("utf8") || "";
              const blob = `${from} ${msg.envelope?.subject || ""} ${raw.slice(0, 4000)}`.toLowerCase();
              return blob.includes(String(fromDomain).toLowerCase());
            });
            if (domainHit) chosen = domainHit;
            else if (attempt.fromDomain || attempt.subjectContains) {
              // Keep scanning softer attempts rather than grabbing unrelated mail.
              continue;
            }
          }

          const result = toEmailResult(chosen);
          logger.log?.(
            `[EMAIL-READER] Found email in ${mailbox}: "${result.subject}" from ${result.from} — ${result.links.length} links`
          );
          return { ...result, mailbox };
        } catch (err) {
          logger.warn?.(`[EMAIL-READER] ${mailbox} search failed: ${err.message}`);
        }
      }
    }
  } finally {
    try {
      await client.logout();
    } catch (_) {}
  }
  return null;
}

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
    const found = await findRecentVerificationEmail({
      email,
      appPassword,
      fromDomain,
      subjectContains,
      since,
      logger,
    });
    if (found) return found;

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

export default {
  waitForVerificationEmail,
  findRecentVerificationEmail,
  extractLinks,
  findVerificationLink,
};
