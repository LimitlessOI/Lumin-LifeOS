/**
 * SYNOPSIS: BirthBill (ClientCare Collections) public pricing + plain-language product definitions.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */

export const BIRTHBILL_PRODUCT = {
  name: 'BirthBill',
  tagline: 'Insurance forever-chase for ClientCare midwives',
  audience: 'Independent midwifery practices on ClientCare',
  readiness: 'pilot', // forever-chase + hands-off loop live; claim create being tip-proved to Sent Bills
  readiness_label: 'Pilot — system files and forever-chases; midwife does nothing after ClientCare connect',
};

/** Plain definitions midwives see on the landing page (no jargon left undefined). */
export const BIRTHBILL_DEFINITIONS = [
  {
    term: 'Forever-chase',
    meaning:
      'An unpaid or underpaid insurance birth stays on your work queue until the insurer pays enough, gives a written no-liability denial, or you close it. Age is never a reason to quit.',
  },
  {
    term: 'ClientCare',
    meaning:
      'The EHR/billing website your practice already uses (ClientCare West / ClientCare.net). BirthBill works as a coworker inside that login — there is no public billing API from the vendor.',
  },
  {
    term: 'Claim-status prep',
    meaning:
      'BirthBill helps set the ClientCare billing status (for example Claims Processing) and provider type so a chart is ready to bill — you still review before anything is treated as filed.',
  },
  {
    term: 'Human-in-the-loop',
    meaning:
      'Only for one-time ClientCare login connect and rare fail-closed exceptions (wrong patient bind). Day-to-day filing and chase is the system’s job — the midwife does not work a billing board to get paid.',
  },
  {
    term: 'ChargeSlip / HCFA',
    meaning:
      'ClientCare screens used to create and send insurance claims. BirthBill can map and assist; full auto-create/submit for every birth is not sold as guaranteed yet.',
  },
  {
    term: 'Recovery share (5%)',
    meaning:
      'After money BirthBill helped chase is actually recovered from insurance, 5% of those recovered dollars is the success fee. Already-paid claims do not count.',
  },
];

export const BIRTHBILL_STEPS = [
  {
    n: 1,
    title: 'Start the pilot',
    detail: 'Tell us your practice name and email, then pay the pilot fee on Stripe.',
  },
  {
    n: 2,
    title: 'Connect ClientCare',
    detail: 'On the welcome page, enter your ClientCare username and password. We store them encrypted for your practice only.',
  },
  {
    n: 3,
    title: 'We seed forever-chase',
    detail: 'BirthBill pulls unpaid / underpaid births and billing notes into a queue that never ages out.',
  },
  {
    n: 4,
    title: 'System files and chases',
    detail: 'BirthBill prepares Claims Processing, files ChargeSlip/HCFA, and forever-chases unpaid births. You do not work the queue to get paid.',
  },
];

export const CLIENTCARE_BILLING_PRICING = {
  beta: true,
  product: BIRTHBILL_PRODUCT,
  definitions: BIRTHBILL_DEFINITIONS,
  steps: BIRTHBILL_STEPS,
  pilot: {
    oneTimeCents: Number(process.env.BIRTHBILL_PILOT_CENTS || 29700),
    display: process.env.BIRTHBILL_PILOT_DISPLAY || '$297',
    description:
      process.env.BIRTHBILL_PILOT_DESCRIPTION
      || 'BirthBill pilot — connect ClientCare, seed forever-chase, claim-status prep with you in the loop.',
  },
  carePlan: {
    monthlyCents: Number(process.env.BIRTHBILL_CARE_CENTS || 9700),
    display: process.env.BIRTHBILL_CARE_DISPLAY || '$97/mo',
    description: 'Ongoing forever-chase ops seat after the included pilot month',
    includedMonthsOnPilot: Number(process.env.BIRTHBILL_CARE_INCLUDED_MONTHS || 1),
  },
  recoveryShare: {
    pct: Number(process.env.BIRTHBILL_RECOVERY_FEE_PCT || 5),
    display: process.env.BIRTHBILL_RECOVERY_FEE_DISPLAY || '5% of insurance dollars recovered',
    description: 'Only on money BirthBill helped chase back — not on already-paid claims.',
  },
  includes: [
    'Forever-chase queue for unpaid and underpaid insurance births (age is not a write-off)',
    'Hands-off claim-status prep + ChargeSlip/HCFA file attempts (system does the clicking)',
    'Encrypted ClientCare login vault for your practice only',
    'Operator workboard for transparency (optional — midwife is not required to use it)',
    'Browser automation coworker against your ClientCare login',
  ],
  excludes: [
    'Practices not on ClientCare West / ClientCare.net',
    'Legal advice or payer-contract interpretation',
    'Guaranteeing every payer pays on first file (forever-chase continues until paid or written denial)',
  ],
};

export function getBirthBillPilotOfferSummary(pricing = CLIENTCARE_BILLING_PRICING) {
  const months = pricing.carePlan?.includedMonthsOnPilot || 1;
  return `${pricing.pilot.display} pilot (includes first ${months} month) + ${pricing.recoveryShare.display}`;
}

export function getBirthBillDealReasonWhy(pricing = CLIENTCARE_BILLING_PRICING) {
  return `BirthBill is built so the midwife does nothing after connecting ClientCare: the system files and forever-chases until paid or written denial. Pilot is ${pricing.pilot.display} while we tip-prove Sent Bills on every unpaid birth.`;
}

export default CLIENTCARE_BILLING_PRICING;
