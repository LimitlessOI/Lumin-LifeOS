/**
 * SYNOPSIS: CrmProvider abstraction — every product talks to "the CRM" through one interface.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 *
 * Doctrine: "Integrate first. Replace later." BoldTrail (kvCORE) is free, so it is the
 * system of record NOW. Products never import BoldTrail directly — they call getCrmProvider()
 * and receive a normalized interface. The day BoldTrail becomes the bottleneck, we add a new
 * implementation behind this same interface and swap CRM_PROVIDER — zero changes to consumers.
 *
 * The intelligence layer (segmentation, super-fan/referral scoring, enrichment) lives ON TOP
 * of this interface in services/crm-intelligence.js — that is where we differentiate, not in
 * the contact store itself.
 */
import {
  isBoldTrailAPIAvailable,
  probeBoldTrailApi,
  listContactsFiltered,
  findContactByEmail as btFindContactByEmail,
  createOrUpdateContact as btCreateOrUpdateContact,
  addContactNote as btAddContactNote,
  tagContact as btTagContact,
  extractContactsFromResponse,
  normalizeBoldTrailContact,
} from '../src/integrations/boldtrail.js';

/**
 * The normalized contact shape every provider must return.
 * @typedef {Object} CrmContact
 * @property {string} id
 * @property {string} name
 * @property {string|null} email
 * @property {string|null} phone
 * @property {number|null} status        raw provider status code
 * @property {string} statusLabel        normalized: new|prospect|active|client|sphere|pending|closed|unknown
 * @property {string|null} source
 * @property {string|null} updatedAt
 * @property {Object} raw                 original provider payload
 */

/**
 * BoldTrail (kvCORE) implementation of the CrmProvider interface.
 * Thin wrapper over src/integrations/boldtrail.js — no business logic here.
 */
function createBoldTrailCrmProvider({ logger } = {}) {
  const log = (level, msg, meta) => {
    const fn = logger && typeof logger[level] === 'function' ? logger[level].bind(logger) : null;
    if (fn) fn(meta ? { message: msg, ...meta } : { message: msg });
  };

  return {
    name: 'boldtrail',

    isAvailable() {
      return isBoldTrailAPIAvailable();
    },

    async status() {
      if (!isBoldTrailAPIAvailable()) {
        return { provider: 'boldtrail', connected: false, configured: false, reason: 'missing_token' };
      }
      const probe = await probeBoldTrailApi();
      return {
        provider: 'boldtrail',
        connected: !!probe.ok,
        configured: !!probe.configured,
        reason: probe.reason || null,
        status: probe.status || null,
        base_url: probe.baseUrl || null,
      };
    },

    async listContacts({ limit = 50, page = 1, status = null } = {}) {
      const res = await listContactsFiltered({ limit, page, status });
      if (!res.ok) return { ok: false, reason: res.reason || 'list_failed', contacts: [] };
      const contacts = extractContactsFromResponse(res.data)
        .map(normalizeBoldTrailContact)
        .filter(Boolean)
        .map(mapNormalizedToCrmContact);
      return { ok: true, contacts };
    },

    async findContactByEmail(email) {
      const hit = await btFindContactByEmail(email);
      return hit ? mapNormalizedToCrmContact(hit) : null;
    },

    async upsertContact(contact) {
      const res = await btCreateOrUpdateContact(contact);
      return {
        ok: !!res.ok,
        contact_id: res.contact_id || null,
        reason: res.ok ? null : (res.reason || 'upsert_failed'),
        status: res.status || null,
      };
    },

    async addNote(contactId, text) {
      const res = await btAddContactNote(contactId, text);
      return { ok: !!res.ok, reason: res.ok ? null : (res.reason || 'note_failed') };
    },

    async addTag(contactId, tag) {
      const res = await btTagContact(contactId, tag);
      return { ok: !!res.ok, reason: res.ok ? null : (res.reason || 'tag_failed') };
    },
  };
}

/**
 * Map the boldtrail-normalized contact into the provider-agnostic CrmContact shape.
 * @returns {CrmContact}
 */
function mapNormalizedToCrmContact(c) {
  return {
    id: String(c.id),
    name: c.name,
    email: c.email || null,
    phone: c.phone || null,
    status: c.status ?? null,
    statusLabel: c.status_label || 'unknown',
    source: c.source || null,
    updatedAt: c.updated_at || null,
    raw: c,
  };
}

const PROVIDERS = {
  boldtrail: createBoldTrailCrmProvider,
};

let cachedProvider = null;
let cachedProviderName = null;

/**
 * Return the active CRM provider. Selected via CRM_PROVIDER env (default 'boldtrail').
 * Cached per provider name so repeated calls are cheap.
 */
export function getCrmProvider({ logger } = {}) {
  const requested = (process.env.CRM_PROVIDER || 'boldtrail').trim().toLowerCase();
  const name = PROVIDERS[requested] ? requested : 'boldtrail';
  if (cachedProvider && cachedProviderName === name) return cachedProvider;
  cachedProvider = PROVIDERS[name]({ logger });
  cachedProviderName = name;
  return cachedProvider;
}

/** List provider names registered behind the interface (for status/diagnostics). */
export function listCrmProviders() {
  return Object.keys(PROVIDERS);
}

/** Test seam — reset the cached provider (used when env changes between calls). */
export function _resetCrmProviderCache() {
  cachedProvider = null;
  cachedProviderName = null;
}
