/**
 * SYNOPSIS: Exports createXxxRoutes — routes/knowledge-base-routes.js.
 */
import express from "express";

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (tags == null) return [];
  if (typeof tags === "string") {
    const trimmed = tags.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function toErrorResponse(res, status, error, detail) {
  const payload = { ok: false, error };
  if (detail !== undefined) payload.detail = detail;
  return res.status(status).json(payload);
}

async function readMultipartBody(req) {
  if (req.file) {
    return req.file;
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("multipart/form-data")) return null;

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;

  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const parts = body.toString("binary").split(boundary).slice(1, -1);

  const fields = {};
  let file = null;

  for (const part of parts) {
    const normalized = part.replace(/^\r?\n/, "").replace(/\r?\n--$/, "");
    const separatorIndex = normalized.indexOf("\r\n\r\n");
    if (separatorIndex === -1) continue;

    const headerText = normalized.slice(0, separatorIndex);
    const valueText = normalized.slice(separatorIndex + 4);
    const headers = headerText.split(/\r?\n/);

    const disposition = headers.find((line) => /^content-disposition:/i.test(line));
    if (!disposition) continue;

    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]*)"/i);
    const fieldName = nameMatch?.[1];

    if (!fieldName) continue;

    if (filenameMatch) {
      const data = Buffer.from(valueText.replace(/\r?\n$/, ""), "binary");
      file = {
        fieldname: fieldName,
        originalname: filenameMatch[1] || "upload.bin",
        buffer: data,
        size: data.length,
      };
    } else {
      fields[fieldName] = valueText.replace(/\r?\n$/, "");
    }
  }

  return { file, fields };
}

export function createXxxRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post("/api/v1/knowledge/upload", requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return toErrorResponse(res, 401, "jwt_required");

      let file = req.file || null;
      let category = req.body?.category;
      let tags = req.body?.tags;

      if (!file || category == null || tags == null) {
        const parsed = await readMultipartBody(req);
        if (parsed?.file && !file) file = parsed.file;
        if (parsed?.fields) {
          if (category == null && parsed.fields.category != null) category = parsed.fields.category;
          if (tags == null && parsed.fields.tags != null) tags = parsed.fields.tags;
        }
      }

      if (!file?.buffer) return toErrorResponse(res, 400, "file_required");
      if (typeof category !== "string" || !category.trim()) return toErrorResponse(res, 400, "category_required");

      const normalizedTags = normalizeTags(tags);

      const sql = `
        INSERT INTO knowledge_base_files (file_data, category, tags)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, category, tags
      `;
      const params = [file.buffer, category.trim(), JSON.stringify(normalizedTags)];
      const { rows } = await pool.query(sql, params);
      const data = rows[0] || null;

      logger?.info?.("knowledge_base_upload_created", {
        ownerId,
        category: data?.category || category.trim(),
        fileName: file.originalname || null,
      });

      return res.json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}