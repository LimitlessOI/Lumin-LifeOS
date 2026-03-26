/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-offer-prep-service.js
 * Structured offer-prep recommendations from client constraints, property facts, comps, and market/seller signals.
 */

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function median(values = []) {
  const nums = values.map(numberOrNull).filter((v) => v != null).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function average(values = []) {
  const nums = values.map(numberOrNull).filter((v) => v != null);
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function normalizeComp(comp = {}) {
  return {
    address: comp.address || null,
    sold_price: numberOrNull(comp.sold_price ?? comp.price),
    list_price: numberOrNull(comp.list_price),
    sqft: numberOrNull(comp.sqft),
    dom: numberOrNull(comp.dom),
    status: comp.status || null,
    concession_pct: numberOrNull(comp.concession_pct),
  };
}

function deriveBaseline({ property, comps }) {
  const normalizedComps = comps.map(normalizeComp);
  const soldPrices = normalizedComps.map((comp) => comp.sold_price || comp.list_price).filter(Boolean);
  const concessionPcts = normalizedComps.map((comp) => comp.concession_pct).filter((v) => v != null);
  const domValues = normalizedComps.map((comp) => comp.dom).filter((v) => v != null);
  const listPrice = numberOrNull(property.list_price);
  const medianSold = median(soldPrices);
  const avgDom = average(domValues);
  const avgConcessionPct = average(concessionPcts) || 0;
  const base = medianSold || listPrice || null;
  return {
    normalizedComps,
    medianSold,
    avgDom,
    avgConcessionPct,
    baselinePrice: base,
  };
}

function derivePressure({ property, sellerSignals = {}, baseline }) {
  let pressure = 0;
  const dom = numberOrNull(property.dom);
  if (dom != null) {
    if (dom <= 7) pressure += 3;
    else if (dom <= 21) pressure += 1;
    else if (dom >= 45) pressure -= 2;
    else if (dom >= 75) pressure -= 4;
  }
  if (sellerSignals.multiple_offers) pressure += 4;
  if (sellerSignals.price_reduced) pressure -= 2;
  if (sellerSignals.back_on_market) pressure -= 1;
  if (sellerSignals.vacant) pressure -= 1;
  if (sellerSignals.deadline_days != null) {
    const days = numberOrNull(sellerSignals.deadline_days);
    if (days != null && days <= 2) pressure += 2;
  }
  if (baseline.avgDom != null) {
    if (dom != null && dom < baseline.avgDom) pressure += 1;
    if (dom != null && dom > baseline.avgDom + 15) pressure -= 1;
  }
  return pressure;
}

function buildContingencies(clientProfile = {}) {
  const items = [];
  if (clientProfile.sale_contingency_required) items.push('sale_of_home');
  if (clientProfile.financing_type && clientProfile.financing_type !== 'cash') items.push('loan');
  if (clientProfile.include_appraisal_contingency !== false && clientProfile.financing_type !== 'cash') items.push('appraisal');
  if (clientProfile.include_inspection_contingency !== false) items.push('inspection');
  return items;
}

function recommendationPrice(base, offsetPct, clientProfile = {}) {
  if (base == null) return null;
  const raw = Math.round(base * (1 + offsetPct));
  const maxBudget = numberOrNull(clientProfile.max_budget || clientProfile.approved_budget || clientProfile.max_offer);
  return maxBudget != null ? Math.min(raw, maxBudget) : raw;
}

function confidenceScore({ baseline, comps, pressure, clientProfile }) {
  let score = 55;
  if (baseline.medianSold != null) score += 15;
  if ((comps || []).length >= 3) score += 10;
  if ((comps || []).length >= 5) score += 5;
  if (clientProfile.sale_contingency_required) score -= 5;
  if (Math.abs(pressure) >= 4) score += 5;
  return Math.max(25, Math.min(95, score));
}

function summarizeConstraints(clientProfile = {}) {
  const notes = [];
  if (clientProfile.sale_contingency_required) notes.push('Client must sell current home first');
  if (clientProfile.financing_type) notes.push(`Financing: ${clientProfile.financing_type}`);
  if (clientProfile.close_window_days) notes.push(`Target close window: ${clientProfile.close_window_days} days`);
  if (clientProfile.risk_tolerance) notes.push(`Risk tolerance: ${clientProfile.risk_tolerance}`);
  if (clientProfile.must_haves?.length) notes.push(`Must haves: ${clientProfile.must_haves.join(', ')}`);
  return notes;
}

export function createTCOfferPrepService({ logger = console, callCouncilMember = null } = {}) {
  async function prepareOffer(payload = {}) {
    const property = payload.property || {};
    const clientProfile = payload.clientProfile || payload.client_profile || {};
    const comps = Array.isArray(payload.comps) ? payload.comps : [];
    const sellerSignals = payload.sellerSignals || payload.seller_signals || {};

    const baseline = deriveBaseline({ property, comps });
    const pressure = derivePressure({ property, sellerSignals, baseline });
    const contingencies = buildContingencies(clientProfile);
    const closeDays = numberOrNull(clientProfile.close_window_days) || 21;

    const base = baseline.baselinePrice || numberOrNull(property.list_price) || null;
    const conservativePct = pressure >= 4 ? 0.03 : pressure >= 1 ? 0.015 : -0.03;
    const balancedPct = pressure >= 4 ? 0.01 : pressure >= 1 ? 0 : -0.02;
    const aggressivePct = pressure >= 4 ? 0.04 : pressure >= 1 ? 0.02 : -0.01;

    const options = [
      { label: 'conservative', offer_price: recommendationPrice(base, conservativePct, clientProfile), close_days: closeDays + 7, contingencies },
      { label: 'balanced', offer_price: recommendationPrice(base, balancedPct, clientProfile), close_days: closeDays, contingencies },
      { label: 'aggressive', offer_price: recommendationPrice(base, aggressivePct, clientProfile), close_days: Math.max(14, closeDays - 3), contingencies: contingencies.filter((item) => item !== 'inspection' || clientProfile.risk_tolerance !== 'high') },
    ];

    const likelyAcceptedRange = {
      min: recommendationPrice(base, pressure >= 3 ? 0 : -0.02, clientProfile),
      max: recommendationPrice(base, pressure >= 3 ? 0.04 : 0.01, clientProfile),
    };

    const confidence = confidenceScore({ baseline, comps, pressure, clientProfile });
    const summaryNotes = summarizeConstraints(clientProfile);
    const rationale = [
      base != null ? `Baseline pricing anchored at ${base.toLocaleString()}.` : 'Baseline pricing is thin because comp data is limited.',
      baseline.avgDom != null ? `Comparable DOM average is ${baseline.avgDom.toFixed(0)} days.` : null,
      baseline.avgConcessionPct ? `Average concessions are about ${baseline.avgConcessionPct.toFixed(1)}%.` : null,
      pressure >= 3 ? 'Seller/market pressure reads strong.' : pressure <= -2 ? 'Seller/market pressure reads weaker.' : 'Seller/market pressure reads balanced.',
      ...summaryNotes,
    ].filter(Boolean);

    let narrative = null;
    if (callCouncilMember) {
      try {
        narrative = await callCouncilMember('groq', [
          'Return JSON only with keys summary and risks.',
          `Property: ${property.address || 'unknown'} list price ${property.list_price || 'unknown'}`,
          `Offer options: ${JSON.stringify(options)}`,
          `Likely accepted range: ${JSON.stringify(likelyAcceptedRange)}`,
          `Constraints: ${JSON.stringify(summaryNotes)}`,
        ].join('\n'), { taskType: 'json', maxTokens: 220 });
      } catch {
        narrative = null;
      }
    }

    return {
      ok: true,
      property: {
        address: property.address || null,
        list_price: numberOrNull(property.list_price),
        dom: numberOrNull(property.dom),
      },
      baseline: {
        baseline_price: base,
        median_comp_price: baseline.medianSold,
        average_comp_dom: baseline.avgDom,
        average_concession_pct: baseline.avgConcessionPct,
        comp_count: comps.length,
      },
      client_profile: clientProfile,
      options,
      likely_accepted_range: likelyAcceptedRange,
      confidence,
      confidence_label: confidence >= 75 ? 'high' : confidence >= 55 ? 'medium' : 'low',
      rationale,
      ai_narrative: typeof narrative === 'string' ? narrative : narrative?.content || null,
    };
  }

  return { prepareOffer };
}

export default createTCOfferPrepService;
