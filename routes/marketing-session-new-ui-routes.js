/**
 * SYNOPSIS: Exports registerMarketingSessionNewUIRoutes — routes/marketing-session-new-ui-routes.js.
 */
import fs from 'fs/promises';
import path from 'path';

export async function registerMarketingSessionNewUIRoutes(app, deps) {
  const overlayDir = path.resolve('public/overlay');

  async function serveFile(filePath, res) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      res.send(content);
    } catch (err) {
      res.status(500).send('Error loading page');
    }
  }

  app.get('/marketing/session/new', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    const filePath = path.join(overlayDir, 'marketing-session-new.html');
    return serveFile(filePath, res);
  });

  app.get('/marketing/session/:id/export', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    const filePath = path.join(overlayDir, 'marketing-session-export.html');
    return serveFile(filePath, res);
  });
}
