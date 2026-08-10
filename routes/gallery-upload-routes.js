/**
 * SYNOPSIS: HTTP route module — Gallery Upload Routes.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { Router } from 'express';

function createGalleryUploadRoutes({ requireKey, commitManyToGitHub, logger }) {
  const router = Router();

  router.post('/upload', requireKey, async (req, res) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ ok: false, error: 'files array is required' });
    }

    const fileEntries = [];
    for (const file of files) {
      if (!file || typeof file.filename !== 'string' || file.filename.trim() === '' || typeof file.base64 !== 'string' || file.base64.trim() === '') {
        return res.status(400).json({ ok: false, error: 'each file needs filename and base64' });
      }

      const sanitizedFilename = file.filename.replace(/\.{2,}/g, '').replace(/\//g, '');
      if (sanitizedFilename !== file.filename) {
        return res.status(400).json({ ok: false, error: 'invalid filename' });
      }
      
      fileEntries.push({
        path: `data/card-photos/${sanitizedFilename}`,
        content: file.base64,
        encoding: 'base64',
      });
    }

    try {
      await commitManyToGitHub(fileEntries, `[gallery-upload] ${fileEntries.length} photo(s)`, 'main');
      return res.status(200).json({ ok: true, count: fileEntries.length, paths: fileEntries.map(f => f.path) });
    } catch (err) {
      logger?.error?.({ err: err.message }, '[GALLERY-UPLOAD] commit failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createGalleryUploadRoutes };