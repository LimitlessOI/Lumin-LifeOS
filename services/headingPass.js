/**
 * SYNOPSIS: Processes large exports, appending to a stream subsection or extending a portfolio table.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import fs from 'fs/promises';
import path from 'path';

export async function runHeadingPass(deps, dir) {
  const { pool, logger } = deps;
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isFile() && path.extname(file.name) === '.js') {
      const filePath = path.join(dir, file.name);
      const stats = await fs.stat(filePath);

      if (stats.size > 500 * 1024) {
        await appendToStreamSubsection(deps, filePath, stats.size);
        await extendPortfolioTable(deps, filePath, stats.size);
      }
    }
  }
}

async function appendToStreamSubsection(deps, filePath, size) {
  const { logger } = deps;
  const content = `File: ${path.basename(filePath)}, Size: ${size} bytes\n`;
  const streamSubsectionPath = path.join(path.dirname(filePath), 'StreamSubsection.txt');

  try {
    await fs.appendFile(streamSubsectionPath, content);
    logger.info({ filePath, size }, 'Appended to StreamSubsection.');
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to append to StreamSubsection.');
    // Do not rethrow; continue processing other files
  }
}

async function extendPortfolioTable(deps, filePath, size) {
  const { pool, logger } = deps;
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);

  try {
    // Assuming 'lifeos_event_stream' can be used as a general stream/portfolio table for new entries
    // For simplicity, we'll store basic file info.
    // The 'text_content' can store the file name and size, and 'source' could be 'headingPass'.
    const { rows } = await pool.query(
      `INSERT INTO lifeos_event_stream (user_id, source, channel, text_content, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        'system', // A generic user_id for system-generated entries
        'headingPass',
        'StreamI/Portfolio',
        `New export: ${fileName}, Size: ${size} bytes`,
        'processed', // Status indicating it has been processed
        { filePath, size, fileExtension }
      ]
    );
    logger.info({ id: rows[0].id, filePath, size }, 'Extended Stream I/portfolio table.');
    return rows[0];
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to extend Stream I/portfolio table.');
    // Do not rethrow; continue processing other files
  }
}

export async function processHeading(deps, payload) {
  // This function is required by the specific export rules, but the core task
  // is handled by runHeadingPass and its helpers.
  // We can use this to perhaps retrieve a specific stream entry if needed.
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    if (!id) {
      logger.warn('processHeading called without an ID in payload.');
      return null;
    }
    const { rows } = await pool.query('SELECT * FROM lifeos_event_stream WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, id }, 'Error in processHeading');
    throw new Error('Failed in processHeading');
  }
}