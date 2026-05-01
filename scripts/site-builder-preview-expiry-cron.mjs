import pg from 'pg';
import { runPreviewExpiry } from '../services/preview-expiry-cron.js';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    const previewsDir = path.join(__dirname, '..', 'public', 'previews');
    const result = await runPreviewExpiry(pool, previewsDir);
    console.log(JSON.stringify(result, null, 2));
    if (result.error) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});