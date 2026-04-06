/**
 * Real OCR test — run against card images in ~/Desktop/test-cards/
 * Usage: node scripts/test-card-ocr.mjs
 */
import { createWorker } from 'tesseract.js';
import { parseInsuranceCardText, cleanExtractedValue } from '../services/insurance-card-parse.js';
import path from 'path';
import fs from 'fs';

const DIR = path.join(process.env.HOME, 'Desktop/test-cards');
const seen = new Set();
const files = fs.readdirSync(DIR)
  .map(f => ({ name: f, full: path.join(DIR, f), size: fs.statSync(path.join(DIR, f)).size }))
  .filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
  .filter(f => { if (seen.has(f.size)) return false; seen.add(f.size); return true; })
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`Testing ${files.length} unique image(s)...\n`);

for (const { name, full } of files) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILE: ${name}`);
  console.log('='.repeat(60));
  try {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data } = await worker.recognize(full);
    await worker.terminate();
    const rawText = cleanExtractedValue(data?.text || '');
    const parsed = parseInsuranceCardText(rawText);

    const ok = (v) => v ? `✓ ${v}` : '✗ (empty)';
    console.log('payer_name:      ', ok(parsed.payer_name));
    console.log('member_id:       ', ok(parsed.member_id));
    console.log('group_number:    ', ok(parsed.group_number));
    console.log('subscriber_name: ', ok(parsed.subscriber_name));
    console.log('effective_date:  ', ok(parsed.effective_date));
    console.log('plan_name:       ', ok(parsed.plan_name));
    console.log('confidence:      ', parsed.confidence);
    console.log('\n--- raw OCR (first 500 chars) ---');
    console.log(rawText.slice(0, 500));
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}
