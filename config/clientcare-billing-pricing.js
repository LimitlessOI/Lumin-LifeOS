/**
 * SYNOPSIS: BirthBill (ClientCare Collections) public pricing for midwife practices.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */

export const BIRTHBILL_PRODUCT = {
  name: 'BirthBill',
  tagline: 'Insurance forever-chase for ClientCare midwives',
  audience: 'Independent midwifery practices on ClientCare',
};

export const CLIENTCARE_BILLING_PRICING = {
  beta: true,
  product: BIRTHBILL_PRODUCT,
  pilot: {
    oneTimeCents: Number(process.env.BIRTHBILL_PILOT_CENTS || 29700),
    display: process.env.BIRTHBILL_PILOT_DISPLAY || '$297',
    description:
      process.env.BIRTHBILL_PILOT_DESCRIPTION
      || 'BirthBill pilot onboard — connect ClientCare, seed your forever-chase unpaid-birth queue, and run claim-status prep with a human-in-the-loop coworker.',
  },
  carePlan: {
    monthlyCents: Number(process.env.BIRTHBILL_CARE_CENTS || 9700),
    display: process.env.BIRTHBILL_CARE_DISPLAY || '$97/mo',
    description: 'Ongoing forever-chase ops seat after pilot (billed separately after month one)',
    includedMonthsOnPilot: Number(process.env.BIRTHBILL_CARE_INCLUDED_MONTHS || 1),
  },
  recoveryShare: {
    pct: Number(process.env.BIRTHBILL_RECOVERY_FEE_PCT || 5),
    display: process.env.BIRTHBILL_RECOVERY_FEE_DISPLAY || '5% of insurance dollars recovered',
    description: 'Only on money BirthBill helped chase back — not on already-paid claims.',
  },
  includes: [
    'Forever-chase queue for unpaid and underpaid insurance births (age is not a write-off)',
    'Claim-status prep in ClientCare (Claims Processing + provider type)',
    'Operator workboard for the practice — clear next actions',
    'Human-in-the-loop coworker (browser automation against your ClientCare login)',
  ],
  excludes: [
    'Guaranteed auto-create/submit of every ChargeSlip or HCFA without operator review',
    'Practices not on ClientCare West / ClientCare.net',
    'Legal advice or payer-contract interpretation',
  ],
};

export function getBirthBillPilotOfferSummary(pricing = CLIENTCARE_BILLING_PRICING) {
  const months = pricing.carePlan?.includedMonthsOnPilot || 1;
  return `${pricing.pilot.display} pilot onboard (includes first ${months} month of care) + ${pricing.recoveryShare.display}`;
}

export function getBirthBillDealReasonWhy(pricing = CLIENTCARE_BILLING_PRICING) {
  return `We're onboarding midwife practices while forever-chase is tip-proved and claim create is still human-supervised. That's why pilot is ${pricing.pilot.display} instead of a full agency recovery retainers — you get the queue that never ages out, and we keep improving the create path with you.`;
}

export default CLIENTCARE_BILLING_PRICING;
