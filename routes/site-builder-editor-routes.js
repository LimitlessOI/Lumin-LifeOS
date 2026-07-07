/**
 * SYNOPSIS: Exports createSiteBuilderEditorRoutes — routes/site-builder-editor-routes.js.
 */
import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';

const previewsRoot = path.resolve(process.cwd(), 'public/previews');

const validatePath = (clientId, filePath) => {
  if (!clientId || !/^[a-zA-Z0-9-]+$/.test(clientId)) {
    return null;
  }

  const clientDir = path.join(previewsRoot, clientId);
  const resolvedPath = path.resolve(clientDir, filePath);

  if (!resolvedPath.startsWith(clientDir + path.sep)) {
    return null;
  }

  if (resolvedPath.includes('..')) {
    return null;
  }

  return resolvedPath;
};

const authenticateEditor = async (req, res, next) => {
  const { clientId, token } = req.body;

  if (!clientId || !token) {
    return res.status(403).json({ ok: false, error: 'Authentication required: clientId and token missing.' });
  }

  try {
    const metaPath = path.join(previewsRoot, clientId, 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaContent);

    if (meta.editToken !== token) {
      return res.status(403).json({ ok: false, error: 'Invalid authentication token.' });
    }
    next();
  } catch (err) {
    console.error(`Authentication error for clientId ${clientId}: ${err.message}`);
    return res.status(403).json({ ok: false, error: 'Authentication failed.' });
  }
};

export function createSiteBuilderEditorRoutes(app, { callCouncilMember, baseUrl }) {
  const router = express.Router();

  router.post('/edit', authenticateEditor, async (req, res) => {
    const { clientId, file, instruction } = req.body;

    if (!clientId || !file || !instruction) {
      return res.status(400).json({ ok: false, error: 'Missing clientId, file, or instruction.' });
    }

    const targetFilePath = validatePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path or client ID.' });
    }

    try {
      const originalHtml = await fs.readFile(targetFilePath, 'utf8');

      const truthRules = `
        You must not invent prices, statistics, ratings, review counts, or named testimonials.
        All factual information must be grounded in the provided context or be general knowledge.
        Return the ENTIRE modified HTML document.
      `;

      const aiResponse = await callCouncilMember({
        model: 'strong-paid-model', // Assuming a strong paid model as per spec
        prompt: `Current HTML:\n${originalHtml}\n\nUser Instruction:\n${instruction}\n\n${truthRules}\n\nReturn only the complete, modified HTML document.`,
      });

      const modifiedHtml = aiResponse.content; // Assuming callCouncilMember returns { content: '...' }

      if (!modifiedHtml || !modifiedHtml.includes('<html')) {
        return res.status(500).json({ ok: false, error: 'AI response did not contain valid HTML.' });
      }

      const backupPath = `${targetFilePath}.${Date.now()}.bak`;
      await fs.writeFile(backupPath, originalHtml, 'utf8');
      await fs.writeFile(targetFilePath, modifiedHtml, 'utf8');

      res.json({ ok: true });
    } catch (error) {
      console.error(`Error during AI edit for ${targetFilePath}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to process AI edit.' });
    }
  });

  router.post('/save-edits', authenticateEditor, async (req, res) => {
    const { clientId, file, html } = req.body;

    if (!clientId || !file || !html) {
      return res.status(400).json({ ok: false, error: 'Missing clientId, file, or html content.' });
    }

    if (!html.includes('<html')) {
      return res.status(400).json({ ok: false, error: 'Provided HTML is not a complete document.' });
    }

    const targetFilePath = validatePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path or client ID.' });
    }

    try {
      // Read current content to create a backup
      const originalHtml = await fs.readFile(targetFilePath, 'utf8').catch(() => ''); // If file doesn't exist, backup is empty
      const backupPath = `${targetFilePath}.${Date.now()}.bak`;
      await fs.writeFile(backupPath, originalHtml, 'utf8');

      await fs.writeFile(targetFilePath, html, 'utf8');
      res.json({ ok: true });
    } catch (error) {
      console.error(`Error saving manual edits for ${targetFilePath}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to save edits.' });
    }
  });

  router.post('/revert', authenticateEditor, async (req, res) => {
    const { clientId, file } = req.body;

    if (!clientId || !file) {
      return res.status(400).json({ ok: false, error: 'Missing clientId or file.' });
    }

    const targetFilePath = validatePath(clientId, file);
    if (!targetFilePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path or client ID.' });
    }

    try {
      const clientDir = path.dirname(targetFilePath);
      const fileName = path.basename(targetFilePath);
      const backupFiles = (await fs.readdir(clientDir))
        .filter(f => f.startsWith(`${fileName}.`) && f.endsWith('.bak'))
        .map(f => ({
          name: f,
          timestamp: parseInt(f.split('.').slice(-2, -1)[0], 10)
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      if (backupFiles.length === 0) {
        return res.status(404).json({ ok: false, error: 'No backup files found to revert.' });
      }

      const latestBackupPath = path.join(clientDir, backupFiles[0].name);
      const backupContent = await fs.readFile(latestBackupPath, 'utf8');

      // Create a backup of the current file before reverting
      const currentContent = await fs.readFile(targetFilePath, 'utf8').catch(() => '');
      const preRevertBackupPath = `${targetFilePath}.${Date.now()}-pre-revert.bak`;
      await fs.writeFile(preRevertBackupPath, currentContent, 'utf8');

      await fs.writeFile(targetFilePath, backupContent, 'utf8');
      res.json({ ok: true });
    } catch (error) {
      console.error(`Error reverting file ${targetFilePath}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to revert file.' });
    }
  });

  app.use(`${baseUrl}/api/v1/sites`, router);
  return router;
}

export default createSiteBuilderEditorRoutes;