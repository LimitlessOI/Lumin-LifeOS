/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * credential-aliases.js
 * Resolves the legacy/custom env names already present in Railway so the app
 * can consume them without requiring manual renames first.
 */

const DEFAULT_TC_MAILBOX = "adam@hopkinsgroup.org";

function firstNonEmpty(...values) {
  for (const value of values) {
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

export function getSystemSignupEmail() {
  return firstNonEmpty(
    process.env.GMAIL_SIGNUP_EMAIL,
    process.env.SYSTEM_SIGNUP_EMAIL,
    process.env.SYSTEM_EMAIL
  );
}

export function getSystemSignupPassword() {
  return firstNonEmpty(
    process.env.GMAIL_SIGNUP_APP_PASSWORD,
    process.env.SystemEmail_IMAP_APP_LifeOS_PASSWORD
  );
}

export function getTCImapUser() {
  return firstNonEmpty(
    process.env.TC_IMAP_USER,
    process.env.TC_IMAP_EMAIL,
    process.env.IMAP_USER,
    process.env.TC_IMAP_APP_Adam_PASSWORD ? DEFAULT_TC_MAILBOX : "",
    process.env.WORK_EMAIL
  );
}

export function getTCImapPassword() {
  return firstNonEmpty(
    process.env.TC_IMAP_APP_PASSWORD,
    process.env.TC_IMAP_APP_Adam_PASSWORD,
    process.env.WORK_EMAIL_APP_PASSWORD,
    process.env.IMAP_PASS
  );
}

export function getTCImapHost() {
  return firstNonEmpty(process.env.TC_IMAP_HOST, process.env.IMAP_HOST, "imap.gmail.com");
}

export function getTCImapPort() {
  return firstNonEmpty(process.env.TC_IMAP_PORT, process.env.IMAP_PORT, "993");
}

export function getGLVARCredentialsFromEnv() {
  const username = firstNonEmpty(
    process.env.GLVAR_mls_Username,
    process.env.GLVAR_MLS_USERNAME,
    process.env.GLVAR_USERNAME
  );
  const password = firstNonEmpty(
    process.env.GLVAR_mls_Password,
    process.env.GLVAR_MLS_PASSWORD,
    process.env.GLVAR_PASSWORD
  );
  const url = firstNonEmpty(
    process.env.GLVAR_mls_URL,
    process.env.GLVAR_MLS_URL,
    process.env.GLVAR_URL
  );
  return { username, password, url, present: Boolean(username && password) };
}

export function getExpOktaCredentialsFromEnv() {
  const username = firstNonEmpty(
    process.env.exp_okta_Username,
    process.env.EXP_OKTA_USERNAME,
    process.env.EXP_OKTA_USER
  );
  const password = firstNonEmpty(
    process.env.exp_okta_Password,
    process.env.EXP_OKTA_PASSWORD,
    process.env.EXP_OKTA_PASS
  );
  const url = firstNonEmpty(
    process.env.exp_okta_URL,
    process.env.EXP_OKTA_URL,
    "https://exprealty.okta.com"
  );
  return { username, password, url, present: Boolean(username && password) };
}
