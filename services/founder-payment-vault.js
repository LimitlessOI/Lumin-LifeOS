/**
 * SYNOPSIS: Founder payment vault — card from env only, never logged or stored in DB.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

export function maskCard(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

export function getFounderPaymentVault(env = process.env) {
  const number = String(env.FOUNDER_PAYMENT_CARD_NUMBER || env.PAYMENT_CARD_NUMBER || '').replace(/\s/g, '');
  const exp = String(env.FOUNDER_PAYMENT_CARD_EXP || env.PAYMENT_CARD_EXP || '').trim();
  const cvc = String(env.FOUNDER_PAYMENT_CARD_CVC || env.PAYMENT_CARD_CVC || '').trim();
  const name = String(env.FOUNDER_PAYMENT_CARD_NAME || env.PAYMENT_CARD_NAME || env.FOUNDER_PAYMENT_BILLING_NAME || '').trim();
  const zip = String(env.FOUNDER_PAYMENT_BILLING_ZIP || env.PAYMENT_BILLING_ZIP || '').trim();

  const blockers = [];
  if (!number || number.length < 13) blockers.push('FOUNDER_PAYMENT_CARD_NUMBER');
  if (!exp) blockers.push('FOUNDER_PAYMENT_CARD_EXP');
  if (!cvc) blockers.push('FOUNDER_PAYMENT_CARD_CVC');
  if (!name) blockers.push('FOUNDER_PAYMENT_CARD_NAME');

  return {
    ready: blockers.length === 0,
    blockers,
    card: blockers.length === 0 ? { number, exp, cvc, name, zip } : null,
    masked: blockers.length === 0 ? { last4: maskCard(number), exp, name } : null,
  };
}

export function evaluateFounderPaymentReadiness(env = process.env) {
  const vault = getFounderPaymentVault(env);
  return {
    ready: vault.ready,
    blockers: vault.blockers.map((name) => ({ name, purpose: 'Required to complete paid signups after founder consent' })),
    masked: vault.masked,
  };
}

const CARD_SELECTORS = [
  'input[autocomplete="cc-number"]',
  'input[name*="cardnumber" i]',
  'input[name*="card-number" i]',
  'input[name*="card_number" i]',
  'input[id*="cardnumber" i]',
  'input[placeholder*="card number" i]',
  'input[data-elements-stable-field-name="cardNumber"]',
];

const EXP_SELECTORS = [
  'input[autocomplete="cc-exp"]',
  'input[name*="exp" i]',
  'input[placeholder*="MM" i]',
  'input[data-elements-stable-field-name="cardExpiry"]',
];

const CVC_SELECTORS = [
  'input[autocomplete="cc-csc"]',
  'input[name*="cvc" i]',
  'input[name*="cvv" i]',
  'input[placeholder*="CVC" i]',
  'input[data-elements-stable-field-name="cardCvc"]',
];

const NAME_SELECTORS = [
  'input[autocomplete="cc-name"]',
  'input[name*="name" i][name*="card" i]',
  'input[name="name"]',
  'input[placeholder*="name on card" i]',
];

const ZIP_SELECTORS = [
  'input[autocomplete="postal-code"]',
  'input[name*="zip" i]',
  'input[name*="postal" i]',
];

async function tryFill(page, selectors, value, logger) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      await el.click({ clickCount: 3 });
      await el.type(String(value), { delay: 20 });
      return sel;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fillPaymentFields(session, card, logger = console) {
  if (!session?.page || !card) {
    return { ok: false, error: 'session and card required' };
  }
  const page = session.page;
  const filled = {};

  filled.number = await tryFill(page, CARD_SELECTORS, card.number, logger);
  filled.exp = await tryFill(page, EXP_SELECTORS, card.exp, logger);
  filled.cvc = await tryFill(page, CVC_SELECTORS, card.cvc, logger);
  filled.name = await tryFill(page, NAME_SELECTORS, card.name, logger);
  if (card.zip) {
    filled.zip = await tryFill(page, ZIP_SELECTORS, card.zip, logger);
  }

  const coreOk = filled.number && filled.exp && filled.cvc;
  logger.info?.('[PAYMENT-VAULT] Filled payment fields', {
    number: filled.number ? 'ok' : 'miss',
    exp: filled.exp ? 'ok' : 'miss',
    cvc: filled.cvc ? 'ok' : 'miss',
    name: filled.name ? 'ok' : 'miss',
  });

  return {
    ok: !!coreOk,
    filled,
    error: coreOk ? null : 'Could not locate card fields (may be inside Stripe iframe — use AI continue step)',
  };
}

export default {
  getFounderPaymentVault,
  evaluateFounderPaymentReadiness,
  fillPaymentFields,
  maskCard,
};
