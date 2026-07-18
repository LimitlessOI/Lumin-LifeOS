/**
 * SYNOPSIS: Script — Site Builder Preview Expiry Cron.
 */
import fs from 'fs';
import path from 'path';

const DEFAULT_PREVIEW_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function getPreviewTtlDays() {
  const raw = process.env.PREVIEW_TTL_DAYS;

  if (raw == null || String(raw).trim() === '') {
    return DEFAULT_PREVIEW_TTL_DAYS;
  }

  const parsed = Number(String(raw).trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_PREVIEW_TTL_DAYS;
  }

  return parsed;
}

function isApplyMode() {
  return process.env.SWEEP_APPLY === '1' && Boolean(process.env.DATABASE_URL);
}

function isSafeChildPath(root, target) {
  return target.startsWith(root + path.sep);
}

async function listExpiredPreviewDirectories(root, ttlDays, summary) {
  const expired = [];

  try {
    const entries = await fs.promises.readdir(root, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const target = path.resolve(root, entry.name);

      if (!isSafeChildPath(root, target)) {
        summary.skipped += 1;
        continue;
      }

      summary.scanned += 1;

      const stat = await fs.promises.lstat(target);
      if (!stat.isDirectory()) {
        summary.skipped += 1;
        continue;
      }

      if (stat.mtimeMs < Date.now() - ttlDays * DAY_MS) {
        summary.expired += 1;
        expired.push({
          name: entry.name,
          path: target,
        });
      }
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return expired;
    }

    throw err;
  }

  return expired;
}

async function getProspectSitesColumns(pool) {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'prospect_sites'
    `,
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function buildProspectSiteExpiryUpdate(columns) {
  const setParts = [];
  const values = ['expired'];
  let paramIndex = values.length + 1;

  if (columns.has('status')) {
    setParts.push('status = $1');
  }

  if (columns.has('expired_at')) {
    setParts.push(`expired_at = NOW()`);
  }

  if (columns.has('updated_at')) {
    setParts.push(`updated_at = NOW()`);
  }

  if (setParts.length === 0) {
    return null;
  }

  const matchColumns = [
    'id',
    'preview_id',
    'preview_slug',
    'slug',
    'site_slug',
    'directory',
    'preview_dir',
    'preview_path',
    'preview_url',
  ].filter((column) => columns.has(column));

  if (matchColumns.length === 0) {
    return null;
  }

  const whereParts = [];

  for (const column of matchColumns) {
    whereParts.push(`"${column}"::text = ANY($${paramIndex}::text[])`);
  }

  values.push(null);

  return {
    text: `
      UPDATE prospect_sites
      SET ${setParts.join(', ')}
      WHERE ${whereParts.join(' OR ')}
    `,
    values,
    matchValuesIndex: paramIndex - 1,
  };
}

function getPreviewMatchValues(previewName) {
  return [
    previewName,
    `previews/${previewName}`,
    `/previews/${previewName}`,
    `public/previews/${previewName}`,
    `/public/previews/${previewName}`,
  ];
}

async function markProspectSiteExpired(pool, update, previewName) {
  if (!update) {
    return;
  }

  const values = [...update.values];
  values[update.matchValuesIndex] = getPreviewMatchValues(previewName);

  await pool.query(update.text, values);
}

async function applyExpiredPreviews(root, expired, summary) {
  const pg = await import('pg');
  const { Pool } = pg.default ?? pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    const columns = await getProspectSitesColumns(pool);
    const update = buildProspectSiteExpiryUpdate(columns);

    for (const preview of expired) {
      const target = path.resolve(preview.path);

      if (!isSafeChildPath(root, target)) {
        summary.skipped += 1;
        continue;
      }

      await fs.promises.rm(target, { recursive: true, force: true });
      summary.deleted += 1;

      await markProspectSiteExpired(pool, update, preview.name);
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

function resolvePreviewsRoot() {
  const explicit = process.env.SITE_PREVIEWS_DIR;
  if (explicit && explicit.trim()) {
    const trimmed = explicit.trim();
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
  }
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (volume && volume.trim()) {
    return path.join(volume.trim(), 'previews');
  }
  return path.resolve(process.cwd(), 'public/previews');
}

async function main() {
  const root = resolvePreviewsRoot();
  const ttlDays = getPreviewTtlDays();
  const apply = isApplyMode();

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    scanned: 0,
    expired: 0,
    deleted: 0,
    skipped: 0,
  };

  const expired = await listExpiredPreviewDirectories(root, ttlDays, summary);

  if (apply && expired.length > 0) {
    await applyExpiredPreviews(root, expired, summary);
  }

  console.log(JSON.stringify(summary));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });