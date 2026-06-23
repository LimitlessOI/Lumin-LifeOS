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

  function buyerWorkflowStage(buyer = {}) {
    if (buyer.offer_prep_status === 'submitted') return 'offer_submitted';
    if (buyer.offer_prep_status === 'preparing') return 'offer_prep';
    if ((buyer.showing_schedule || []).length > 0) return 'showing_active';
    if (Object.keys(buyer.search_criteria || {}).length > 0) return 'searching';
    return 'intake';
  }

  async function listBuyerClients({ tenantId = 'default', userId }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { clients: {} };
    const clients = Object.entries(twin.clients || {}).map(([ref, data]) => ({
      client_ref: ref,
      stage: buyerWorkflowStage(data),
      ...data,
    }));
    return { ok: true, clients };
  }

  async function listSellerListings({ tenantId = 'default', userId }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { listings: {} };
    const listings = Object.entries(twin.listings || {}).map(([ref, data]) => ({
      listing_ref: ref,
      stage: sellerWorkflowStage(data),
      ...data,
    }));
    return { ok: true, listings };
  }

  function sellerWorkflowStage(listing = {}) {
    if (listing.weekly_report_draft) return 'reporting';
    if ((listing.showing_feedback || []).length >= 2) return 'feedback_review';
    if ((listing.showing_feedback || []).length > 0) return 'showing_active';
    if (listing.listing_health === 'pending') return 'pre_listing';
    return 'active';
  }

  async function advanceSellerStage({ tenantId = 'default', userId, listingRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { listings: {} };
    const listing = twin.listings?.[listingRef];
    if (!listing) return { ok: false, error: 'listing_not_found' };

    const stage = sellerWorkflowStage(listing);
    const patches = {
      pre_listing: { listing_health: 'active' },
      active: { showing_feedback: [...(listing.showing_feedback || []), { at: new Date().toISOString(), note: 'Showing completed' }] },
      showing_active: { showing_feedback: [...(listing.showing_feedback || []), { at: new Date().toISOString(), note: 'Additional showing feedback' }] },
      feedback_review: { weekly_report_draft: `Weekly update for ${listingRef}: strong interest, pricing holding.` },
      reporting: { listing_health: 'active', weekly_report_draft: listing.weekly_report_draft },
    };
    const patch = patches[stage] || {};
    const result = await upsertSeller({ tenantId, userId, listingRef, patch });
    const updated = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' })?.listings?.[listingRef];
    return {
      ...result,
      prior_stage: stage,
      new_stage: sellerWorkflowStage(updated || {}),
    };
  }

  async function advanceBuyerStage({ tenantId = 'default', userId, clientRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { clients: {} };
    const client = twin.clients?.[clientRef];
    if (!client) return { ok: false, error: 'client_not_found' };

    const stage = buyerWorkflowStage(client);
    const patches = {
      intake: { search_criteria: { ...(client.search_criteria || {}), beds: client.search_criteria?.beds || 3, area: client.search_criteria?.area || 'local' } },
      searching: { showing_schedule: [...(client.showing_schedule || []), { at: new Date().toISOString(), note: 'Showing scheduled' }] },
      showing_active: { offer_prep_status: 'preparing' },
      offer_prep: { offer_prep_status: 'submitted' },
      offer_submitted: { offer_prep_status: 'submitted' },
    };
    const patch = patches[stage] || {};
    const result = await upsertBuyer({ tenantId, userId, clientRef, patch });
    const updated = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' })?.clients?.[clientRef];
    return {
      ...result,
      prior_stage: stage,
      new_stage: buyerWorkflowStage(updated || {}),
    };
  }

  return {
    getBuyer, upsertBuyer, getSeller, upsertSeller,
    listBuyerClients, listSellerListings, buyerWorkflowStage, sellerWorkflowStage,
    advanceBuyerStage, advanceSellerStage,
  };
}
