/**
 * SYNOPSIS: LifeRE buyer and seller OS — module twin projections.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { fetchBoldTrailPipeline } from './lifere-boldtrail-bridge.js';

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

const OFFER_PREP_CHECKLIST = [
  { id: 'preapproval', label: 'Pre-approval letter current' },
  { id: 'comps', label: 'Comparable sales reviewed' },
  { id: 'terms', label: 'Offer terms aligned with client goals' },
  { id: 'timeline', label: 'Closing timeline confirmed' },
];

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

  function sellerWorkflowStage(listing = {}) {
    if (listing.weekly_report_draft) return 'reporting';
    if ((listing.showing_feedback || []).length >= 2) return 'feedback_review';
    if ((listing.showing_feedback || []).length > 0) return 'showing_active';
    if (listing.listing_health === 'pending') return 'pre_listing';
    return 'active';
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

  async function getBuyerWorkspace({ tenantId = 'default', userId, clientRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { clients: {} };
    const client = twin.clients?.[clientRef];
    if (!client) return { ok: false, error: 'client_not_found' };
    const stage = buyerWorkflowStage(client);
    const prepDone = client.offer_prep_status === 'preparing' || client.offer_prep_status === 'submitted';
    return {
      ok: true,
      client_ref: clientRef,
      stage,
      offer_prep_status: client.offer_prep_status || 'not_started',
      search_criteria: client.search_criteria || {},
      showing_schedule: client.showing_schedule || [],
      offer_prep_checklist: OFFER_PREP_CHECKLIST.map((item) => ({
        ...item,
        done: prepDone || item.id === 'preapproval',
      })),
      label: 'THINK',
    };
  }

  async function getSellerWorkspace({ tenantId = 'default', userId, listingRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { listings: {} };
    const listing = twin.listings?.[listingRef];
    if (!listing) return { ok: false, error: 'listing_not_found' };
    return {
      ok: true,
      listing_ref: listingRef,
      stage: sellerWorkflowStage(listing),
      listing_health: listing.listing_health || 'active',
      showing_count: (listing.showing_feedback || []).length,
      weekly_report_draft: listing.weekly_report_draft || null,
      address: listing.address || listingRef.replace(/_/g, ' '),
      label: 'THINK',
    };
  }

  async function coachObjection({ tenantId = 'default', userId, clientRef, objection = '' }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { clients: {} };
    const client = twin.clients?.[clientRef];
    if (!client) return { ok: false, error: 'client_not_found' };
    const text = String(objection || '').trim() || 'general hesitation';
    const coaching = {
      acknowledge: `I hear your concern about "${text.slice(0, 120)}".`,
      reframe: 'Many buyers pause here — it usually means you want clarity before committing.',
      question: 'What would need to be true for you to feel confident moving forward this week?',
      fair_housing_reminder: 'Avoid steering or assumptions about protected classes; focus on needs and timeline.',
    };
    const note = { at: new Date().toISOString(), objection: text, coaching };
    await upsertBuyer({
      tenantId,
      userId,
      clientRef,
      patch: { objection_notes: [...(client.objection_notes || []), note] },
    });
    return { ok: true, coaching, client_ref: clientRef, label: 'THINK' };
  }

  async function generateWeeklyReport({ tenantId = 'default', userId, listingRef }) {
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'seller' }) || { listings: {} };
    const listing = twin.listings?.[listingRef];
    if (!listing) return { ok: false, error: 'listing_not_found' };
    const showings = (listing.showing_feedback || []).length;
    const draft = listing.weekly_report_draft
      || `Weekly seller update for ${listingRef}: ${showings} showing(s) this period. `
        + 'Interest level steady; recommend reviewing price feedback before next open house.';
    await upsertSeller({ tenantId, userId, listingRef, patch: { weekly_report_draft: draft } });
    return { ok: true, listing_ref: listingRef, weekly_report_draft: draft, label: 'THINK' };
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

  async function syncBuyersFromBoldTrail({ tenantId = 'default', userId, limit = 25 } = {}) {
    const pipeline = await fetchBoldTrailPipeline({ limit });
    if (!pipeline.ok) {
      return { ok: false, error: pipeline.reason || 'boldtrail_unavailable', synced: 0, label: 'THINK' };
    }
    const twin = twinStore.readTwin({ tenantId, userId, moduleKey: 'buyer' }) || { ...BUYER_DEFAULT, clients: {} };
    twin.clients = twin.clients || {};
    let synced = 0;
    for (const contact of (pipeline.contacts || []).slice(0, limit)) {
      if (!['new', 'prospect', 'active', 'client'].includes(contact.status_label)) continue;
      const ref = `bt_${contact.id}`;
      const existing = twin.clients[ref] || {};
      twin.clients[ref] = {
        ...existing,
        display_name: contact.name,
        boldtrail_contact_id: contact.id,
        status_label: contact.status_label,
        phone: contact.phone || existing.phone || null,
        email: contact.email || existing.email || null,
        search_criteria: existing.search_criteria || {},
        showing_schedule: existing.showing_schedule || [],
        offer_prep_status: existing.offer_prep_status || 'not_started',
        synced_from: 'boldtrail',
        updated_at: new Date().toISOString(),
      };
      synced += 1;
    }
    await twinStore.writeTwin({
      tenantId,
      userId,
      moduleKey: 'buyer',
      twinKey: 'buyer',
      payload: twin,
      receiptMeta: { source: 'boldtrail_buyer_sync', synced },
    });
    return { ok: true, synced, clients: Object.keys(twin.clients).length, label: 'KNOW' };
  }

  return {
    getBuyer,
    upsertBuyer,
    getSeller,
    upsertSeller,
    listBuyerClients,
    listSellerListings,
    buyerWorkflowStage,
    sellerWorkflowStage,
    advanceBuyerStage,
    advanceSellerStage,
    getBuyerWorkspace,
    getSellerWorkspace,
    coachObjection,
    generateWeeklyReport,
    syncBuyersFromBoldTrail,
  };
}
