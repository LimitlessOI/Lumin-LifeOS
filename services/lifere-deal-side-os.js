/**
 * SYNOPSIS: LifeRE buyer and seller OS — module twin projections.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';

const BUYER_DEFAULT = {
  schema: 'lifere_buyer_twin_v1',
  search_criteria: {},
  showing_schedule: [],
  objection_notes: [],
  offer_prep_status: 'not_started',
};

const SELLER_DEFAULT = {
  schema: 'lifere_seller_twin_v1',
  listing_health: 'active',
  showing_feedback: [],
  weekly_report_draft: null,
  price_guidance_notes: [],
};

export function createLifeREDealSideOS({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  async function getBuyer({ tenantId = 'default', userId, clientRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { ...BUYER_DEFAULT };
    const client = twinStore.readTwin({ tenantId, userId, moduleKey: 'client' }) || {};
    return {
      ok: true,
      client_ref: clientRef,
      search_criteria: twin.clients?.[clientRef]?.search_criteria || twin.search_criteria,
      showing_schedule: twin.clients?.[clientRef]?.showing_schedule || twin.showing_schedule,
      objection_coaching: twin.clients?.[clientRef]?.objection_notes || [],
      client_projection: client.clients?.[clientRef] || null,
      label: 'THINK',
    };
  }

  async function upsertBuyer({ tenantId = 'default', userId, clientRef, patch }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { ...BUYER_DEFAULT, clients: {} };
    twin.clients = twin.clients || {};
    twin.clients[clientRef] = { ...(twin.clients[clientRef] || {}), ...patch, updated_at: new Date().toISOString() };
    await twinStore.writeTwin({ tenantId, userId, moduleKey: 'buyer', twinKey: 'buyer', payload: twin });
    return { ok: true, client_ref: clientRef, buyer: twin.clients[clientRef] };
  }

  async function getSeller({ tenantId = 'default', userId, listingRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { ...SELLER_DEFAULT };
    const listing = twinStore.readTwin({ tenantId, userId, moduleKey: 'listing' }) || {};
    return {
      ok: true,
      listing_ref: listingRef,
      listing_health: twin.listings?.[listingRef]?.listing_health || twin.listing_health,
      showing_feedback: twin.listings?.[listingRef]?.showing_feedback || [],
      weekly_report: twin.listings?.[listingRef]?.weekly_report_draft || null,
      market_context: listing.listings?.[listingRef] || null,
      label: 'THINK',
    };
  }

  async function upsertSeller({ tenantId = 'default', userId, listingRef, patch }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { ...SELLER_DEFAULT, listings: {} };
    twin.listings = twin.listings || {};
    twin.listings[listingRef] = { ...(twin.listings[listingRef] || {}), ...patch, updated_at: new Date().toISOString() };
    await twinStore.writeTwin({ tenantId, userId, moduleKey: 'seller', twinKey: 'seller', payload: twin });
    return { ok: true, listing_ref: listingRef, seller: twin.listings[listingRef] };
  }

  return { getBuyer, upsertBuyer, getSeller, upsertSeller };
}
