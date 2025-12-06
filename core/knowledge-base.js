/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    KNOWLEDGE BASE SYSTEM                                         ║
 * ║                    Store business ideas, context, historical records            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class KnowledgeBase {
  constructor(pool) {
    this.pool = pool;
    this.baseDir = path.join(__dirname, '..', 'knowledge');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      'business-ideas',
      'context',
      'historical',
      'security',
      'income-generation',
      'future-thoughts',
      'quantum-proof',
      'uploads',
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * Upload and categorize a file
   */
  async uploadFile(fileData, metadata = {}) {
    const {
      filename,
      content,
      category = 'context',
      tags = [],
      description = '',
      businessIdea = false,
      securityRelated = false,
      historical = false,
    } = metadata;

    // Generate unique ID
    const fileId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const sanitizedFilename = this.sanitizeFilename(filename || `upload_${Date.now()}`);

    // Determine storage location
    let storageDir = this.baseDir;
    if (businessIdea) storageDir = path.join(this.baseDir, 'business-ideas');
    else if (securityRelated) storageDir = path.join(this.baseDir, 'security');
    else if (historical) storageDir = path.join(this.baseDir, 'historical');
    else if (category === 'income-generation') storageDir = path.join(this.baseDir, 'income-generation');
    else if (category === 'future-thoughts') storageDir = path.join(this.baseDir, 'future-thoughts');
    else if (category === 'quantum-proof') storageDir = path.join(this.baseDir, 'quantum-proof');
    else storageDir = path.join(this.baseDir, 'context');

    const filePath = path.join(storageDir, `${fileId}_${sanitizedFilename}`);

    // Save file
    await fs.promises.writeFile(filePath, content, 'utf8');

    // Store metadata in database
    await this.pool.query(
      `INSERT INTO knowledge_base_files 
       (file_id, filename, file_path, category, tags, description, business_idea, 
        security_related, historical, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [fileId, sanitizedFilename, filePath, category, JSON.stringify(tags), 
       description, businessIdea, securityRelated, historical, timestamp]
    );

    // Extract and store key concepts for search
    await this.indexFile(fileId, content, metadata);

    return {
      fileId,
      filename: sanitizedFilename,
      category,
      path: filePath,
      uploadedAt: timestamp,
    };
  }

  /**
   * Search knowledge base
   */
  async search(query, options = {}) {
    const {
      category = null,
      tags = [],
      businessIdeasOnly = false,
      limit = 50,
    } = options;

    let sql = `
      SELECT kb.*, 
             ts_rank(kb.search_vector, plainto_tsquery('english', $1)) as rank
      FROM knowledge_base_files kb
      WHERE kb.search_vector @@ plainto_tsquery('english', $1)
    `;
    const params = [query];
    let paramIndex = 2;

    if (category) {
      sql += ` AND kb.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (businessIdeasOnly) {
      sql += ` AND kb.business_idea = true`;
    }

    if (tags.length > 0) {
      sql += ` AND kb.tags @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(tags));
      paramIndex++;
    }

    sql += ` ORDER BY rank DESC, kb.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get context for AI prompts
   */
  async getContextForPrompt(prompt, maxFiles = 10) {
    // Search for relevant files
    const relevant = await this.search(prompt, { limit: maxFiles });

    // Load file contents
    const context = [];
    for (const file of relevant) {
      try {
        const content = await fs.promises.readFile(file.file_path, 'utf8');
        context.push({
          source: file.filename,
          category: file.category,
          content: content.substring(0, 5000), // Limit per file
          tags: file.tags,
        });
      } catch (error) {
        console.warn(`Failed to load file ${file.file_path}: ${error.message}`);
      }
    }

    return context;
  }

  /**
   * Index file content for search
   */
  async indexFile(fileId, content, metadata) {
    // Extract key terms (simple approach - can be enhanced with NLP)
    const keywords = this.extractKeywords(content);
    const searchText = `${content} ${keywords.join(' ')} ${metadata.tags?.join(' ') || ''}`;

    await this.pool.query(
      `UPDATE knowledge_base_files 
       SET search_vector = to_tsvector('english', $1),
           keywords = $2,
           updated_at = NOW()
       WHERE file_id = $3`,
      [searchText, JSON.stringify(keywords), fileId]
    );
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    // Simple keyword extraction - can be enhanced
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 200);
  }

  /**
   * Get all business ideas
   */
  async getBusinessIdeas() {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_base_files 
       WHERE business_idea = true 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  /**
   * Get security-related documents
   */
  async getSecurityDocs() {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_base_files 
       WHERE security_related = true OR category = 'quantum-proof'
       ORDER BY created_at DESC`
    );
    return result.rows;
  }
}
