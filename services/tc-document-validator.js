/**
 * SYNOPSIS: services/tc-document-validator.js
 * services/tc-document-validator.js
 * Validates real-estate transaction documents before upload to Transaction Desk.
 * Checks file type, expected address match, price field presence, and date presence.
 *
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 */
import fs from 'fs/promises';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.gif', '.webp', '.heic']);
const STREET_SUFFIX_RE = /(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|ter|boulevard|blvd|circle|cir)\b/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{2,3},\d{3}(?:\.\d{2})?\b/g;
const DATE_RE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;

export function createTCDocumentValidator({ logger = console } = {}) {
  async function validateFile({ filePath, fileName = '', docType = 'unknown', expectedAddress = null } = {}) {
    const warnings = [];
    const errors = [];
    const ext = path.extname(fileName || filePath || '').toLowerCase();
    const isImage = IMAGE_EXTENSIONS.has(ext);

    // Images: we can't parse text — do a lightweight structural check only
    if (isImage) {
      try {
        const stat = await fs.stat(filePath);
        if (stat.size < 1024) {
          warnings.push(`File size is very small (${stat.size} bytes) — may be corrupt or empty`);
        }
      } catch (e) {
        errors.push(`Cannot read file: ${e.message}`);
      }
      return {
        ok: errors.length === 0,
        blocks_upload: errors.length > 0,
        docType,
        isImage: true,
        warnings,
        errors,
      };
    }

    // Text-parseable documents (PDF text extraction not available — do what we can)
    let text = '';
    try {
      const buf = await fs.readFile(filePath);
      // Rough text extraction: strip binary, keep printable ASCII
      text = buf.toString('utf8', 0, Math.min(buf.length, 50_000))
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    } catch (e) {
      errors.push(`Cannot read file content: ${e.message}`);
      return { ok: false, blocks_upload: true, docType, isImage: false, warnings, errors };
    }

    const hasDates = DATE_RE.test(text);
    const hasPrices = PRICE_RE.test(text);
    const hasStreetSuffix = STREET_SUFFIX_RE.test(text);

    if (!hasDates) warnings.push('No recognizable dates found in document');
    if (!hasPrices) warnings.push('No recognizable prices/dollar amounts found in document');

    if (expectedAddress && hasStreetSuffix) {
      const addressTokens = expectedAddress.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const matched = addressTokens.filter(t => text.toLowerCase().includes(t));
      if (matched.length < Math.ceil(addressTokens.length * 0.5)) {
        warnings.push(`Expected address "${expectedAddress}" not clearly found in document`);
      }
    } else if (expectedAddress && !hasStreetSuffix) {
      warnings.push('Document does not appear to contain a street address');
    }

    logger.info?.({ docType, hasDates, hasPrices, warnings: warnings.length, errors: errors.length }, '[TC-DOC-VALIDATOR] validateFile result');

    return {
      ok: errors.length === 0,
      blocks_upload: errors.length > 0,
      docType,
      isImage: false,
      hasDates,
      hasPrices,
      hasStreetAddress: hasStreetSuffix,
      warnings,
      errors,
    };
  }

  return { validateFile };
}
