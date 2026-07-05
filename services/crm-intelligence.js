/**
 * SYNOPSIS: CRM intelligence layer — segmentation + super-fan/referral scoring over any CrmProvider.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 *
 * This is where we differentiate. BoldTrail (the provider) is just a contact store; the value is
 * what we layer on top: which contacts are hot/warm/cold, and which are most likely to REFER us
 * business (super-fans). Provider-agnostic — reads only normalized CrmContact objects from
 * getCrmProvider(), so it keeps working when the underlying CRM is swapped.
 */
import { getCrmProvider } from './crm-provider.js';

const SEGMENT_RULES = {
  hot: { label: 'Hot', why: 'new or active — engage now', statuses: ['new', 'active'] },
  warm: { label: 'Warm', why: 'in pipeline — conversion window open', statuses: ['prospect', 'pending'] },
  clients: { label: 'Clients', why: 'won — nurture + expand', statuses: ['client'] },
  sphere: { label: 'Sphere', why: 'relationship base — referral source', statuses: ['sphere'] },
  cold: { label: 'Cold', why: 'closed/unknown — re-engage or archive', statuses: ['closed', 'unknown'] },
};

function segmentFor(statusLabel) {
  for (const [key, rule] of Object.entries(SEGMENT_RULES)) {
    if (rule.statuses.includes(statusLabel)) return key;
  }
  return 'cold';
}

/**
 * Super-fan / referral propensity score (0-100).
 * The engine identifies clients most likely to refer, so we can treat them accordingly —
 * early access, perks, promotional tools. Deterministic and explainable (no black box).
 */
function referralScore(contact) {
  let score = 0;
  const reasons = [];

  if (contact.statusLabel === 'client') { score += 45; reasons.push('is an existing client'); }
  else if (contact.statusLabel === 'sphere') { score += 35; reasons.push('in personal sphere'); }
  else if (contact.statusLabel === 'active') { score += 20; reasons.push('active deal in motion'); }

  if (contact.email) { score += 10; reasons.push('reachable by email'); }
  if (contact.phone) { score += 10; reasons.push('reachable by phone'); }

  const src = String(contact.source || '').toLowerCase();
  if (src.includes('referral')) { score += 20; reasons.push('came in via referral (referrers refer)'); }
  if (src.includes('sphere') || src.includes('past')) { score += 10; reasons.push('relationship-sourced'); }

  const recency = recencyBoost(contact.updatedAt);
  if (recency > 0) { score += recency; reasons.push('recently active'); }

  score = Math.max(0, Math.min(100, score));
  return { score, tier: referralTier(score), reasons };
}

function recencyBoost(updatedAt) {
  if (!updatedAt) return 0;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return 0;
  const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 15;
  if (days <= 30) return 8;
  if (days <= 90) return 3;
  return 0;
}

function referralTier(score) {
  if (score >= 70) return 'super_fan';
  if (score >= 45) return 'advocate';
  if (score >= 25) return 'potential';
  return 'unlikely';
}

export function createCrmIntelligence({ logger } = {}) {
  const provider = getCrmProvider({ logger });

  async function loadContacts({ limit = 200 } = {}) {
    const res = await provider.listContacts({ limit });
    if (!res.ok) return { ok: false, reason: res.reason, contacts: [] };
    return { ok: true, contacts: res.contacts };
  }

  /** Bucket the pipeline into hot/warm/clients/sphere/cold with counts. */
  async function segments({ limit = 200 } = {}) {
    const { ok, reason, contacts } = await loadContacts({ limit });
    if (!ok) return { ok: false, reason, provider: provider.name };

    const buckets = {};
    for (const key of Object.keys(SEGMENT_RULES)) {
      buckets[key] = { ...SEGMENT_RULES[key], count: 0, contacts: [] };
    }
    for (const c of contacts) {
      const seg = segmentFor(c.statusLabel);
      buckets[seg].count += 1;
      buckets[seg].contacts.push(c);
    }
    return { ok: true, provider: provider.name, total: contacts.length, segments: buckets };
  }

  /** Rank contacts by referral propensity — the super-fan engine. */
  async function superFans({ limit = 200, top = 20, minScore = 45 } = {}) {
    const { ok, reason, contacts } = await loadContacts({ limit });
    if (!ok) return { ok: false, reason, provider: provider.name };

    const ranked = contacts
      .map((c) => ({ contact: c, ...referralScore(c) }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, top);

    return {
      ok: true,
      provider: provider.name,
      count: ranked.length,
      super_fans: ranked,
    };
  }

  return { segments, superFans, _referralScore: referralScore, _segmentFor: segmentFor };
}
