/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-ops-service.js
 * Actionable operations layer for ClientCare billing recovery.
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { parseInsuranceCardText, cleanExtractedValue } from './insurance-card-parse.js';

const OCR_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif']);

function normalizeIntent(text = '') {
  return String(text || '').toLowerCase().trim();
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function ratio(a, b) {
  const numerator = Number(a || 0);
  const denominator = Number(b || 0);
  if (!denominator) return null;
  return Number((numerator / denominator).toFixed(4));
}

function bucketByAge(days) {
  if (days == null) return 'unknown';
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

function summarizeTopActions(actions = [], limit = 5) {
  return actions.slice(0, limit).map((item) => ({
    id: item.id,
    patient_name: item.patient_name,
    payer_name: item.payer_name,
    summary: item.summary,
    priority: item.priority,
    status: item.status,
  }));
}

function isMissingRelation(error) {
  return /does not exist|relation .* does not exist/i.test(String(error?.message || ''));
}

function findWorkflow(workflowId, summary = {}) {
  return (summary.workflowPlaybooks || []).find((item) => item.id === workflowId) || null;
}

function extractClaimId(text = '') {
  const match = String(text || '').match(/\bclaim\s*#?\s*(\d+)\b/i) || String(text || '').match(/\b(\d{2,})\b/);
  return match ? match[1] : null;
}

/** Human-readable summary posted to ClientCare billing notes by runFullClientcareCardVobPipeline (and available as fallback copy-paste text). */
function buildClientcareNoteSuggestion({
  flow = 'pipeline',
  clientHref = '',
  clientLabel = '',
  apply = false,
  vobFlow = null,
  proposedCard = {},
  cardRepair = null,
  vobProposed = {},
  vobRepair = null,
} = {}) {
  const lines = [];
  lines.push(`LifeOS billing — ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`);
  if (clientLabel) lines.push(`Client: ${clientLabel}`);
  if (clientHref) lines.push(`Billing URL: ${clientHref}`);
  lines.push('');
  lines.push(
    flow === 'pipeline'
      ? 'Flow: Full ClientCare run — optional card OCR → fill empty insurance fields → click VOB/eligibility → re-read page → fill remaining empty fields from VOB text.'
      : 'Flow: Reconcile — inspect portal, merge card image + pasted notes into empty fields only.',
  );
  lines.push(`Wrote changes in ClientCare UI: ${apply ? 'yes (apply was on)' : 'no — preview / dry run only'}`);
  lines.push('');

  if (flow === 'pipeline' && vobFlow) {
    if (vobFlow.vob_retry_rounds && vobFlow.vob_retry_rounds > 1) {
      lines.push(
        `VOB runs: ${vobFlow.vob_retry_rounds} full browser session(s) (retries until a response is detected or the configured limit).`,
      );
    }
    lines.push(
      vobFlow.vob_received
        ? 'VOB / eligibility: A response was detected on the billing page after the automated click sequence.'
        : 'VOB / eligibility: No automated confirmation that a response loaded — please verify benefits/eligibility manually in ClientCare.',
    );
    if (vobFlow.error) lines.push(`Browser step message: ${String(vobFlow.error)}`);
    lines.push('');
  }

  const cardKeys = Object.keys(proposedCard || {}).filter((k) => k !== 'insurance_match_hints');
  if (cardKeys.length) {
    lines.push(`Empty fields we attempted to fill from card/notes: ${cardKeys.join(', ')}.`);
  }
  if (cardRepair?.ok && apply && !cardRepair?.dryRun) {
    lines.push('Card-merge save: attempted in ClientCare.');
  } else if (cardKeys.length && !apply) {
    lines.push('Card-merge: not saved (dry run).');
  }

  const vobKeys = Object.keys(vobProposed || {}).filter((k) => k !== 'insurance_match_hints');
  if (vobKeys.length) {
    lines.push(`Empty fields we attempted to fill from VOB page text: ${vobKeys.join(', ')}.`);
  }
  if (vobRepair?.ok && apply && !vobRepair?.dryRun) {
    lines.push('VOB text save: attempted in ClientCare.');
  } else if (vobKeys.length && !apply) {
    lines.push('VOB text merge: not saved (dry run).');
  }

  lines.push('');
  lines.push(
    'System log: A snapshot is also stored in Neon (clientcare_vob_prospects) when the table exists — not the same as this ClientCare note field.',
  );
  return lines.join('\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Outer rounds × inner click attempts — tune with CLIENTCARE_VOB_RETRY_ROUNDS / CLIENTCARE_VOB_INNER_ATTEMPTS (Railway). */
function readClientcareVobRetryEnv() {
  const rounds = Math.min(25, Math.max(1, Number(process.env.CLIENTCARE_VOB_RETRY_ROUNDS) || 7));
  const inner = Math.min(12, Math.max(2, Number(process.env.CLIENTCARE_VOB_INNER_ATTEMPTS) || 5));
  return { rounds, inner };
}

function mergeVobFlowAttempts(attempts = []) {
  const successful = attempts.filter((a) => a && a.ok && a.vob_received);
  const lastOk = [...attempts].reverse().find((a) => a && a.ok);
  const base = successful.length ? successful[successful.length - 1] : lastOk || attempts[attempts.length - 1];
  if (!base) {
    return {
      vob_received: false,
      vob_retry_rounds: attempts.length,
      vob_exhausted_retries: true,
      vob_attempts_summary: [],
    };
  }
  return {
    ...base,
    vob_received: successful.length > 0,
    vob_retry_rounds: attempts.length,
    vob_exhausted_retries: successful.length === 0 && attempts.length > 0,
    vob_attempts_summary: attempts.map((a, idx) => ({
      round: idx + 1,
      ok: Boolean(a?.ok),
      vob_received: Boolean(a?.vob_received),
      error: a?.error || null,
    })),
  };
}

function normalizeRepairUpdates(input = {}) {
  const updates = {};
  const insuranceSlot = Number(input.insurance_slot);
  if (Number.isFinite(insuranceSlot) && insuranceSlot >= 0) updates.insurance_slot = Math.floor(insuranceSlot);
  if (input.client_billing_status) updates.client_billing_status = String(input.client_billing_status).trim();
  if (input.bill_provider_type) updates.bill_provider_type = String(input.bill_provider_type).trim();
  if (input.payment_status) updates.payment_status = String(input.payment_status).trim().toLowerCase();
  if (input.insurance_name) updates.insurance_name = String(input.insurance_name).trim();
  if (input.member_id) updates.member_id = String(input.member_id).trim();
  if (input.subscriber_name) updates.subscriber_name = String(input.subscriber_name).trim();
  if (input.payor_id) updates.payor_id = String(input.payor_id).trim();
  if (input.insurance_priority) updates.insurance_priority = String(input.insurance_priority).trim();
  if (input.relationship_to_insured) updates.relationship_to_insured = String(input.relationship_to_insured).trim();
  if (input.group_number) updates.group_number = String(input.group_number).trim();
  if (input.copay_amount) updates.copay_amount = String(input.copay_amount).trim();
  if (input.deductible_remaining_amount) updates.deductible_remaining_amount = String(input.deductible_remaining_amount).trim();
  if (input.insurance_match_hints && typeof input.insurance_match_hints === 'object') {
    updates.insurance_match_hints = {
      insurance_name: String(input.insurance_match_hints.insurance_name || '').trim(),
      member_id: String(input.insurance_match_hints.member_id || '').trim(),
      subscriber_name: String(input.insurance_match_hints.subscriber_name || '').trim(),
      payor_id: String(input.insurance_match_hints.payor_id || '').trim(),
      insurance_priority: String(input.insurance_match_hints.insurance_priority || '').trim(),
      group_number: String(input.insurance_match_hints.group_number || '').trim(),
      relationship: String(input.insurance_match_hints.relationship || '').trim(),
    };
  }
  return updates;
}

function normalizePersonName(n) {
  return String(n || '')
    .toLowerCase()
    .replace(/[^a-z\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractClientLabelFromInspect(inspect) {
  const headings = inspect?.page?.headings || [];
  const direct = headings.find((h) => h && !/billing|insurance|claim|payment|tab/i.test(String(h)));
  if (direct) return String(direct).trim().slice(0, 200);
  const tp = inspect?.page?.textPreview || '';
  const m = tp.match(/(?:client|patient)\s*[:\-]\s*([^\n]+)/i);
  if (m) return m[1].trim().slice(0, 200);
  return '';
}

function mergeCardAndNotesExtractions(cardExtracted, notesText) {
  const fromNotes = String(notesText || '').trim() ? parseInsuranceCardText(String(notesText)) : null;
  const c = cardExtracted && typeof cardExtracted === 'object' ? cardExtracted : {};
  const n = fromNotes || {};
  const take = (key) => {
    const a = String(c[key] || '').trim();
    const b = String(n[key] || '').trim();
    if (a) return { value: a, source: 'card' };
    if (b) return { value: b, source: 'notes' };
    return { value: '', source: null };
  };
  const keys = [
    'payer_name',
    'member_id',
    'group_number',
    'subscriber_name',
    'support_phone',
    'effective_date',
    'plan_name',
    'deductible_inn',
    'coinsurance_specialist_pct',
    'coinsurance_inn_pct',
    'payer_id',
  ];
  const merged = {};
  const sources = {};
  for (const k of keys) {
    const { value, source } = take(k);
    merged[k] = value;
    if (source) sources[k] = source;
  }
  return { merged, notesRawExtracted: fromNotes, sources };
}

function assessDependentCoverage({ clientLabel, primaryCoverage, merged }) {
  const relationship = String(primaryCoverage?.relationship || '').trim();
  const relLower = relationship.toLowerCase();
  const subscriber = String(primaryCoverage?.subscriberName || merged?.subscriber_name || '').trim();
  const clientNorm = normalizePersonName(clientLabel);
  const subNorm = normalizePersonName(subscriber);

  let role = 'unknown';
  const notes = [];

  if (/dependent|child|son|daughter|minor|\bstudent\b|under\s*26/.test(relLower)) {
    role = 'dependent_coverage';
    notes.push('ClientCare relationship reads as dependent-type coverage.');
  } else if (/\bself\b/i.test(relLower) || /^self$/i.test(relationship)) {
    role = 'subscriber_self';
    notes.push('ClientCare relationship reads as self/subscriber.');
  }

  if (role === 'unknown' && subscriber && clientNorm && subNorm && clientNorm !== subNorm && clientNorm.length > 2) {
    role = 'likely_parent_plan';
    notes.push('Subscriber name differs from the client heading — review for parent/guardian policy (common for dependents through age 26).');
  }

  let suggested_relationship = '';
  if (role === 'likely_parent_plan' && !relationship) {
    suggested_relationship = 'Child';
  }

  return {
    role,
    relationship_in_portal: relationship || null,
    subscriber_name: subscriber || null,
    client_label: clientLabel || null,
    notes,
    suggested_relationship,
  };
}

function buildFillOnlyUpdates({ primaryCoverage, merged, assessment, insuranceSlot, insurancePreviewLength }) {
  const proposed = {};
  const gaps = [];
  const slot = Math.max(0, Number(insuranceSlot) || 0);

  const addIfMissing = (field, currentVal, targetVal, sourceTag) => {
    const t = String(targetVal || '').trim();
    if (!t) return;
    const c = String(currentVal || '').trim();
    if (c) return;
    proposed[field] = t;
    gaps.push({ field, source: sourceTag });
  };

  addIfMissing('insurance_name', primaryCoverage?.insuranceName, merged.payer_name, 'card_or_notes');
  addIfMissing('member_id', primaryCoverage?.memberId, merged.member_id, 'card_or_notes');
  addIfMissing('subscriber_name', primaryCoverage?.subscriberName, merged.subscriber_name, 'card_or_notes');
  addIfMissing('group_number', primaryCoverage?.groupNumber, merged.group_number, 'card_or_notes');

  if (assessment.suggested_relationship && !String(primaryCoverage?.relationship || '').trim()) {
    proposed.relationship_to_insured = assessment.suggested_relationship;
    gaps.push({ field: 'relationship_to_insured', source: 'inference' });
  }

  if (!Object.keys(proposed).length) {
    return { proposed: {}, gaps: [] };
  }

  proposed.insurance_match_hints = {
    insurance_name: primaryCoverage?.insuranceName || '',
    member_id: primaryCoverage?.memberId || '',
    subscriber_name: primaryCoverage?.subscriberName || '',
    payor_id: primaryCoverage?.payorId || '',
    insurance_priority: primaryCoverage?.priority || '',
    group_number: primaryCoverage?.groupNumber || '',
    relationship: primaryCoverage?.relationship || '',
  };

  if (insurancePreviewLength > 1) {
    proposed.insurance_slot = slot;
  }

  return { proposed, gaps };
}

function billingFieldHasValue(billingFields, pattern) {
  const f = (billingFields || []).find((row) => pattern.test(String(row.label || '')));
  return Boolean(String(f?.value || '').trim());
}

/** Map parsed ClientCare VOB/eligibility text + current empty fields → repair patch (fill gaps only). */
function buildVobRepairProposal({
  vobExtraction = {},
  primaryCoverage = {},
  billingFields = [],
  insuranceSlot = 0,
  insurancePreviewLength = 1,
}) {
  const proposed = {};
  const ins = (k) => String(primaryCoverage?.[k] || '').trim();

  if (!ins('insuranceName') && (vobExtraction.plan_name || vobExtraction.insurance_name)) {
    proposed.insurance_name = String(vobExtraction.plan_name || vobExtraction.insurance_name).trim();
  }
  if (!ins('memberId') && vobExtraction.member_id) {
    proposed.member_id = String(vobExtraction.member_id).trim();
  }
  if (!ins('groupNumber') && vobExtraction.group_number) {
    proposed.group_number = String(vobExtraction.group_number).trim();
  }

  if (!billingFieldHasValue(billingFields, /\bcopay\b/i) && vobExtraction.copay) {
    proposed.copay_amount = String(vobExtraction.copay).trim();
  }
  if (!billingFieldHasValue(billingFields, /deductible/i) && vobExtraction.deductible_remaining) {
    proposed.deductible_remaining_amount = String(vobExtraction.deductible_remaining).trim();
  }

  if (!Object.keys(proposed).length) return {};

  proposed.insurance_match_hints = {
    insurance_name: primaryCoverage?.insuranceName || '',
    member_id: primaryCoverage?.memberId || '',
    subscriber_name: primaryCoverage?.subscriberName || '',
    payor_id: primaryCoverage?.payorId || '',
    insurance_priority: primaryCoverage?.priority || '',
    group_number: primaryCoverage?.groupNumber || '',
    relationship: primaryCoverage?.relationship || '',
  };
  if (insurancePreviewLength > 1) proposed.insurance_slot = insuranceSlot;
  return proposed;
}

async function tryImageOCR(filePath, logger = console) {
  try {
    // tesseract.js v4.1.x in this build requires explicit loadLanguage + initialize
    // (createWorker('eng') shorthand does not auto-init in this package version)
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const result = await worker.recognize(filePath);
    await worker.terminate();
    return cleanExtractedValue(result?.data?.text || '');
  } catch (error) {
    logger.warn?.({ err: error.message, filePath }, '[CLIENTCARE-OPS] insurance card OCR failed');
    return '';
  }
}

function detectCardUploadKind(fileBuffer, fileName = '') {
  const ext = String(path.extname(fileName || '') || '').toLowerCase();
  if (fileBuffer?.subarray?.(0, 4)?.toString?.() === '%PDF') {
    return { kind: 'pdf', ext: '.pdf' };
  }
  if (OCR_IMAGE_EXTS.has(ext)) {
    return { kind: 'image', ext };
  }
  return { kind: 'image', ext: ext || '.png' };
}

async function normalizeImageBufferForOCR(fileBuffer, logger = console) {
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;
    return await sharp(fileBuffer, { animated: true, pages: 1 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  } catch (error) {
    logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] image normalization skipped');
    return fileBuffer;
  }
}

async function extractTextFromPdfBuffer(fileBuffer, logger = console) {
  let parsedText = '';
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const parsed = await pdfParse(fileBuffer);
    parsedText = cleanExtractedValue(parsed?.text || '');
    if (parsedText.length >= 24) return parsedText;
  } catch (error) {
    logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] pdf text extraction failed');
  }

  try {
    const puppeteerModule = await import('puppeteer');
    const puppeteer = puppeteerModule.default || puppeteerModule;
    const tmpPdfPath = path.join(os.tmpdir(), `clientcare-insurance-card-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    const tmpPngPath = path.join(os.tmpdir(), `clientcare-insurance-card-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
    let browser = null;
    try {
      await fs.writeFile(tmpPdfPath, fileBuffer);
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 1.5 });
      await page.goto(`file://${tmpPdfPath}`, { waitUntil: 'networkidle0', timeout: 20000 });
      await page.screenshot({ path: tmpPngPath, type: 'png', fullPage: true });
      const ocrText = await tryImageOCR(tmpPngPath, logger);
      if (ocrText) return ocrText;
    } finally {
      await browser?.close?.().catch(() => {});
      await fs.unlink(tmpPdfPath).catch(() => {});
      await fs.unlink(tmpPngPath).catch(() => {});
    }
  } catch (error) {
    logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] pdf screenshot fallback failed');
  }

  if (parsedText) return parsedText;
  throw new Error('PDF upload could not be read. Try a JPEG, PNG, HEIC, WEBP, TIFF, or a text-based PDF.');
}

async function extractInsuranceCardText({ fileBuffer, fileName = 'insurance-card', logger = console } = {}) {
  const detected = detectCardUploadKind(fileBuffer, fileName);
  if (detected.kind === 'pdf') {
    return extractTextFromPdfBuffer(fileBuffer, logger);
  }

  const normalizedBuffer = await normalizeImageBufferForOCR(fileBuffer, logger);
  const tmpPath = path.join(os.tmpdir(), `clientcare-insurance-card-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    await fs.writeFile(tmpPath, normalizedBuffer);
    return await tryImageOCR(tmpPath, logger);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

function buildInsuranceDecision({ coverageActive, inNetwork, authRequired, memberId, payerName, billedAmount, payerStats, deductibleRemaining, copay, coinsurance }) {
  const reasons = [];
  const missing = [];

  if (!payerName) missing.push('payer name');
  if (!memberId) missing.push('member ID');
  if (coverageActive == null) missing.push('coverage status');
  if (inNetwork == null) missing.push('network status');

  let decision = 'review';
  let confidence = 'low';

  if (coverageActive === false) {
    decision = 'do_not_schedule';
    confidence = 'high';
    reasons.push('Coverage appears inactive.');
  } else if (inNetwork === false) {
    decision = 'review';
    confidence = 'medium';
    reasons.push('Provider may be out of network.');
  } else if (authRequired === true) {
    decision = 'review';
    confidence = 'medium';
    reasons.push('Authorization is required before clean billing.');
  } else if (!missing.length) {
    decision = 'take_client';
    confidence = payerStats?.paid_claims >= 10 ? 'high' : 'medium';
    reasons.push('Core intake fields are present and no hard blocker is visible.');
  } else {
    reasons.push('Missing intake details prevent a clean take/review decision.');
  }

  const billed = money(billedAmount);
  const payerAllowedRatio = payerStats && money(payerStats.avg_billed) > 0
    ? ratio(payerStats.avg_allowed, payerStats.avg_billed)
    : null;
  const paidToAllowed = payerStats ? ratio(payerStats.avg_paid, payerStats.avg_allowed) : null;
  const estimatedAllowed = billed && payerAllowedRatio != null ? Number((billed * payerAllowedRatio).toFixed(2)) : null;
  const estimatedInsurancePayment = estimatedAllowed && paidToAllowed != null
    ? Number((estimatedAllowed * paidToAllowed).toFixed(2))
    : null;

  let estimatedPatientResponsibility = 0;
  estimatedPatientResponsibility += money(copay);
  estimatedPatientResponsibility += money(deductibleRemaining);
  if (estimatedAllowed && Number(coinsurance || 0) > 0) {
    estimatedPatientResponsibility += Number((estimatedAllowed * (Number(coinsurance) / 100)).toFixed(2));
  }
  if (!estimatedPatientResponsibility) estimatedPatientResponsibility = null;

  return {
    decision,
    confidence,
    reasons,
    missing,
    estimated_allowed: estimatedAllowed,
    estimated_insurance_payment: estimatedInsurancePayment,
    estimated_patient_responsibility: estimatedPatientResponsibility,
    estimation_basis: payerStats?.paid_claims
      ? `Based on ${payerStats.paid_claims} paid claims for ${payerStats.payer_name}.`
      : 'No payer-specific payment history yet; estimate is low-confidence.',
  };
}

const DEFAULT_PATIENT_AR_POLICY = {
  scope_key: 'default',
  reminder_day_1: 15,
  reminder_day_2: 30,
  provider_escalation_day: 45,
  final_notice_day: 60,
  payment_plan_grace_days: 7,
  autopay_retry_days: 3,
  allow_payment_plans: true,
  allow_hardship_review: true,
  allow_settlements: false,
  allow_referral_credit: false,
  notes: 'Provider-directed only. Do not turn this into third-party debt collection without legal review.',
  source: 'default',
};

function normalizePatientArPolicy(input = {}) {
  return {
    reminder_day_1: Math.max(1, Number(input.reminder_day_1 ?? DEFAULT_PATIENT_AR_POLICY.reminder_day_1)),
    reminder_day_2: Math.max(1, Number(input.reminder_day_2 ?? DEFAULT_PATIENT_AR_POLICY.reminder_day_2)),
    provider_escalation_day: Math.max(1, Number(input.provider_escalation_day ?? DEFAULT_PATIENT_AR_POLICY.provider_escalation_day)),
    final_notice_day: Math.max(1, Number(input.final_notice_day ?? DEFAULT_PATIENT_AR_POLICY.final_notice_day)),
    payment_plan_grace_days: Math.max(1, Number(input.payment_plan_grace_days ?? DEFAULT_PATIENT_AR_POLICY.payment_plan_grace_days)),
    autopay_retry_days: Math.max(1, Number(input.autopay_retry_days ?? DEFAULT_PATIENT_AR_POLICY.autopay_retry_days)),
    allow_payment_plans: input.allow_payment_plans !== undefined ? Boolean(input.allow_payment_plans) : DEFAULT_PATIENT_AR_POLICY.allow_payment_plans,
    allow_hardship_review: input.allow_hardship_review !== undefined ? Boolean(input.allow_hardship_review) : DEFAULT_PATIENT_AR_POLICY.allow_hardship_review,
    allow_settlements: input.allow_settlements !== undefined ? Boolean(input.allow_settlements) : DEFAULT_PATIENT_AR_POLICY.allow_settlements,
    allow_referral_credit: input.allow_referral_credit !== undefined ? Boolean(input.allow_referral_credit) : DEFAULT_PATIENT_AR_POLICY.allow_referral_credit,
    notes: String(input.notes ?? DEFAULT_PATIENT_AR_POLICY.notes ?? '').trim(),
  };
}

function derivePatientArStage(ageDays, policy) {
  if (ageDays >= policy.final_notice_day) return { stage: 'final_notice', next_action: 'Final provider-approved notice or decision review', priority: 'high' };
  if (ageDays >= policy.provider_escalation_day) return { stage: 'provider_escalation', next_action: 'Escalate to provider for direct decision on outreach or payment-plan offer', priority: 'high' };
  if (ageDays >= policy.reminder_day_2) return { stage: 'reminder_2', next_action: 'Second reminder and payment-plan check', priority: 'normal' };
  if (ageDays >= policy.reminder_day_1) return { stage: 'reminder_1', next_action: 'First reminder and courtesy balance review', priority: 'normal' };
  return { stage: 'current', next_action: 'Monitor; no outreach yet', priority: 'low' };
}

export function createClientCareOpsService({ pool, billingService, browserService, syncService, callCouncilMember = null, callCouncilWithFailover = null, logger = console }) {
  /**
   * Re-run the full ClientCare VOB browser session until a response is detected or outer rounds are exhausted.
   * Each round is a fresh login + billing tab + inner click attempts (see CLIENTCARE_VOB_INNER_ATTEMPTS).
   */
  async function runClientcareVobFlowUntilReceived(href) {
    const { rounds, inner } = readClientcareVobRetryEnv();
    const attempts = [];
    for (let i = 0; i < rounds; i++) {
      const vobFlow = await browserService.runClientcareVobFlow({
        clientHref: href,
        pageTimeoutMs: 42000,
        maxAttempts: inner,
      });
      attempts.push(vobFlow);
      if (vobFlow.ok && vobFlow.vob_received) {
        return { ok: true, vob_flow: mergeVobFlowAttempts(attempts) };
      }
      if (!vobFlow.ok) {
        logger.warn?.({ err: vobFlow.error, round: i + 1, rounds }, '[CLIENTCARE-OPS] VOB browser session failed');
        if (i < rounds - 1) {
          await sleep(2500 + i * 1500);
          continue;
        }
        return { ok: false, error: vobFlow.error, vob_flow: mergeVobFlowAttempts(attempts) };
      }
      if (i < rounds - 1) {
        logger.warn?.(
          { round: i + 1, rounds },
          '[CLIENTCARE-OPS] VOB/eligibility response not detected — retrying with a fresh browser session',
        );
        await sleep(2500 + i * 1500);
      }
    }
    return { ok: true, vob_flow: mergeVobFlowAttempts(attempts) };
  }

  async function getPatientArPolicy() {
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_patient_ar_policy WHERE scope_key='default' LIMIT 1`);
      if (!rows[0]) return { ...DEFAULT_PATIENT_AR_POLICY };
      return { ...DEFAULT_PATIENT_AR_POLICY, ...rows[0], source: 'db' };
    } catch (error) {
      if (isMissingRelation(error)) return { ...DEFAULT_PATIENT_AR_POLICY };
      throw error;
    }
  }

  async function savePatientArPolicy(input = {}, { updatedBy = 'overlay' } = {}) {
    const policy = normalizePatientArPolicy(input);
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_patient_ar_policy (
          scope_key, reminder_day_1, reminder_day_2, provider_escalation_day, final_notice_day,
          payment_plan_grace_days, autopay_retry_days, allow_payment_plans, allow_hardship_review,
          allow_settlements, allow_referral_credit, notes, updated_by
        ) VALUES (
          'default',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )
        ON CONFLICT (scope_key) DO UPDATE SET
          reminder_day_1=EXCLUDED.reminder_day_1,
          reminder_day_2=EXCLUDED.reminder_day_2,
          provider_escalation_day=EXCLUDED.provider_escalation_day,
          final_notice_day=EXCLUDED.final_notice_day,
          payment_plan_grace_days=EXCLUDED.payment_plan_grace_days,
          autopay_retry_days=EXCLUDED.autopay_retry_days,
          allow_payment_plans=EXCLUDED.allow_payment_plans,
          allow_hardship_review=EXCLUDED.allow_hardship_review,
          allow_settlements=EXCLUDED.allow_settlements,
          allow_referral_credit=EXCLUDED.allow_referral_credit,
          notes=EXCLUDED.notes,
          updated_by=EXCLUDED.updated_by,
          updated_at=NOW()
        RETURNING *`,
        [
          policy.reminder_day_1,
          policy.reminder_day_2,
          policy.provider_escalation_day,
          policy.final_notice_day,
          policy.payment_plan_grace_days,
          policy.autopay_retry_days,
          policy.allow_payment_plans,
          policy.allow_hardship_review,
          policy.allow_settlements,
          policy.allow_referral_credit,
          policy.notes,
          updatedBy,
        ]
      );
      return { ...DEFAULT_PATIENT_AR_POLICY, ...rows[0], source: 'db' };
    } catch (error) {
      if (isMissingRelation(error)) {
        return { ...DEFAULT_PATIENT_AR_POLICY, ...policy, source: 'fallback_unpersisted', updated_by: updatedBy };
      }
      throw error;
    }
  }

  async function getPatientArEscalationQueue({ limit = 50 } = {}) {
    const policy = await getPatientArPolicy();
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         date_of_service,
         COALESCE(patient_balance, 0)::numeric AS patient_balance,
         (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
       FROM clientcare_claims
       WHERE COALESCE(patient_balance, 0) > 0
       ORDER BY patient_balance DESC, age_days DESC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 50), 250))]
    );

    const items = rows.map((row) => {
      const stage = derivePatientArStage(Number(row.age_days || 0), policy);
      return {
        ...row,
        age_bucket: bucketByAge(row.age_days),
        stage: stage.stage,
        next_action: stage.next_action,
        priority: stage.priority,
        provider_approval_required: ['provider_escalation', 'final_notice'].includes(stage.stage),
      };
    });

    return {
      policy,
      summary: {
        total_accounts: items.length,
        total_balance: Number(items.reduce((sum, item) => sum + money(item.patient_balance), 0).toFixed(2)),
        provider_escalation_count: items.filter((item) => item.stage === 'provider_escalation').length,
        final_notice_count: items.filter((item) => item.stage === 'final_notice').length,
      },
      items,
    };
  }

  async function queuePatientArAction(claimId, { owner = 'overlay', actionType = 'patient_ar_followup' } = {}) {
    const policy = await getPatientArPolicy();
    const { rows } = await pool.query(
      `SELECT
         id,
         patient_name,
         payer_name,
         date_of_service,
         COALESCE(patient_balance, 0)::numeric AS patient_balance,
         (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
       FROM clientcare_claims
       WHERE id = $1`,
      [claimId]
    );
    const claim = rows[0];
    if (!claim) return null;
    const stage = derivePatientArStage(Number(claim.age_days || 0), policy);
    const { rows: actionRows } = await pool.query(
      `INSERT INTO clientcare_claim_actions (claim_id, action_type, priority, owner, summary, details, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        claimId,
        actionType,
        stage.priority === 'high' ? 'high' : 'normal',
        owner,
        `Patient AR ${stage.stage.replace(/_/g, ' ')}`,
        [
          `Patient: ${claim.patient_name || 'Unknown patient'}`,
          `Balance: $${money(claim.patient_balance).toFixed(2)}`,
          `Age days: ${claim.age_days}`,
          `Next action: ${stage.next_action}`,
          stage.provider_approval_required ? 'Provider approval is required before outreach.' : 'Provider-directed outreach is allowed within current policy.',
        ].join('\n'),
        JSON.stringify({
          patient_balance: money(claim.patient_balance),
          age_days: Number(claim.age_days || 0),
          stage: stage.stage,
          provider_approval_required: stage.provider_approval_required,
        }),
      ]
    );
    return { policy, claim, stage, action: actionRows[0] };
  }

  async function getPatientArSummary() {
    const policy = await getPatientArPolicy();
    const { rows: [summary] } = await pool.query(`
      WITH aged AS (
        SELECT
          id,
          patient_name,
          payer_name,
          COALESCE(patient_balance, 0)::numeric AS patient_balance,
          (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
        FROM clientcare_claims
        WHERE COALESCE(patient_balance, 0) > 0
      )
      SELECT
        COUNT(*)::int AS total_accounts,
        COALESCE(SUM(patient_balance), 0)::numeric AS total_balance,
        COUNT(*) FILTER (WHERE age_days <= 30)::int AS current_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days <= 30), 0)::numeric AS current_balance,
        COUNT(*) FILTER (WHERE age_days BETWEEN 31 AND 60)::int AS balance_31_60_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days BETWEEN 31 AND 60), 0)::numeric AS balance_31_60,
        COUNT(*) FILTER (WHERE age_days BETWEEN 61 AND 90)::int AS balance_61_90_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days BETWEEN 61 AND 90), 0)::numeric AS balance_61_90,
        COUNT(*) FILTER (WHERE age_days > 90)::int AS balance_90_plus_count,
        COALESCE(SUM(patient_balance) FILTER (WHERE age_days > 90), 0)::numeric AS balance_90_plus
      FROM aged
    `);

    const { rows: topAccounts } = await pool.query(`
      SELECT
        id,
        patient_name,
        payer_name,
        COALESCE(patient_balance, 0)::numeric AS patient_balance,
        (NOW()::date - COALESCE(date_of_service::date, NOW()::date))::int AS age_days
      FROM clientcare_claims
      WHERE COALESCE(patient_balance, 0) > 0
      ORDER BY patient_balance DESC, age_days DESC
      LIMIT 12
    `);

    const recommendations = [];
    if (Number(summary?.balance_90_plus || 0) > 0) {
      recommendations.push('Work 90+ day patient balances with provider-approved outreach and payment-plan offers first.');
    }
    if (Number(summary?.balance_31_60 || 0) > 0) {
      recommendations.push('Set a reminder cadence before 31-60 day balances become hard collections work.');
    }
    if (Number(summary?.total_balance || 0) === 0) {
      recommendations.push('No patient AR imported yet. Import statements or patient-balance exports to monitor adherence.');
    }

    return {
      policy,
      summary: summary || {},
      top_accounts: topAccounts.map((row) => ({
        ...row,
        age_bucket: bucketByAge(row.age_days),
      })),
      recommendations,
    };
  }

  async function getOptimizationChecklist() {
    const readiness = browserService.getReadiness();
    const dashboard = await billingService.getDashboard();
    const reconciliation = await syncService.buildReconciliationSummary({ limit: 500 });
    const patientAr = await getPatientArSummary();
    const items = [
      {
        id: 'eft-era',
        title: 'Enable EFT and ERA everywhere possible',
        why: 'Electronic remittance and payment posting reduces manual lag and missed payment visibility.',
        status: 'needs_review',
      },
      {
        id: 'claim-aging-workqueue',
        title: 'Maintain a daily claim aging queue',
        why: 'Unworked aging claims turn into timely-filing losses.',
        status: dashboard.summary?.total_claims ? 'active' : 'needs_setup',
      },
      {
        id: 'rejection-denial-split',
        title: 'Separate rejected claims from denied claims',
        why: 'Rejected claims are usually the fastest recoverable dollars and should not sit in the same queue as denials.',
        status: reconciliation.summary?.rejected ? 'active' : 'needs_setup',
      },
      {
        id: 'timely-filing-proof',
        title: 'Retain proof of timely filing',
        why: 'Clearinghouse acceptance and submission timestamps are critical to rescue borderline claims.',
        status: 'needs_review',
      },
      {
        id: 'payer-matrix',
        title: 'Track payer-specific filing and appeal rules',
        why: 'Commercial plans do not share one filing window; guessing here causes avoidable losses.',
        status: 'needs_setup',
      },
      {
        id: 'auth-eligibility-check',
        title: 'Confirm authorization and eligibility before submission where required',
        why: 'Missing auth and eligibility mismatches drive preventable denials.',
        status: 'needs_review',
      },
      {
        id: 'browser-access',
        title: 'Credential-backed ClientCare access',
        why: 'Browser discovery lets the system inspect real billing pages even before exports/API are available.',
        status: readiness.ready ? 'active' : 'blocked',
      },
      {
        id: 'patient-balance-policy',
        title: 'Review patient balance and financial agreement policy',
        why: 'Do not transfer insurance balances to patients without payer-contract and consent review.',
        status: Number(patientAr.summary?.total_accounts || 0) > 0 ? 'active' : 'needs_setup',
      },
    ];
    return {
      readiness,
      dashboard: dashboard.summary,
      reconciliation: reconciliation.summary,
      patient_ar: patientAr.summary,
      checklist: items,
    };
  }

  async function listCapabilityRequests({ status = null, limit = 100 } = {}) {
    const values = [];
    const where = [];
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    values.push(Math.max(1, Math.min(Number(limit || 100), 250)));
    try {
      const { rows } = await pool.query(
        `SELECT * FROM clientcare_capability_requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at DESC
         LIMIT $${values.length}`,
        values,
      );
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }

  async function createCapabilityRequest(requestText, { requestedBy = 'sherry_console', priority = 'normal', normalizedIntent = null, metadata = {} } = {}) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_capability_requests (request_text, normalized_intent, priority, requested_by, metadata)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         RETURNING *`,
        [requestText, normalizedIntent, priority, requestedBy, JSON.stringify(metadata || {})],
      );
      return rows[0];
    } catch (error) {
      if (isMissingRelation(error)) {
        return {
          id: null,
          request_text: requestText,
          normalized_intent: normalizedIntent,
          priority,
          requested_by: requestedBy,
          metadata,
          status: 'queued_unpersisted',
        };
      }
      throw error;
    }
  }

  async function updateCapabilityRequest(id, patch = {}) {
    const fields = [];
    const values = [];
    if (patch.status !== undefined) {
      values.push(String(patch.status));
      fields.push(`status = $${values.length}`);
    }
    if (patch.priority !== undefined) {
      values.push(String(patch.priority));
      fields.push(`priority = $${values.length}`);
    }
    if (patch.implementation_notes !== undefined) {
      values.push(String(patch.implementation_notes || ''));
      fields.push(`implementation_notes = $${values.length}`);
    }
    if (patch.metadata !== undefined) {
      values.push(JSON.stringify(patch.metadata || {}));
      fields.push(`metadata = $${values.length}::jsonb`);
    }
    if (!fields.length) return null;
    values.push(id);
    try {
      const { rows } = await pool.query(
        `UPDATE clientcare_capability_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return null;
      throw error;
    }
  }

  async function listSavedVobProspects({ limit = 25 } = {}) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM clientcare_vob_prospects
         ORDER BY created_at DESC
         LIMIT $1`,
        [Math.max(1, Math.min(Number(limit) || 25, 100))],
      );
      return rows;
    } catch (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
  }

  async function saveVobProspect({
    sourceType = 'prospect',
    fullName = '',
    phone = '',
    email = '',
    payerName = '',
    memberId = '',
    groupNumber = '',
    subscriberName = '',
    supportPhone = '',
    preview = null,
    extractedText = '',
    matchedClient = null,
    requestedBy = 'overlay',
    fileMeta = null,
  } = {}) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientcare_vob_prospects (
           source_type, full_name, phone, email, payer_name, member_id, group_number,
           subscriber_name, support_phone, preview_result, extracted_text,
           matched_client_name, matched_client_member_id, status, file_meta, requested_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15::jsonb,$16
         )
         RETURNING *`,
        [
          sourceType,
          fullName || null,
          phone || null,
          email || null,
          payerName || null,
          memberId || null,
          groupNumber || null,
          subscriberName || null,
          supportPhone || null,
          JSON.stringify(preview || {}),
          extractedText || null,
          matchedClient?.patient_name || matchedClient?.full_name || null,
          matchedClient?.member_id || null,
          matchedClient ? 'matched_existing_client' : 'prospect_saved',
          JSON.stringify(fileMeta || {}),
          requestedBy || null,
        ],
      );
      return rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return null;
      throw error;
    }
  }

  async function findExistingClientMatch({ fullName = '', memberId = '' } = {}) {
    try {
      if (!fullName && !memberId) return null;
      const clauses = [];
      const values = [];
      if (fullName) {
        values.push(`%${fullName}%`);
        clauses.push(`patient_name ILIKE $${values.length}`);
      }
      if (memberId) {
        values.push(memberId);
        clauses.push(`member_id = $${values.length}`);
      }
      if (!clauses.length) return null;
      const { rows } = await pool.query(
        `SELECT patient_name, member_id, payer_name
         FROM clientcare_claims
         WHERE ${clauses.join(' OR ')}
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 1`,
        values,
      );
      return rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return null;
      throw error;
    }
  }

  async function intakeInsuranceCard({ fileBuffer, fileName = 'insurance-card', prospect = {}, requestedBy = 'overlay' } = {}) {
    try {
      const extractedText = await extractInsuranceCardText({ fileBuffer, fileName, logger });
      const extracted = parseInsuranceCardText(extractedText);
      const fullName = String(prospect.full_name || '').trim();
      const phone = String(prospect.phone || '').trim();
      const email = String(prospect.email || '').trim();
      const matchedClient = await findExistingClientMatch({ fullName, memberId: extracted.member_id });
      const billedAmount = Number(prospect.billed_amount || 0) || null;
      const previewBase = await getInsuranceVerificationPreview({
        payer_name: extracted.payer_name,
        member_id: extracted.member_id,
        billed_amount: billedAmount,
        coverage_active: null,
        in_network: null,
        auth_required: null,
      });
      const preview = {
        ...previewBase,
        _form_snapshot: {
          billed_amount: billedAmount,
          copay: null,
          deductible_remaining: null,
          coinsurance_pct: null,
          coverage_active: null,
          in_network: null,
          auth_required: null,
          payer_name: extracted.payer_name,
          member_id: extracted.member_id,
          group_number: extracted.group_number,
          source: 'insurance_card_ocr',
        },
      };
      const saved = await saveVobProspect({
        sourceType: matchedClient ? 'matched_client_card' : 'prospect_card',
        fullName,
        phone,
        email,
        payerName: extracted.payer_name,
        memberId: extracted.member_id,
        groupNumber: extracted.group_number,
        subscriberName: extracted.subscriber_name,
        supportPhone: extracted.support_phone,
        preview,
        extractedText,
        matchedClient,
        requestedBy,
        fileMeta: { original_name: fileName, extracted_confidence: extracted.confidence },
      });
      return {
        extracted,
        matched_client: matchedClient,
        preview,
        saved,
      };
    } catch (error) {
      throw error;
    }
  }

  async function promoteSavedVobProspect(id, { requestedBy = 'overlay' } = {}) {
    let saved = null;
    try {
      const { rows } = await pool.query(`SELECT * FROM clientcare_vob_prospects WHERE id = $1 LIMIT 1`, [id]);
      saved = rows[0] || null;
    } catch (error) {
      if (isMissingRelation(error)) return { saved: null, capability_request: null };
      throw error;
    }
    if (!saved) return { saved: null, capability_request: null };
    const request = await createCapabilityRequest(
      `Create or update a ClientCare client file from saved VOB prospect ${saved.full_name || saved.id}.`,
      {
        requestedBy,
        priority: 'high',
        normalizedIntent: 'convert_vob_prospect_to_clientcare_client',
        metadata: {
          prospect_id: saved.id,
          full_name: saved.full_name,
          phone: saved.phone,
          email: saved.email,
          payer_name: saved.payer_name,
          member_id: saved.member_id,
          group_number: saved.group_number,
          subscriber_name: saved.subscriber_name,
          preview_result: saved.preview_result,
          matched_client_name: saved.matched_client_name,
        },
      },
    );
    try {
      const { rows } = await pool.query(
        `UPDATE clientcare_vob_prospects
         SET status = 'ready_to_convert',
             promoted_at = NOW(),
             promoted_request_id = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, request?.id || null],
      );
      saved = rows[0] || saved;
    } catch (error) {
      if (!isMissingRelation(error)) throw error;
    }
    return { saved, capability_request: request };
  }

  /**
   * ClientCare-first reconcile: live portal inspect + optional card OCR + pasted call notes.
   * Proposes fillings only for fields that are empty in ClientCare; optional apply uses browser repair.
   */
  async function reconcileInsuranceWithClientcare({
    clientHref,
    fileBuffer = null,
    fileName = 'insurance-card',
    supplementalNotes = '',
    insuranceSlot = 0,
    apply = false,
    requestedBy = 'overlay',
  } = {}) {
    const href = String(clientHref || '').trim();
    if (!href) {
      return { ok: false, step: 'validate', error: 'client_href required' };
    }

    const inspect = await browserService.inspectClientBillingAccount({
      clientHref: href,
      pageTimeoutMs: 22000,
    });
    if (!inspect.ok) {
      return { ok: false, step: 'inspect_clientcare', error: inspect.error || 'ClientCare inspect failed', inspect };
    }

    let cardExtracted = null;
    if (fileBuffer?.length) {
      const text = await extractInsuranceCardText({ fileBuffer, fileName, logger });
      cardExtracted = parseInsuranceCardText(text);
    }

    const { merged, notesRawExtracted, sources } = mergeCardAndNotesExtractions(cardExtracted, supplementalNotes);
    const clientLabel = extractClientLabelFromInspect(inspect);
    const slot = Math.max(0, Number(insuranceSlot) || 0);
    const insurancePreview = inspect.insurancePreview || [];
    const primary = insurancePreview[slot] || insurancePreview[0] || {};

    const dependentAssessment = assessDependentCoverage({
      clientLabel,
      primaryCoverage: primary,
      merged,
    });

    const { proposed, gaps } = buildFillOnlyUpdates({
      primaryCoverage: primary,
      merged,
      assessment: dependentAssessment,
      insuranceSlot: slot,
      insurancePreviewLength: insurancePreview.length,
    });

    const accountPayload = {
      billingHref: href,
      billingFields: inspect.billingFields,
      insurancePreview: inspect.insurancePreview,
      accountSummary: inspect.accountSummary,
    };

    let repair_preview = null;
    let repair_applied = null;

    if (Object.keys(proposed).length) {
      repair_preview = await repairAccount({
        billingHref: href,
        account: accountPayload,
        updates: proposed,
        dryRun: true,
        requestedBy,
      });
    }

    if (apply && Object.keys(proposed).length) {
      repair_applied = await repairAccount({
        billingHref: href,
        account: accountPayload,
        updates: proposed,
        dryRun: false,
        requestedBy,
      });
    }

    const report = {
      ok: true,
      clientHref: href,
      client_label_guess: clientLabel,
      clientcare_primary_coverage: primary,
      billing_notes_preview: inspect.billingNotesPreview || [],
      card_extracted: cardExtracted,
      notes_parsed: notesRawExtracted,
      merge_sources: sources,
      merged_candidates: merged,
      dependent_assessment: dependentAssessment,
      gaps_filled_proposal: gaps,
      proposed_updates: proposed,
      repair_preview,
      repair_applied,
      policy: 'Only empty ClientCare fields are filled from card/notes; values already in the portal are left unchanged.',
      clientcare_note_suggestion: buildClientcareNoteSuggestion({
        flow: 'reconcile',
        clientHref: href,
        clientLabel: clientLabel,
        apply,
        vobFlow: null,
        proposedCard: proposed,
        cardRepair: repair_applied || repair_preview,
        vobProposed: {},
        vobRepair: null,
      }),
    };

    try {
      await saveVobProspect({
        sourceType: 'clientcare_reconcile',
        fullName: clientLabel || 'ClientCare reconcile',
        phone: '',
        email: '',
        payerName: primary.insuranceName || merged.payer_name || '',
        memberId: primary.memberId || merged.member_id || '',
        groupNumber: primary.groupNumber || merged.group_number || '',
        subscriberName: primary.subscriberName || merged.subscriber_name || '',
        supportPhone: merged.support_phone || '',
        preview: report,
        extractedText: supplementalNotes ? String(supplementalNotes).slice(0, 8000) : '',
        matchedClient: null,
        requestedBy,
        fileMeta: {
          client_href: href,
          apply_executed: Boolean(apply && repair_applied?.ok),
          original_card: fileName || null,
        },
      });
    } catch (error) {
      logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] reconcile snapshot not persisted');
    }

    return report;
  }

  /**
   * One pipeline for the practice: optional card OCR → fill empty ClientCare fields → run ClientCare’s own VOB/eligibility
   * control → re-read page → push parsed VOB text into any fields still empty (incl. copay/deductible when visible).
   */
  async function runFullClientcareCardVobPipeline({
    clientHref,
    fileBuffer = null,
    fileName = 'insurance-card.png',
    supplementalNotes = '',
    insuranceSlot = 0,
    apply = true,
    requestedBy = 'overlay',
  } = {}) {
    const href = String(clientHref || '').trim();
    if (!href) return { ok: false, step: 'validate', error: 'client_href required' };

    let cardExtracted = null;
    if (fileBuffer?.length) {
      const text = await extractInsuranceCardText({ fileBuffer, fileName, logger });
      cardExtracted = parseInsuranceCardText(text);
    }

    const inspect = await browserService.inspectClientBillingAccount({ clientHref: href, pageTimeoutMs: 24000 });
    if (!inspect.ok) {
      return { ok: false, step: 'inspect_clientcare', error: inspect.error || 'inspect failed', inspect };
    }

    const slot = Math.max(0, Number(insuranceSlot) || 0);
    const { merged } = mergeCardAndNotesExtractions(cardExtracted, supplementalNotes);
    const clientLabel = extractClientLabelFromInspect(inspect);
    const insurancePreview = inspect.insurancePreview || [];
    const primary = insurancePreview[slot] || insurancePreview[0] || {};

    const dependentAssessment = assessDependentCoverage({
      clientLabel,
      primaryCoverage: primary,
      merged,
    });

    const { proposed: proposedCard } = buildFillOnlyUpdates({
      primaryCoverage: primary,
      merged,
      assessment: dependentAssessment,
      insuranceSlot: slot,
      insurancePreviewLength: insurancePreview.length,
    });

    const accountPayload = {
      billingHref: href,
      billingFields: inspect.billingFields,
      insurancePreview: inspect.insurancePreview,
      accountSummary: inspect.accountSummary,
    };

    let card_repair = null;
    if (Object.keys(proposedCard).length) {
      card_repair = await repairAccount({
        billingHref: href,
        account: accountPayload,
        updates: proposedCard,
        dryRun: !apply,
        requestedBy,
      });
    }

    const vobResult = await runClientcareVobFlowUntilReceived(href);
    if (!vobResult.ok) {
      return {
        ok: false,
        step: 'clientcare_vob_flow',
        error: vobResult.error,
        clientHref: href,
        card_extracted: cardExtracted,
        card_fill_proposed: proposedCard,
        card_repair,
        vob_flow: vobResult.vob_flow,
      };
    }
    const vobFlow = vobResult.vob_flow;
    if (!vobFlow.vob_received) {
      logger.warn?.(
        '[CLIENTCARE-OPS] VOB/eligibility response not detected after all retry rounds — sync uses page text only. Set CLIENTCARE_VOB_BUTTON_HINT or check vob_attempts_summary in the saved report.',
      );
    }

    const reInspect = await browserService.inspectClientBillingAccount({ clientHref: href, pageTimeoutMs: 24000 });
    if (!reInspect.ok) {
      return {
        ok: false,
        step: 'reinspect_after_vob',
        error: reInspect.error,
        vob_flow: vobFlow,
        card_repair,
      };
    }

    const primaryAfter = (reInspect.insurancePreview || [])[slot] || (reInspect.insurancePreview || [])[0] || {};
    const vobProposed = buildVobRepairProposal({
      vobExtraction: vobFlow.vob_extraction || {},
      primaryCoverage: primaryAfter,
      billingFields: reInspect.billingFields || [],
      insuranceSlot: slot,
      insurancePreviewLength: (reInspect.insurancePreview || []).length,
    });

    const ap2 = {
      billingHref: href,
      billingFields: reInspect.billingFields,
      insurancePreview: reInspect.insurancePreview,
      accountSummary: reInspect.accountSummary,
    };

    let vob_repair = null;
    if (Object.keys(vobProposed).length) {
      vob_repair = await repairAccount({
        billingHref: href,
        account: ap2,
        updates: vobProposed,
        dryRun: !apply,
        requestedBy,
      });
    }

    // Build the note text first so we can attempt to post it
    const noteText = buildClientcareNoteSuggestion({
      flow: 'pipeline',
      clientHref: href,
      clientLabel: clientLabel,
      apply,
      vobFlow,
      proposedCard,
      cardRepair: card_repair,
      vobProposed,
      vobRepair: vob_repair,
    });

    // Attempt to post the note to ClientCare billing notes (best-effort — non-fatal)
    let note_posted = null;
    if (apply) {
      try {
        note_posted = await browserService.addBillingNote(href, noteText);
      } catch (noteErr) {
        logger.warn?.({ err: noteErr.message }, '[CLIENTCARE-OPS] billing note post failed');
        note_posted = { ok: false, reason: noteErr.message };
      }
    }

    const report = {
      ok: true,
      summary:
        'Merged card into empty fields where needed, ran ClientCare VOB/eligibility action (with retries until response or limit), then synced parsed VOB values into fields still empty, and posted billing note.',
      vob_retry_config: readClientcareVobRetryEnv(),
      clientHref: href,
      client_label_guess: clientLabel,
      card_extracted: cardExtracted,
      card_fill_proposed: proposedCard,
      card_repair,
      vob_flow: vobFlow,
      vob_fill_proposed: vobProposed,
      vob_repair,
      insurance_after_vob: primaryAfter,
      apply,
      note_posted,
      clientcare_note_suggestion: noteText,
    };

    try {
      await saveVobProspect({
        sourceType: 'clientcare_full_pipeline',
        fullName: clientLabel || 'ClientCare pipeline',
        phone: '',
        email: '',
        payerName: primaryAfter.insuranceName || merged.payer_name || '',
        memberId: primaryAfter.memberId || merged.member_id || '',
        groupNumber: primaryAfter.groupNumber || merged.group_number || '',
        subscriberName: primaryAfter.subscriberName || merged.subscriber_name || '',
        supportPhone: merged.support_phone || '',
        preview: report,
        extractedText: JSON.stringify(vobFlow.vob_extraction || {}).slice(0, 8000),
        matchedClient: null,
        requestedBy,
        fileMeta: { client_href: href, pipeline: true },
      });
    } catch (error) {
      logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] pipeline snapshot not persisted');
    }

    return report;
  }

  async function getInsuranceVerificationPreview(input = {}) {
    const intelligence = await billingService.getReimbursementIntelligence();
    const payerName = String(input.payer_name || '').trim();
    const payerStats = (intelligence.payers || []).find((row) => String(row.payer_name || '').toLowerCase() === payerName.toLowerCase())
      || (intelligence.payers || []).find((row) => String(row.payer_name || '').toLowerCase().includes(payerName.toLowerCase()) || payerName.toLowerCase().includes(String(row.payer_name || '').toLowerCase()));

    const coverageActive = input.coverage_active === true ? true : input.coverage_active === false ? false : null;
    const inNetwork = input.in_network === true ? true : input.in_network === false ? false : null;
    const authRequired = input.auth_required === true ? true : input.auth_required === false ? false : null;

    const preview = buildInsuranceDecision({
      coverageActive,
      inNetwork,
      authRequired,
      memberId: input.member_id,
      payerName,
      billedAmount: input.billed_amount,
      payerStats,
      deductibleRemaining: input.deductible_remaining,
      copay: input.copay,
      coinsurance: input.coinsurance_pct,
    });

    return {
      ...preview,
      payer_history: payerStats ? {
        payer_name: payerStats.payer_name,
        paid_claims: Number(payerStats.paid_claims || 0),
        avg_paid: money(payerStats.avg_paid),
        avg_allowed: money(payerStats.avg_allowed),
        unpaid_balance: money(payerStats.unpaid_balance),
      } : null,
      required_fields: ['payer_name', 'member_id', 'coverage_active', 'in_network', 'auth_required'],
    };
  }

  async function buildOperationsOverview() {
    const [checklist, patientAr, capabilityRequests] = await Promise.all([
      getOptimizationChecklist(),
      getPatientArSummary(),
      listCapabilityRequests({ status: 'queued', limit: 25 }),
    ]);

    return {
      checklist,
      patient_ar: patientAr,
      insurance_intake_rule: {
        rule: 'Verify coverage, network, authorization, and member identifiers before accepting a billable insurance client.',
        target: 'Move to 90%+ accurate payout/date forecasting after paid-claim and ERA history is imported.',
        required_fields: ['payer_name', 'member_id', 'coverage_active', 'in_network', 'auth_required', 'billed_amount'],
        note: 'Exact reimbursement is not assumed from eligibility alone. Payment history tightens the estimate over time.',
      },
      open_capability_requests: capabilityRequests,
    };
  }

  async function repairAccount({ billingHref, account = null, updates = {}, dryRun = true, requestedBy = 'operations_assistant' } = {}) {
    const normalizedUpdates = normalizeRepairUpdates(updates);
    const result = await browserService.repairBillingAccount({
      billingHref,
      account,
      updates: normalizedUpdates,
      dryRun,
      includeScreenshots: !dryRun,
    });

    return {
      ...result,
      requested_by: requestedBy,
      updates: normalizedUpdates,
      reply: result.ok
        ? dryRun
          ? 'Repair preview prepared. Review the planned field changes before applying them.'
          : 'Repair applied in ClientCare. Review the post-save account summary and screenshot.'
        : `Repair failed: ${result.error || 'unknown error'}`,
    };
  }

  async function runWorkflow(workflowId, { requestedBy = 'operations_assistant' } = {}) {
    const backlog = await browserService.buildBacklogSummary({ maxPages: 12, pageTimeoutMs: 12000, accountLimit: 200 });
    const workflow = findWorkflow(workflowId, backlog.summary || {});
    if (!workflow) {
      return {
        ok: false,
        error: 'Workflow not found',
      };
    }

    return {
      ok: true,
      workflow: {
        id: workflow.id,
        title: workflow.title,
        count: workflow.count,
        steps: workflow.steps || [],
        accounts: workflow.accounts || [],
      },
      reply: `Loaded the ${workflow.title} workflow with ${workflow.count} account(s). Work the listed steps in order and use the account board for detail drill-down.`,
      suggested_actions: workflow.steps || [],
      requested_by: requestedBy,
    };
  }

  async function ask(message, { requestedBy = 'sherry_console' } = {}) {
    const text = normalizeIntent(message);

    if (!text) {
      return { ok: false, error: 'Message required' };
    }

    if (/what should i do first|highest priority|top priority|what do i do next/.test(text)) {
      const actions = await billingService.listActions();
      return {
        ok: true,
        type: 'action_list',
        reply: 'These are the highest-priority billing actions right now.',
        data: summarizeTopActions(actions),
        suggested_actions: summarizeTopActions(actions).map((item) => item.summary),
      };
    }

    if (/patient balance|payment plan|past due|collections|self pay|cash pay/.test(text)) {
      const patientAr = await getPatientArSummary();
      return {
        ok: true,
        type: 'patient_ar',
        reply: 'Here is the current patient AR summary and where payment-plan or past-due work should focus first.',
        data: patientAr,
        suggested_actions: patientAr.recommendations,
      };
    }

    if (/patient ar policy|patient ar rules|reminder cadence|provider escalation day|hardship policy|settlement policy/.test(text)) {
      const policy = await getPatientArPolicy();
      const queue = await getPatientArEscalationQueue({ limit: 25 });
      return {
        ok: true,
        type: 'patient_ar_policy',
        reply: 'Here is the current patient AR policy and escalation queue.',
        data: { policy, queue },
        suggested_actions: [
          'Adjust reminder and escalation days in the overlay if the provider wants a different cadence.',
          'Queue provider-directed follow-up only after reviewing the current stage.',
        ],
      };
    }

    if (/underpayment|short pay|short-paid|paid less than expected/.test(text)) {
      if (/queue|follow up|follow-up|work|open action/.test(text)) {
        const claimId = extractClaimId(text);
        if (claimId) {
          const result = await billingService.queueUnderpaymentAction(claimId, { owner: requestedBy });
          if (result?.action) {
            return {
              ok: true,
              type: 'underpayment_action',
              reply: `Queued underpayment review for claim ${claimId}.`,
              data: result,
              suggested_actions: ['Open the action queue and review the evidence checklist.', 'Compare the ERA/EOB against expected patient responsibility before payer escalation.'],
            };
          }
        }
      }
      const underpayments = await billingService.getUnderpaymentQueue({ limit: 50 });
      return {
        ok: true,
        type: 'underpayments',
        reply: 'Here is the current underpayment queue based on allowed amount, patient responsibility, and insurer payment variance.',
        data: underpayments,
        suggested_actions: underpayments.items?.slice(0, 5).map((item) => item.next_action) || [],
      };
    }

    if (/appeal|appeals|denial queue|denied claims/.test(text)) {
      if (/queue|follow up|follow-up|packet|work|open action/.test(text)) {
        const claimId = extractClaimId(text);
        if (claimId) {
          const result = await billingService.queueAppealAction(claimId, {
            owner: requestedBy,
            actionType: /packet/.test(text) ? 'appeal_packet' : 'appeal_followup',
          });
          if (result?.action) {
            return {
              ok: true,
              type: 'appeal_action',
              reply: `Queued ${/packet/.test(text) ? 'appeal packet prep' : 'appeal follow-up'} for claim ${claimId}.`,
              data: result,
              suggested_actions: ['Open the action queue and packet preview.', 'Validate the payer path and evidence list before sending.'],
            };
          }
        }
      }
      const appeals = await billingService.getAppealsQueue({ limit: 50 });
      return {
        ok: true,
        type: 'appeals',
        reply: 'Here is the current appeals and denial queue, grouped by the likely recovery playbook.',
        data: appeals,
        suggested_actions: appeals.items?.slice(0, 5).map((item) => `${item.patient_name || 'Claim'}: ${item.playbook?.title || 'Manual review'}`) || [],
      };
    }

    if (/payer playbook|payer rules|commercial rules|payer-specific/.test(text)) {
      const playbooks = await billingService.getPayerPlaybooks({ limit: 25 });
      return {
        ok: true,
        type: 'payer_playbooks',
        reply: 'Here are the current payer-specific playbooks derived from imported denial and payment history.',
        data: playbooks,
        suggested_actions: playbooks.items?.slice(0, 5).map((item) => `${item.payer_name}: ${item.recommendations?.[0] || 'Review payer history'}`) || [],
      };
    }

    if (/era insight|remit insight|carc|rarc|835 insight|remittance pattern/.test(text)) {
      const insights = await billingService.getEraInsights({ limit: 25 });
      return {
        ok: true,
        type: 'era_insights',
        reply: 'Here are the current ERA/remit code patterns and payment-method signals from imported history.',
        data: insights,
        suggested_actions: [
          'Review the top CARC and RARC codes first.',
          'Use those patterns to refine payer playbooks and appeal packets.',
        ],
      };
    }

    if (/era|remit|835|paid claims import|payment history import/.test(text)) {
      return {
        ok: true,
        type: 'payment_history_import',
        reply: 'Use the payment-history import in Tools to load paid claims, ERA, or remit CSV. That is the next step to tighten payout and collection-date forecasts.',
        suggested_actions: [
          'Export paid claims, ERA, or remit CSV from ClientCare or the clearinghouse.',
          'Paste it into Import Payment History.',
          'Reload reimbursement intelligence and underpayment queue.',
        ],
      };
    }

    if (/verify insurance|benefits|eligibility|can we take this client/.test(text)) {
      return {
        ok: true,
        type: 'insurance_verification',
        reply: 'Use the insurance verification panel to check coverage, network, authorization, and estimated reimbursement before accepting the client. The endpoint is ready even if payer history is still thin.',
        suggested_actions: [
          'Collect payer name, member ID, coverage status, network status, authorization requirement, and billed amount.',
          'Run insurance verification preview.',
          'Only move forward automatically when no hard blocker is present.',
        ],
      };
    }

    if (/readiness|are we ready|login info|credentials/.test(text)) {
      const readiness = browserService.getReadiness();
      return {
        ok: true,
        type: 'readiness',
        reply: readiness.ready ? 'ClientCare browser automation is configured and ready to test.' : 'ClientCare browser automation is not fully configured yet.',
        data: readiness,
      };
    }

    if (/login test|test login/.test(text)) {
      const result = await browserService.login({ dryRun: false });
      await result.session.close().catch(() => {});
      return {
        ok: true,
        type: 'browser_login_test',
        reply: 'ClientCare login test completed.',
        data: { page: result.page, screenshots: result.screenshots, loginSelectors: result.loginSelectors },
      };
    }

    if (/discover|inspect clientcare|look through clientcare|find billing pages/.test(text)) {
      const result = await browserService.discoverBillingSurface();
      return {
        ok: true,
        type: 'browser_discovery',
        reply: 'ClientCare billing-surface discovery completed.',
        data: result,
      };
    }

    if (/extract claims|pull claims|import claims from clientcare/.test(text)) {
      const result = await browserService.extractClaimTables({ importIntoQueue: /import/.test(text) });
      return {
        ok: true,
        type: 'browser_extract',
        reply: /import/.test(text) ? 'ClientCare claim extraction and import completed.' : 'ClientCare claim extraction preview completed.',
        data: result,
      };
    }

    if (/optimi[sz]e|configuration|configure clientcare|best setup|set it up right/.test(text)) {
      const checklist = await getOptimizationChecklist();
      return {
        ok: true,
        type: 'optimization_checklist',
        reply: 'Here is the current optimization checklist for ClientCare billing and rescue operations.',
        data: checklist,
      };
    }

    if (/reconciliation|what has not been billed|what is unpaid|what is missing/.test(text)) {
      const reconciliation = await syncService.buildReconciliationSummary({ limit: 500 });
      return {
        ok: true,
        type: 'reconciliation',
        reply: 'Here is the current reconciliation summary of billed vs unpaid vs missing submission states.',
        data: reconciliation,
      };
    }

    if (/workflow|playbook|run insurance setup|run billing setup|run client match/.test(text)) {
      const workflowId = text.includes('client match')
        ? 'repair-client-match'
        : text.includes('billing setup')
          ? 'complete-billing-setup'
          : text.includes('insurer')
            ? 'enter-insurer'
            : 'verify-effective-dates';
      const result = await runWorkflow(workflowId, { requestedBy });
      return {
        ok: true,
        type: 'workflow',
        reply: result.reply,
        data: result.workflow,
        suggested_actions: result.suggested_actions,
      };
    }

    if (/repair account|fix account|apply repair|preview repair|set billing status|set provider type|payer order|insurance priority|member id|subscriber|payor id|enter insurer/.test(text)) {
      return {
        ok: true,
        type: 'repair_guidance',
        reply: 'Use the Account Recovery Detail panel to preview or apply billing setup and insurer-field repairs for the selected account. Payer-order changes across multiple coverages still need manual confirmation.',
        suggested_actions: [
          'Select an account from Accounts Needing Action.',
          'Choose the desired billing status, provider type, insurer fields, or insurance priority.',
          'Run Preview Repair first, then Apply Repair once the changes look correct.',
        ],
      };
    }

    if (callCouncilWithFailover || callCouncilMember) {
      try {
        const dashboard = await billingService.getDashboard();
        const readiness = browserService.getReadiness();
        const reconciliation = await syncService.buildReconciliationSummary({ limit: 100 });
        const prompt = [
          'You are the ClientCare billing operations copilot speaking for the LifeOS AI Council.',
          'Return strict JSON with keys: reply, recommended_action, confidence, should_queue_capability_request, priority, council_scope.',
          `User request: ${message}`,
          `Dashboard summary: ${JSON.stringify(dashboard.summary || {})}`,
          `Readiness: ${JSON.stringify(readiness)}`,
          `Reconciliation summary: ${JSON.stringify(reconciliation.summary || {})}`,
        ].join('\n');
        const response = callCouncilWithFailover
          ? await callCouncilWithFailover(prompt, 'chatgpt', false, {
            responseFormat: 'json',
            maxTokens: 600,
            taskType: 'json',
            complexity: 'complex',
            requireConsensus: true,
            skipKnowledge: true,
          })
          : await callCouncilMember('claude', prompt, '', {
            responseFormat: 'json',
            maxTokens: 500,
            taskType: 'json',
            skipKnowledge: true,
          });
        let parsed = null;
        try { parsed = typeof response === 'string' ? JSON.parse(response) : response; } catch {}
        if (parsed) {
          if (parsed.should_queue_capability_request) {
            const request = await createCapabilityRequest(message, { requestedBy, priority: parsed.priority || 'normal', normalizedIntent: text, metadata: { recommended_action: parsed.recommended_action } });
            parsed.capability_request = request;
          }
          return { ok: true, type: 'assistant', scope: parsed.council_scope || 'ai_council', ...parsed };
        }
      } catch (error) {
        logger.warn?.({ err: error.message }, '[CLIENTCARE-OPS] council assist failed');
      }
    }

    const request = await createCapabilityRequest(message, { requestedBy, priority: 'normal', normalizedIntent: text });
    return {
      ok: true,
      type: 'capability_request',
      reply: 'That capability is not implemented directly yet. I queued it as a ClientCare capability request for follow-up.',
      data: { capability_request: request },
    };
  }

  return {
    ask,
    buildOperationsOverview,
    findExistingClientMatch,
    intakeInsuranceCard,
    listSavedVobProspects,
    saveVobProspect,
    reconcileInsuranceWithClientcare,
    runFullClientcareCardVobPipeline,
    createCapabilityRequest,
    getInsuranceVerificationPreview,
    getOptimizationChecklist,
    getPatientArEscalationQueue,
    getPatientArPolicy,
    getPatientArSummary,
    listCapabilityRequests,
    repairAccount,
    runWorkflow,
    savePatientArPolicy,
    queuePatientArAction,
    promoteSavedVobProspect,
    updateCapabilityRequest,
  };
}
