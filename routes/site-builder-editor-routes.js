/**
 * SYNOPSIS: Exports createSiteBuilderEditorRoutes — routes/site-builder-editor-routes.js.
 */
import { Router } from 'express';
import path from 'path';
import { promises as fs } from 'fs';

const previewsRoot = path.resolve(process.cwd(), 'public/previews');

const validatePath = (clientId, filePath) => {
  if (!clientId || !/^[a-zA-Z0-9-]+$/.test(clientId)) {
    return null; // Invalid clientId
  }

  const resolvedPath = path.resolve(previewsRoot, clientId, filePath);

  if (!resolvedPath.startsWith(path.join(previewsRoot, clientId + path.sep))) {
    return null; // Path traversal attempt
  }

  if (resolvedPath.includes('..')) {
    return null; // Path traversal attempt with '..'
  }

  return resolvedPath;
};

const readMetaJson = async (clientId) => {
  const metaPath = validatePath(clientId, 'meta.json');
  if (!metaPath) {
    throw new Error('Invalid client ID or meta.json path');
  }
  try {
    const metaContent = await fs.readFile(metaPath, 'utf8');
    return JSON.parse(metaContent);
  } catch (error) {
    if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
      return null;
    }
    throw error;
  }
};

const authenticate = async (req, res, next) => {
  const { clientId, token } = req.body;

  if (!clientId || !token) {
    return res.status(400).json({ ok: false, error: 'Missing clientId or token' });
  }

  try {
    const meta = await readMetaJson(clientId);
    if (!meta || meta.editToken !== token) {
      return res.status(403).json({ ok: false, error: 'Authentication failed' });
    }
    next();
  } catch (error) {
    console.error(`Authentication error for clientId ${clientId}:`, error);
    return res.status(500).json({ ok: false, error: 'Server error during authentication' });
  }
};

export function createSiteBuilderEditorRoutes(app, { callCouncilMember, baseUrl }) {
  const router = Router();

  router.post('/edit', authenticate, async (req, res) => {
    const { clientId, file, instruction } = req.body;
    if (!file || !instruction) {
      return res.status(400).json({ ok: false, error: 'Missing file or instruction' });
    }

    const filePath = validatePath(clientId, file);
    if (!filePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path' });
    }

    try {
      const originalContent = await fs.readFile(filePath, 'utf8');

      const truthRules = `
        You must not invent or fabricate any of the following:
        - Prices
        - Statistics
        - Ratings
        - Review counts
        - Named testimonials (e.g., "John Doe says...")
        Only use information explicitly provided or inferable from the existing HTML.
      `;

      const aiResponse = await callCouncilMember('strong', {
        prompt: `The user wants to edit the following HTML document based on the instruction provided. Return the ENTIRE modified HTML document.
        
        Current HTML:
        ${originalContent}

        User Instruction:
        ${instruction}

        ${truthRules}
        `,
      });

      if (!aiResponse || typeof aiResponse !== 'string' || !aiResponse.includes('<html')) {
        return res.status(500).json({ ok: false, error: 'AI response was invalid or incomplete.' });
      }

      const backupPath = `${filePath}.${Date.now()}.bak`;
      await fs.writeFile(backupPath, originalContent, 'utf8');
      await fs.writeFile(filePath, aiResponse, 'utf8');

      res.json({ ok: true });
    } catch (error) {
      console.error(`Error processing AI edit for ${clientId}/${file}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to process AI edit.' });
    }
  });

  router.post('/save-edits', authenticate, async (req, res) => {
    const { clientId, file, html } = req.body;
    if (!file || !html) {
      return res.status(400).json({ ok: false, error: 'Missing file or html content' });
    }

    if (!html.includes('<html')) {
      return res.status(400).json({ ok: false, error: 'Invalid HTML content.' });
    }

    const filePath = validatePath(clientId, file);
    if (!filePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path' });
    }

    try {
      const originalContent = await fs.readFile(filePath, 'utf8');
      const backupPath = `${filePath}.${Date.now()}.bak`;
      await fs.writeFile(backupPath, originalContent, 'utf8');
      await fs.writeFile(filePath, html, 'utf8');

      res.json({ ok: true });
    } catch (error) {
      console.error(`Error saving manual edits for ${clientId}/${file}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to save edits.' });
    }
  });

  router.post('/revert', authenticate, async (req, res) => {
    const { clientId, file } = req.body;
    if (!file) {
      return res.status(400).json({ ok: false, error: 'Missing file' });
    }

    const filePath = validatePath(clientId, file);
    if (!filePath) {
      return res.status(403).json({ ok: false, error: 'Invalid file path' });
    }

    try {
      const backupDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const filesInDir = await fs.readdir(backupDir);

      const backups = filesInDir
        .filter(f => f.startsWith(`${fileName}.`) && f.endsWith('.bak'))
        .map(f => ({
          name: f,
          timestamp: parseInt(f.substring(fileName.length + 1, f.length - 4), 10)
        }))
        .filter(b => !isNaN(b.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      if (backups.length === 0) {
        return res.status(404).json({ ok: false, error: 'No backup file found to revert.' });
      }

      const latestBackupPath = path.join(backupDir, backups[0].name);
      const backupContent = await fs.readFile(latestBackupPath, 'utf8');

      // Create a backup of the current file before reverting
      const currentContent = await fs.readFile(filePath, 'utf8');
      const currentBackupPath = `${filePath}.${Date.now()}.bak`;
      await fs.writeFile(currentBackupPath, currentContent, 'utf8');

      await fs.writeFile(filePath, backupContent, 'utf8');

      res.json({ ok: true });
    } catch (error) {
      console.error(`Error reverting file for ${clientId}/${file}:`, error);
      res.status(500).json({ ok: false, error: 'Failed to revert file.' });
    }
  });

  app.use('/api/v1/sites', router);
  return router;
}

export default createSiteBuilderEditorRoutes;