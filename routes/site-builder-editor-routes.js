/**
 * SYNOPSIS: Exports createSiteBuilderEditorRoutes — routes/site-builder-editor-routes.js.
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const previewsRoot = path.resolve(process.cwd(), 'public/previews');

const sanitizePath = (clientId, filePath) => {
  if (!clientId || !/^[\\w-]+$/.test(clientId)) {
    return null;
  }
  if (filePath.includes('..') || path.isAbsolute(filePath)) {
    return null;
  }

  const resolvedPath = path.resolve(previewsRoot, clientId, filePath);
  if (!resolvedPath.startsWith(path.join(previewsRoot, clientId) + path.sep) && resolvedPath !== path.join(previewsRoot, clientId)) {
    return null;
  }
  return resolvedPath;
};

const authenticateEditor = async (req, res, next) => {
  const { clientId, token } = req.body;

  if (!clientId || !token) {
    return res.status(403).json({ ok: false, error: 'Missing client ID or token.' });
  }

  const metaPath = sanitizePath(clientId, 'meta.json');
  if (!metaPath) {
    return res.status(403).json({ ok: false, error: 'Invalid client ID or path.' });
  }

  try {
    const metaContent = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaContent);

    if (meta.editToken !== token) {
      return res.status(403).json({ ok: false, error: 'Invalid authentication token.' });
    }
    next();
  } catch (error) {
    console.error(`Authentication failed for client ${clientId}: ${error.message}`);
    return res.status(403).json({ ok: false, error: 'Authentication failed.' });
  }
};

export function createSiteBuilderEditorRoutes(app, { callCouncilMember, baseUrl }) {
  const router = Router();

  router.post('/edit', authenticateEditor, async (req, res) => {
    const { clientId, file, instruction } = req.body;

    const targetFilePath = sanitizePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path.' });
    }

    try {
      const originalHtml = await fs.readFile(targetFilePath, 'utf8');

      const truthRules = [
        "Do not invent prices, stats, ratings, or review counts.",
        "Do not fabricate named testimonials or customer quotes."
      ];

      const modelResponse = await callCouncilMember('strong-paid-model', {
        prompt: `The user wants to modify the following HTML document based on their instruction. Return the ENTIRE modified HTML document. Ensure all HTML is valid and well-formed. Do not omit any part of the document unless explicitly instructed.\n\nCurrent HTML:\n${originalHtml}\n\nUser Instruction: ${instruction}\n\nStrict Rules: ${truthRules.join(' ')}`,
      });

      if (!modelResponse || typeof modelResponse !== 'string' || !modelResponse.includes('<html')) {
        return res.status(500).json({ ok: false, error: 'AI response was invalid or incomplete.' });
      }

      const backupPath = `${targetFilePath}.${Date.now()}.bak`;
      await fs.writeFile(backupPath, originalHtml, 'utf8');
      await fs.writeFile(targetFilePath, modelResponse, 'utf8');

      res.json({ ok: true });
    } catch (error) {
      console.error(`Error processing AI edit for ${clientId}/${file}: ${error.message}`);
      res.status(500).json({ ok: false, error: 'Failed to process AI edit.' });
    }
  });

  router.post('/save-edits', authenticateEditor, async (req, res) => {
    const { clientId, file, html } = req.body;

    if (!html || !html.includes('<html')) {
      return res.status(400).json({ ok: false, error: 'Invalid HTML content provided.' });
    }

    const targetFilePath = sanitizePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path.' });
    }

    try {
      if (existsSync(targetFilePath)) {
        const originalHtml = await fs.readFile(targetFilePath, 'utf8');
        const backupPath = `${targetFilePath}.${Date.now()}.bak`;
        await fs.writeFile(backupPath, originalHtml, 'utf8');
      }
      await fs.writeFile(targetFilePath, html, 'utf8');
      res.json({ ok: true });
    } catch (error) {
      console.error(`Error saving manual edits for ${clientId}/${file}: ${error.message}`);
      res.status(500).json({ ok: false, error: 'Failed to save edits.' });
    }
  });

  router.post('/revert', authenticateEditor, async (req, res) => {
    const { clientId, file } = req.body;

    const targetFilePath = sanitizePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path.' });
    }

    try {
      const dirname = path.dirname(targetFilePath);
      const filename = path.basename(targetFilePath);
      const filesInDir = await fs.readdir(dirname);

      const bakFiles = filesInDir
        .filter(f => f.startsWith(filename) && f.endsWith('.bak'))
        .map(f => ({
          name: f,
          timestamp: parseInt(f.split('.').slice(-2, -1)[0], 10)
        }))
        .filter(f => !isNaN(f.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      if (bakFiles.length === 0) {
        return res.status(404).json({ ok: false, error: 'No backup files found to revert.' });
      }

      const newestBakPath = path.join(dirname, bakFiles[0].name);
      const backupContent = await fs.readFile(newestBakPath, 'utf8');

      // Optionally, create a backup of the current file before reverting
      if (existsSync(targetFilePath)) {
         const currentContent = await fs.readFile(targetFilePath, 'utf8');
         const preRevertBackupPath = `${targetFilePath}.${Date.now()}.pre_revert.bak`;
         await fs.writeFile(preRevertBackupPath, currentContent, 'utf8');
      }

      await fs.writeFile(targetFilePath, backupContent, 'utf8');
      res.json({ ok: true });
    } catch (error) {
      console.error(`Error reverting file ${clientId}/${file}: ${error.message}`);
      res.status(500).json({ ok: false, error: 'Failed to revert file.' });
    }
  });

  app.use('/api/v1/sites', router);
  return router;
}

export default createSiteBuilderEditorRoutes;