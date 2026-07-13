// SYNOPSIS: Patch existing preview row with corrected design-system tier and regenerate the variant switcher HTML.

import pg from 'pg';
import SiteBuilder from '../services/site-builder.js';
import { getDesignSystem } from '../config/design-studio.js';

const clientId = process.argv[2] || 'prev_1783969932165_08i5';
const baseUrl = process.env.SITE_BASE_URL || 'https://robust-magic-production.up.railway.app';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(
    `SELECT metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  const row = result.rows[0];
  if (!row) {
    console.error('No prospect row found for', clientId);
    await pool.end();
    process.exit(1);
  }
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (!Array.isArray(metadata.variants)) {
    console.error('No variants in metadata');
    await pool.end();
    process.exit(1);
  }
  const variants = metadata.variants.map((v) => {
    const ds = getDesignSystem(v.id);
    return { ...v, tier: ds?.tier || v.tier || 'paid' };
  });

  const builder = new SiteBuilder({ baseUrl });
  const newHtml = builder.generateVariantSwitcher(metadata.businessInfo || {}, clientId, variants, metadata.editToken || '');

  console.log('newHtml free count:', (newHtml.match(/"tier":"free"/g) || []).length);
  console.log('newHtml paid count:', (newHtml.match(/"tier":"paid"/g) || []).length);

  metadata.previewHtml = newHtml;
  metadata.variants = variants;

  await pool.query(
    `UPDATE prospect_sites SET metadata = $1::jsonb WHERE client_id = $2`,
    [JSON.stringify(metadata), clientId]
  );
  console.log('Patched', clientId, 'with', variants.length, 'variants');
  console.log('Tiers:', variants.map((v) => `${v.id}:${v.tier}`).join(' | '));
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
