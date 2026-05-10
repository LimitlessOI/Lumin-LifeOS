/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-document-validator.js
 * Fail-closed document completeness validator for TC intake and upload flows.
 */

import fs from 'fs/promises';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.gif', '.webp', '.heic']);
const STREET_SUFFIX_RE = /(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|ter|boulevard|blvd|circle|cir)\b/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{2,3},\d{3}(?:\.\d{2})?\b/g;
const DATE_RE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i;

const DOC_PROFILES = {
  'Listing Agreement': {
    aliases: [/listing\s+agreement/i, /exclusive\s+listing/i, /listing\s+contract/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Listing agreement language present', test: ({ text }) => /listing\s+agreement|exclusive\s+listing|listing\s+contract/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'seller_identity', label: 'Seller/owner section found', test: ({ text }) => /seller|owner/i.test(text) },
      { id: 'list_date', label: 'Listing date / start date found', test: ({ text }) => /list\s+date|listing\s+date|commencement|start\s+date/i.test(text) || DATE_RE.test(text) },
      { id: 'expiration_date', label: 'Expiration date found', test: ({ text }) => /expiration|expires|termination\s+date/i.test(text) || /expiration\s+date/i.test(text) },
      { id: 'list_price', label: 'List price found', test: ({ facts }) => Boolean(facts.price) },
      { id: 'commission', label: 'Commission / compensation found', test: ({ facts, text }) => Boolean(facts.commission) || /commission|compensation|brokerage\s+fee/i.test(text) },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
      { id: 'initials', label: 'Initials/sign-off markers found', test: ({ text, facts }) => facts.initials_detected || /\binitial(?:s)?\b/i.test(text) },
      { id: 'date', label: 'Date indicator found', test: ({ text }) => DATE_RE.test(text) },
    ],
  },
  'Executed RPA': {
    aliases: [/executed\s+rpa/i, /purchase\s+agreement/i, /accepted\s+offer/i, /binding\s+agreement/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Purchase agreement language present', test: ({ text }) => /purchase\s+agreement|residential\s+purchase|rpa|binding\s+agreement/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'buyer_identity', label: 'Buyer section found', test: ({ text }) => /buyer/i.test(text) },
      { id: 'seller_identity', label: 'Seller section found', test: ({ text }) => /seller/i.test(text) },
      { id: 'price', label: 'Purchase price found', test: ({ facts }) => Boolean(facts.price) },
      { id: 'earnest_money', label: 'Earnest money / deposit found', test: ({ facts, text }) => Boolean(facts.earnest_money) || /earnest\s+money|emd|deposit/i.test(text) },
      { id: 'close_date', label: 'Close of escrow / close date found', test: ({ facts, text }) => Boolean(facts.close_date) || /close\s+of\s+escrow|coe|close\s+date/i.test(text) },
      { id: 'financing', label: 'Financing / cash terms found', test: ({ facts, text }) => Boolean(facts.financing_type) || /cash|conventional|fha|va|loan/i.test(text) },
      { id: 'contingencies', label: 'Contingency terms found', test: ({ facts, text }) => facts.contingencies.length > 0 || /contingency|inspection|appraisal|loan/i.test(text) },
      { id: 'execution', label: 'Execution/acceptance indicator found', test: ({ text }) => /accepted|fully\s+executed|binding|acceptance/i.test(text) },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
    ],
  },
  'Counter Offer': {
    aliases: [/counter\s+offer/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Counter-offer language present', test: ({ text }) => /counter\s+offer/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'price_or_terms', label: 'Price or changed terms found', test: ({ text, facts }) => Boolean(facts.price) || /term|credit|closing\s+cost|counter/i.test(text) },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
    ],
  },
  'Addendum': {
    aliases: [/addendum/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Addendum language present', test: ({ text }) => /addendum/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
    ],
  },
  'Disclosure': {
    aliases: [/disclosure/i, /seller\s+real\s+property\s+disclosure/i, /spds/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Disclosure language present', test: ({ text }) => /disclosure|spds/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
      { id: 'date', label: 'Date indicator found', test: ({ text }) => DATE_RE.test(text) },
    ],
  },
  'Lead-Based Paint Disclosure': {
    aliases: [/lead[-\s]?based\s+paint/i, /lead\s+paint\s+disclosure/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Lead-based paint disclosure language present', test: ({ text }) => /lead[-\s]?based\s+paint/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'buyer_identity', label: 'Buyer section found', test: ({ text }) => /buyer/i.test(text) },
      { id: 'seller_identity', label: 'Seller section found', test: ({ text }) => /seller/i.test(text) },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
      { id: 'date', label: 'Date indicator found', test: ({ text }) => DATE_RE.test(text) },
    ],
  },
  'Seller Property Disclosure': {
    aliases: [/seller\s+real\s+property\s+disclosure/i, /\bspds\b/i, /property\s+disclosure/i],
    requiredChecks: [
      { id: 'doc_language', label: 'Seller disclosure language present', test: ({ text }) => /seller\s+real\s+property\s+disclosure|spds|property\s+disclosure/i.test(text) },
      { id: 'property_address', label: 'Property address found', test: ({ facts, expectedAddressMatch }) => Boolean(facts.address) || expectedAddressMatch },
      { id: 'seller_identity', label: 'Seller section found', test: ({ text }) => /seller|owner/i.test(text) },
      { id: 'questionnaire', label: 'Disclosure questionnaire / statements found', test: ({ text }) => /yes|no|unknown|explain/i.test(text) },
      { id: 'signature', label: 'Signature indicator found', test: ({ text }) => /signature|signed/i.test(text) },
    ],
  },
  'Transaction Document': {
    aliases: [],
    requiredChecks: [
      { id: 'content', label: 'Readable text found', test: ({ text }) => text.length >= 120 },
      { id: 'property_context', label: 'Property context found', test: ({ facts, expectedAddressMatch, text }) => Boolean(facts.address) || expectedAddressMatch || /property|buyer|seller|listing/i.test(text) },
    ],
  },
};

function normalizeText(text) {
  return String(text || '')
    .replace(/\0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPrintableStrings(buffer) {
  const latin = buffer.toString('latin1');
  const matches = latin.match(/[A-Za-z0-9@$%#&*.,:;()_\-/\\'"\s]{4,}/g) || [];
  return normalizeText(matches.join(' '));
}

function detectAddress(text) {
  const inline = text.match(/\b\d{2,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,6}\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Boulevard|Blvd|Circle|Cir)\b(?:\s+[A-Za-z]{2,}){0,3}/i);
  if (inline?.[0]) return inline[0].trim();

  const lines = String(text || '').split(/\n|\s{2,}/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (/\b\d{2,6}\b/.test(line) && STREET_SUFFIX_RE.test(line)) {
      return line.replace(/\s+/g, ' ');
    }
  }
  return null;
}

function detectPrice(text) {
  const matches = text.match(PRICE_RE) || [];
  if (!matches.length) return null;
  return matches[0].replace(/\s+/g, '');
}

function detectEarnestMoney(text) {
  const match = text.match(/(?:earnest\s+money|emd|deposit)[^$0-9]{0,30}(\$?\s?\d[\d,]*(?:\.\d{2})?)/i);
  return match?.[1]?.replace(/\s+/g, '') || null;
}

function detectCommission(text) {
  const match = text.match(/(\d{1,2}(?:\.\d{1,2})?\s?%)[^.\n]{0,40}(?:commission|compensation|brokerage\s+fee)|(?:commission|compensation)[^.\n]{0,40}(\d{1,2}(?:\.\d{1,2})?\s?%)/i);
  return (match?.[1] || match?.[2] || null);
}

function detectCloseDate(text) {
  const match = text.match(/(?:close\s+of\s+escrow|close\s+date|closing\s+date|coe)[^A-Za-z0-9]{0,20}([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  return match?.[1] || null;
}

function detectFinancing(text) {
  const lower = text.toLowerCase();
  if (/\bcash\b/.test(lower)) return 'cash';
  if (/\bconventional\b/.test(lower)) return 'conventional';
  if (/\bfha\b/.test(lower)) return 'fha';
  if (/\bva\b/.test(lower)) return 'va';
  if (/\bloan\b|\bfinancing\b/.test(lower)) return 'financed';
  return null;
}

function detectContingencies(text) {
  const lower = text.toLowerCase();
  const items = [];
  if (/inspection/.test(lower)) items.push('inspection');
  if (/appraisal/.test(lower)) items.push('appraisal');
  if (/\bloan\b|\bfinancing\b/.test(lower)) items.push('loan');
  if (/sale\s+of\s+buyer'?s\s+property|contingent\s+on\s+buyer.?s\s+property/.test(lower)) items.push('sale_of_home');
  return items;
}

function detectInitials(text) {
  return /\binitial(?:s)?\b|\/s\/|buyer(?:\(s\))?\s+initial|seller(?:\(s\))?\s+initial/i.test(text);
}

function detectParties(text) {
  const parties = {};
  const buyer = text.match(/buyer(?:\(s\))?[:\s]+([A-Za-z ,.'-]{3,80})/i);
  const seller = text.match(/seller(?:\(s\))?[:\s]+([A-Za-z ,.'-]{3,80})/i);
  if (buyer) parties.buyer = buyer[1].trim();
  if (seller) parties.seller = seller[1].trim();
  return parties;
}

function expectedAddressMatch(text, expectedAddress) {
  if (!expectedAddress) return false;
  const needle = expectedAddress.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const hay = text.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  return Boolean(needle) && hay.includes(needle);
}

async function tryOCR(filePath, logger) {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const result = await worker.recognize(filePath);
    await worker.terminate();
    return normalizeText(result?.data?.text || '');
  } catch (err) {
    logger.warn?.({ err: err.message, filePath }, '[TC-DOC-VALIDATOR] OCR failed');
    return '';
  }
}

function resolveDocProfile(docType, fileName, text) {
  const candidates = [docType, fileName, text].filter(Boolean).join(' ');
  for (const [profileName, profile] of Object.entries(DOC_PROFILES)) {
    if (profile.aliases.some((pattern) => pattern.test(candidates))) return profileName;
  }
  return DOC_PROFILES[docType] ? docType : 'Transaction Document';
}

export function createTCDocumentValidator({ logger = console } = {}) {
  async function extractTextFromFile(filePath, fileName = filePath) {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (IMAGE_EXTENSIONS.has(ext)) {
      const ocrText = await tryOCR(filePath, logger);
      if (ocrText) return { text: ocrText, extractionMethod: 'ocr' };
    }

    const decoded = normalizeText(buffer.toString('utf8'));
    if (decoded.length >= 120) return { text: decoded, extractionMethod: 'utf8' };

    const printable = extractPrintableStrings(buffer);
    return { text: printable, extractionMethod: 'printable_strings' };
  }

  async function validateFile({ filePath, fileName, docType = 'Transaction Document', expectedAddress = null, extractedText = null }) {
    const { text, extractionMethod } = extractedText
      ? { text: normalizeText(extractedText), extractionMethod: 'provided_text' }
      : await extractTextFromFile(filePath, fileName);

    const profileName = resolveDocProfile(docType, fileName, text);
    const profile = DOC_PROFILES[profileName] || DOC_PROFILES['Transaction Document'];
    const facts = {
      address: detectAddress(text),
      price: detectPrice(text),
      earnest_money: detectEarnestMoney(text),
      commission: detectCommission(text),
      close_date: detectCloseDate(text),
      financing_type: detectFinancing(text),
      contingencies: detectContingencies(text),
      initials_detected: detectInitials(text),
      parties: detectParties(text),
    };
    const addressMatch = expectedAddressMatch(text, expectedAddress);
    const ctx = { text, facts, expectedAddressMatch: addressMatch };
    const checks = profile.requiredChecks.map((check) => ({
      id: check.id,
      label: check.label,
      passed: Boolean(check.test(ctx)),
    }));

    const passed = checks.filter((check) => check.passed).length;
    const missingItems = checks.filter((check) => !check.passed).map((check) => check.label);
    const confidence = Number((passed / Math.max(checks.length, 1)).toFixed(2));
    const verdict = text.length < 40
      ? 'review'
      : missingItems.length === 0
        ? 'pass'
        : missingItems.length <= 1 && confidence >= 0.7
          ? 'review'
          : 'fail';

    return {
      ok: verdict === 'pass',
      verdict,
      blocks_upload: verdict !== 'pass',
      confidence,
      doc_type: profileName,
      extraction_method: extractionMethod,
      expected_address: expectedAddress,
      expected_address_match: addressMatch,
      missing_items: missingItems,
      checks,
      extracted_facts: facts,
      recommendation:
        verdict === 'pass'
          ? 'Document passed the current completeness checks.'
          : verdict === 'review'
            ? 'Document needs human review before upload.'
            : 'Document is missing required signals and should not upload automatically.',
      text_preview: text.slice(0, 800),
      file_name: fileName,
      file_path: filePath,
    };
  }

  async function validateFiles(files = [], options = {}) {
    const results = [];
    for (const file of files) {
      results.push(await validateFile({
        filePath: file.filePath,
        fileName: file.filename || file.filePath,
        docType: file.docType || options.docType,
        expectedAddress: options.expectedAddress || file.expectedAddress || null,
        extractedText: file.extractedText || null,
      }));
    }
    return {
      ok: results.every((item) => item.verdict === 'pass'),
      blocked: results.some((item) => item.blocks_upload),
      results,
      pass_count: results.filter((item) => item.verdict === 'pass').length,
      review_count: results.filter((item) => item.verdict === 'review').length,
      fail_count: results.filter((item) => item.verdict === 'fail').length,
    };
  }

  return { extractTextFromFile, validateFile, validateFiles };
}

export default createTCDocumentValidator;
