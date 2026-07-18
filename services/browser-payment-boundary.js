/**
 * SYNOPSIS: Detect checkout/payment screens and extract plan/cost proposals.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

const PAYMENT_URL_HINTS = [
  'checkout', 'billing', 'payment', 'subscribe', 'pricing/plan', '/pay', 'stripe',
  'card', 'invoice', 'upgrade',
];

const PAYMENT_TEXT_HINTS = [
  'credit card', 'card number', 'cvv', 'cvc', 'billing address', 'payment method',
  'add payment', 'enter card', 'subscribe now', 'complete purchase', 'pay now',
  'trial ends', 'choose a plan', 'select a plan',
];

const PAYMENT_FIELD_HINTS = [
  'card', 'cvv', 'cvc', 'cc-number', 'credit', 'billing', 'payment', 'stripe',
];

export function detectPaymentBoundary(observation = {}) {
  const url = String(observation.url || '').toLowerCase();
  const text = String(observation.text || '').toLowerCase();
  const elements = Array.isArray(observation.elements) ? observation.elements : [];

  const urlHit = PAYMENT_URL_HINTS.some((h) => url.includes(h));
  const textHit = PAYMENT_TEXT_HINTS.some((h) => text.includes(h));
  const fieldHit = elements.some((el) => {
    const blob = `${el.name || ''} ${el.id || ''} ${el.text || ''} ${el.type || ''}`.toLowerCase();
    return PAYMENT_FIELD_HINTS.some((h) => blob.includes(h));
  });

  const isPayment = urlHit || textHit || fieldHit;
  return {
    isPayment,
    paymentUrl: observation.url || null,
    reason: isPayment
      ? (urlHit ? 'payment_url' : fieldHit ? 'payment_field' : 'payment_text')
      : null,
  };
}

export function extractPaymentProposal(observation = {}) {
  const text = String(observation.text || '');
  const title = String(observation.title || '').trim();
  const costs = [...text.matchAll(/\$\s?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year|wk|week))?/gi)]
    .map((m) => m[0].replace(/\s+/g, ' ').trim());
  const proposedCosts = [...new Set(costs)].slice(0, 8);
  let proposedPlanSummary = title.slice(0, 160);
  if (!proposedPlanSummary && proposedCosts[0]) {
    const idx = text.toLowerCase().indexOf(proposedCosts[0].toLowerCase().replace(/\s/g, ''));
    const start = Math.max(0, (idx >= 0 ? idx : 0) - 40);
    proposedPlanSummary = text.slice(start, start + 160).replace(/\s+/g, ' ').trim();
  }
  if (!proposedPlanSummary) proposedPlanSummary = text.slice(0, 160).replace(/\s+/g, ' ').trim();

  return {
    paymentUrl: observation.url || null,
    proposedCosts,
    proposedPlanSummary: proposedPlanSummary || null,
  };
}

export default { detectPaymentBoundary, extractPaymentProposal };
