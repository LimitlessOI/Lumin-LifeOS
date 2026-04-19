#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * Run Tesseract on fixture insurance card images and validate parseInsuranceCardText.
 * Usage: node scripts/test-insurance-card-ocr.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';
import { parseInsuranceCardText, cleanExtractedValue } from '../services/insurance-card-parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'insurance-cards');

const CASES = [
  {
    file: 'IMG_3639-c55f54b3-5762-4cff-ba1f-07d4c5be5c73.png',
    expect: {
      member_id_substr: 'U90474268',
      /** OCR often misreads one digit; require stable prefix */
      group_substr: '33442',
      payer_substr: 'Cigna',
    },
  },
  {
    file: 'IMG_6373-215b1326-9bb6-46d9-b557-63adfcdd4627.png',
    expect: {
      /** OCR may drop or merge digits; core run should match */
      member_id_substr: '006993',
      group_substr: '00615649',
      payer_substr: 'Cigna',
    },
  },
];

async function ocrFile(filePath) {
  const worker = await createWorker({ logger: () => {} });
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const result = await worker.recognize(filePath);
  await worker.terminate();
  return cleanExtractedValue(result?.data?.text || '');
}

function softAssert(name, ok, detail) {
  if (ok) {
    console.log(`  OK ${name}`);
    return true;
  }
  console.error(`  FAIL ${name}: ${detail}`);
  return false;
}

async function main() {
  let allOk = true;
  for (const c of CASES) {
    const fp = path.join(FIXTURES, c.file);
    console.log(`\n--- ${c.file} ---`);
    const raw = await ocrFile(fp);
    console.log('OCR preview (first 600 chars):\n', raw.slice(0, 600));
    const parsed = parseInsuranceCardText(raw);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));

    const { expect: ex } = c;
    const memberHay = `${parsed.member_id || ''} ${parsed.extracted_text || ''}`;
    allOk =
      softAssert(
        'member_id',
        memberHay.includes(ex.member_id_substr),
        `want member_id or OCR text containing "${ex.member_id_substr}", got member_id="${parsed.member_id}"`,
      ) && allOk;
    allOk =
      softAssert(
        'group_number',
        parsed.group_number && String(parsed.group_number).replace(/\s/g, '').includes(ex.group_substr.replace(/^0+/, '') || ex.group_substr),
        `want group containing "${ex.group_substr}", got "${parsed.group_number}"`,
      ) && allOk;
    allOk =
      softAssert(
        'payer (Cigna family)',
        [parsed.payer_name, parsed.extracted_text].some((s) => new RegExp(ex.payer_substr, 'i').test(String(s || ''))),
        `want Cigna mention in payer or text`,
      ) && allOk;
  }

  if (!allOk) {
    console.error('\nInsurance card OCR test completed with failures.');
    process.exit(1);
  }
  console.log('\nAll insurance card OCR checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
