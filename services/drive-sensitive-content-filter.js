/**
 * SYNOPSIS: Service module — Drive Sensitive Content Filter.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

/**
 * Heuristic v1: Domain/keyword/pattern matching for the clearest cases only,
 * not a full content classifier. This module provides functions to redact
 * sensitive information based on explicit content domains/keywords, PII patterns,
 * and specific element types. It does not claim complete coverage for all
 * sensitive content.
 */

const EXPLICIT_KEYWORDS = /(porn|nsfw|xxx|onlyfans|sex|nude|erotic|adult|fetish|hentai|masturbate|orgasm|bdsm|kink|camgirl|escort)/i;
const EXPLICIT_DOMAINS = /(porn\.com|xhamster\.com|pornhub\.com|redtube\.com|youporn\.com|onlyfans\.com|manyvids\.com|chaturbate\.com|stripchat\.com|bonga\.com)/i;

const PII_SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const PII_CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,16}\b/g; // Loosely matches 13-16 digits with optional spaces/hyphens

const REDACTION_MARKER = '[REDACTED]';

/**
 * Redacts sensitive text based on explicit content keywords/domains and PII patterns.
 * @param {string} text The text to redact.
 * @param {string} [url] The URL associated with the text, used for explicit domain matching.
 * @returns {{text: string, redacted: boolean, category: string|null}}
 */
function redactSensitiveText(text, url) {
  if (!text) {
    return { text, redacted: false, category: null };
  }

  // (a) Explicit content check
  if (EXPLICIT_KEYWORDS.test(text) || (url && EXPLICIT_DOMAINS.test(url))) {
    return { text: REDACTION_MARKER, redacted: true, category: 'explicit' };
  }

  // (b) PII-shaped patterns
  let redactedText = text;
  let isRedacted = false;

  if (PII_SSN_PATTERN.test(redactedText)) {
    redactedText = redactedText.replace(PII_SSN_PATTERN, REDACTION_MARKER);
    isRedacted = true;
  }

  if (PII_CREDIT_CARD_PATTERN.test(redactedText)) {
    redactedText = redactedText.replace(PII_CREDIT_CARD_PATTERN, REDACTION_MARKER);
    isRedacted = true;
  }

  if (isRedacted) {
    return { text: redactedText, redacted: true, category: 'pii' };
  }

  return { text, redacted: false, category: null };
}

/**
 * Redacts sensitive elements in an array.
 * @param {Array<{text: string, type?: string}>} elements An array of elements, each with a .text and optional .type field.
 * @returns {Array<{text: string, type?: string}>} A new array with redacted elements.
 */
function redactSensitiveElements(elements) {
  if (!elements || !Array.isArray(elements)) {
    return [];
  }

  return elements.map(el => {
    if (!el || typeof el.text !== 'string') {
      return el; // Return original if not a valid element or text is missing
    }

    if (el.type && el.type.toLowerCase() === 'password') {
      return { ...el, text: REDACTION_MARKER, _redactionCategory: 'password' };
    }

    const { text: redactedText, redacted, category } = redactSensitiveText(el.text);
    if (redacted) {
      return { ...el, text: redactedText, _redactionCategory: category };
    }
    return el;
  });
}

/**
 * Redacts sensitive content within an observation object.
 * @param {{url?: string, title?: string, text?: string, elements?: Array<{text: string, type?: string}>}} observation The observation object.
 * @returns {{url?: string, title?: string, text?: string, elements?: Array<{text: string, type?: string}>, _redactions: string[]}} A new observation object with redacted content and a list of redaction categories.
 */
function redactObservation(observation) {
  if (!observation) {
    return { _redactions: [] };
  }

  const newObservation = { ...observation };
  const redactionCategories = new Set();

  if (newObservation.text) {
    const { text: redactedText, redacted, category } = redactSensitiveText(newObservation.text, newObservation.url);
    if (redacted) {
      newObservation.text = redactedText;
      if (category) redactionCategories.add(category);
    }
  }

  if (newObservation.elements && Array.isArray(newObservation.elements)) {
    newObservation.elements = redactSensitiveElements(newObservation.elements).map(el => {
      if (el._redactionCategory) {
        redactionCategories.add(el._redactionCategory);
        const { _redactionCategory, ...rest } = el; // Remove internal category tag
        return rest;
      }
      return el;
    });
  }

  newObservation._redactions = Array.from(redactionCategories);

  return newObservation;
}

export default {
  redactSensitiveText,
  redactSensitiveElements,
  redactObservation,
};