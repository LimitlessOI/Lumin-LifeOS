/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-review-package-service.js
 * Persistent document review packages for mobile/portal review before filing or send-out.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const REVIEW_DIR = '/tmp/tc-review-packages';

function safeName(value) {
  return String(value || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createTCReviewPackageService({ pool, coordinator, logger = console }) {
  async function ensureDir() {
    await fs.mkdir(REVIEW_DIR, { recursive: true });
  }

  async function listPackages(transactionId, { limit = 50 } = {}) {
    const { rows } = await pool.query(
      `SELECT id, transaction_id, approval_id, title, doc_type, file_name, mime_type, size_bytes, status,
              review_summary, validation, metadata, created_at, updated_at
       FROM tc_review_packages
       WHERE transaction_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [transactionId, Math.min(Number(limit) || 50, 200)]
    );
    return rows;
  }

  async function getPackage(id) {
    const { rows } = await pool.query(`SELECT * FROM tc_review_packages WHERE id=$1`, [id]);
    return rows[0] || null;
  }

  async function createPackage({
    transactionId = null,
    title,
    docType = null,
    filePath,
    fileName,
    mimeType = null,
    sizeBytes = null,
    validation = {},
    reviewSummary = null,
    metadata = {},
  } = {}) {
    await ensureDir();
    const ext = path.extname(fileName || filePath || '') || '.bin';
    const finalName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const storedPath = path.join(REVIEW_DIR, finalName);
    await fs.copyFile(filePath, storedPath);

    const { rows } = await pool.query(
      `INSERT INTO tc_review_packages (transaction_id, title, doc_type, file_name, stored_path, mime_type, size_bytes, review_summary, validation, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        transactionId,
        title || fileName || 'Document review package',
        docType,
        fileName,
        storedPath,
        mimeType,
        sizeBytes,
        reviewSummary,
        JSON.stringify(validation || {}),
        JSON.stringify(metadata || {}),
      ]
    );
    const item = rows[0];
    if (transactionId) {
      await coordinator.logEvent(transactionId, 'review_package_created', {
        review_package_id: item.id,
        doc_type: docType,
        file_name: fileName,
      });
    }
    return item;
  }

  async function updatePackage(packageId, patch = {}) {
    const fields = [];
    const values = [];
    const allowed = ['approval_id', 'status', 'review_summary', 'validation', 'metadata'];
    for (const key of allowed) {
      if (key in patch) {
        const isJson = ['validation', 'metadata'].includes(key);
        values.push(isJson ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return getPackage(packageId);
    values.push(packageId);
    const { rows } = await pool.query(
      `UPDATE tc_review_packages SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async function resolveDownload(id) {
    const item = await getPackage(id);
    if (!item) return null;
    return {
      item,
      path: item.stored_path,
      fileName: safeName(item.file_name),
    };
  }

  return {
    listPackages,
    getPackage,
    createPackage,
    updatePackage,
    resolveDownload,
  };
}

export default createTCReviewPackageService;
