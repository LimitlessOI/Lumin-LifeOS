// SYNOPSIS: Local (R2-ready) media storage for Creative Engine uploads and outputs
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function safeJoin(baseDir, ...parts) {
  const resolvedBase = path.resolve(baseDir);
  const target = path.resolve(resolvedBase, ...parts);
  if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) {
    throw new Error('path_traversal_rejected');
  }
  return target;
}

export function createMediaStorage({
  baseDir = path.join(process.cwd(), 'public/previews/creative'),
  publicBaseUrl = '',
  logger = console,
} = {}) {
  const root = path.resolve(baseDir);

  async function ensureDirs() {
    await fs.mkdir(root, { recursive: true });
    await fs.mkdir(path.join(root, 'uploads'), { recursive: true });
    await fs.mkdir(path.join(root, 'outputs'), { recursive: true });
    await fs.mkdir(path.join(root, 'tmp'), { recursive: true });
  }

  function relativeKey(absPath) {
    return path.relative(root, absPath).split(path.sep).join('/');
  }

  function getPublicUrl(key) {
    const base = String(publicBaseUrl || '').replace(/\/$/, '');
    const rel = String(key || '').replace(/^\/+/, '');
    if (!base) return `/previews/creative/${rel}`;
    return `${base}/previews/creative/${rel}`;
  }

  function getLocalPath(key) {
    return safeJoin(root, ...String(key).split('/').filter(Boolean));
  }

  async function saveUpload(data, { ownerId = 'anon', filename = 'upload.bin', kind = 'upload' } = {}) {
    await ensureDirs();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload.bin';
    const folder = kind === 'output' ? 'outputs' : kind === 'tmp' ? 'tmp' : 'uploads';
    const key = `${folder}/${ownerId}/${Date.now()}_${randomUUID().slice(0, 8)}_${safeName}`;
    const abs = getLocalPath(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      await fs.writeFile(abs, data);
    } else if (typeof data === 'string') {
      await fs.copyFile(data, abs);
    } else {
      throw new Error('unsupported_upload_data');
    }
    const publicUrl = getPublicUrl(key);
    logger?.info?.('[CREATIVE-STORAGE] saved', { key, kind });
    return { key, absolutePath: abs, publicUrl };
  }

  async function writeTemp(filename, contents) {
    await ensureDirs();
    const key = `tmp/${Date.now()}_${randomUUID().slice(0, 8)}_${String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const abs = getLocalPath(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, contents, 'utf8');
    return { key, absolutePath: abs };
  }

  return {
    root,
    ensureDirs,
    getLocalPath,
    getPublicUrl,
    saveUpload,
    writeTemp,
    relativeKey,
  };
}

export default createMediaStorage;
