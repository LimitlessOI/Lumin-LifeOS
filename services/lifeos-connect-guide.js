/**
 * SYNOPSIS: LifeOS guided service-connect steps — site → email → return → secrets.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const WORK_EMAIL = () => process.env.WORK_EMAIL || 'LifeOS@hopkinsgroup.org';
const SIGNUP_EMAIL = () => process.env.GMAIL_SIGNUP_EMAIL || 'lumea.lifeos@gmail.com';

export function resolveConnectEmail({ preferWork = false, email = null } = {}) {
  if (email) return String(email).trim();
  if (preferWork) return WORK_EMAIL();
  return SIGNUP_EMAIL();
}

export function inboxUrlForEmail(email) {
  const e = String(email || '').toLowerCase();
  if (e.endsWith('@gmail.com') || e.endsWith('@googlemail.com') || e.endsWith('@hopkinsgroup.org')) {
    return `https://mail.google.com/mail/u/0/#search/newer_than:1d`;
  }
  return 'https://mail.google.com/';
}

export function buildConnectGuide(account = {}) {
  const service = account.service_name || account.service || 'service';
  const email = account.email_used || account.email || SIGNUP_EMAIL();
  const siteUrl = account.service_url || account.url || null;
  const status = account.status || 'pending';
  const lastAction = account.last_action || '';
  const captcha = account.captcha_required === true;
  const human = account.human_required === true || status === 'needs_human';

  const steps = [];

  steps.push({
    id: 'system_runs',
    title: 'System runs the signup',
    detail: 'LifeOS fills the form, uses your vault card when needed, and stores credentials encrypted.',
    actor: 'system',
    done: !['pending', 'signup_start'].includes(status) || Boolean(lastAction),
  });

  if (captcha || /captcha/i.test(lastAction)) {
    steps.push({
      id: 'solve_captcha',
      title: 'Solve the captcha on the site',
      detail: 'Open the service window, complete the challenge, then tap Continue here.',
      actor: 'human',
      action: { type: 'open_url', url: siteUrl, label: 'Open site' },
      done: false,
    });
  }

  if (status === 'email_sent' || /magic_link|email_sent|verification/i.test(lastAction) || status === 'needs_human') {
    steps.push({
      id: 'open_email',
      title: 'Open the verification email',
      detail: `Inbox for ${email}. Click the magic / verify link in the message from the service.`,
      actor: 'human',
      action: { type: 'open_url', url: inboxUrlForEmail(email), label: 'Open email' },
      done: status === 'active' || Boolean(account.verified_at),
    });
    steps.push({
      id: 'return_site',
      title: 'Return to the service',
      detail: 'After the link opens, finish onboarding (mailbox, billing) in that window.',
      actor: 'human',
      action: siteUrl ? { type: 'open_url', url: siteUrl, label: 'Open service' } : null,
      done: status === 'active',
    });
  }

  if (status === 'awaiting_consent') {
    steps.push({
      id: 'approve_payment',
      title: 'Approve payment',
      detail: 'Review the plan/cost, then approve so LifeOS can enter the card from the vault.',
      actor: 'human',
      action: { type: 'approve_payment', label: 'Approve payment' },
      done: false,
    });
  }

  steps.push({
    id: 'store_secrets',
    title: 'Store API key / password',
    detail: 'Secrets stay encrypted. Hidden by default; tap reveal only when you need to copy.',
    actor: 'system',
    done: Boolean(account.api_key_hint) || status === 'active',
  });

  const nextHuman = steps.find((s) => s.actor === 'human' && !s.done) || null;

  return {
    service,
    email,
    siteUrl,
    status,
    lastAction,
    humanRequired: human,
    captchaRequired: captcha,
    steps,
    nextHumanStep: nextHuman,
    inboxUrl: inboxUrlForEmail(email),
  };
}

export function imapCredsForEmail(email) {
  const e = String(email || '').toLowerCase();
  const work = String(WORK_EMAIL()).toLowerCase();
  if (e && work && e === work) {
    return {
      email: WORK_EMAIL(),
      appPassword: process.env.WORK_EMAIL_APP_PASSWORD || process.env.GMAIL_SIGNUP_APP_PASSWORD || null,
      source: process.env.WORK_EMAIL_APP_PASSWORD ? 'WORK_EMAIL' : 'GMAIL_SIGNUP_FALLBACK',
    };
  }
  return {
    email: process.env.GMAIL_SIGNUP_EMAIL || email,
    appPassword: process.env.GMAIL_SIGNUP_APP_PASSWORD || null,
    source: 'GMAIL_SIGNUP',
  };
}

export default { buildConnectGuide, inboxUrlForEmail, resolveConnectEmail, imapCredsForEmail };
