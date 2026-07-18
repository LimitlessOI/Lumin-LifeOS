/**
 * SYNOPSIS: Single source of truth for where Site Builder preview sites live on disk.
 * On Railway the container filesystem is ephemeral — anything under public/previews is
 * wiped on every redeploy, which 404s emailed preview links and the publish checkout.
 * Point SITE_PREVIEWS_DIR (or RAILWAY_VOLUME_MOUNT_PATH) at a persistent volume to survive redeploys.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import path from 'node:path';

export const PREVIEWS_URL_PREFIX = '/previews';

/**
 * Absolute path to the previews directory.
 * Resolution order:
 *   1. SITE_PREVIEWS_DIR (explicit override; absolute or relative to cwd)
 *   2. RAILWAY_VOLUME_MOUNT_PATH + /previews (persistent volume)
 *   3. public/previews (default — ephemeral on Railway, fine for local dev)
 */
export function resolvePreviewsDir() {
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

export default { resolvePreviewsDir, PREVIEWS_URL_PREFIX };
