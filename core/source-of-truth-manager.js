/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SOURCE OF TRUTH MANAGER                                      ║
 * ║                    Stores and retrieves system mission, vision, ethics          ║
 * ║                    AI Council and Drones reference this as North Star           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class SourceOfTruthManager {
  constructor(pool) {
    this.pool = pool;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Store or update Source of Truth document
   */
  async storeDocument(documentType, title, content, section = null, version = '1.0', priority = 0) {
    try {
      // Check if exists
      const existing = await this.pool.query(
        `SELECT id FROM system_source_of_truth 
         WHERE document_type = $1 AND section = COALESCE($2, section) AND is_active = true
         ORDER BY version DESC LIMIT 1`,
        [documentType, section]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await this.pool.query(
          `UPDATE system_source_of_truth 
           SET content = $1, title = $2, version = $3, priority = $4, updated_at = NOW()
           WHERE id = $5`,
          [content, title, version, priority, existing.rows[0].id]
        );
        console.log(`✅ [SOURCE OF TRUTH] Updated ${documentType}${section ? ` / ${section}` : ''}`);
      } else {
        // Insert new
        await this.pool.query(
          `INSERT INTO system_source_of_truth (document_type, title, content, section, version, priority, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [documentType, title, content, section, version, priority]
        );
        console.log(`✅ [SOURCE OF TRUTH] Stored ${documentType}${section ? ` / ${section}` : ''}`);
      }

      // Clear cache
      this.cache.clear();
      return true;
    } catch (error) {
      console.error(`❌ [SOURCE OF TRUTH] Store failed:`, error.message);
      return false;
    }
  }

  /**
   * Get Source of Truth document(s)
   */
  async getDocument(documentType = null, section = null, includeInactive = false) {
    try {
      const cacheKey = `${documentType || 'all'}_${section || 'all'}_${includeInactive}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        return cached.data;
      }

      let query = `SELECT * FROM system_source_of_truth WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (documentType) {
        query += ` AND document_type = $${paramIndex++}`;
        params.push(documentType);
      }

      if (section !== null) {
        query += ` AND section = $${paramIndex++}`;
        params.push(section);
      }

      if (!includeInactive) {
        query += ` AND is_active = true`;
      }

      query += ` ORDER BY priority DESC, updated_at DESC`;

      const result = await this.pool.query(query, params);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: result.rows,
        timestamp: Date.now()
      });

      return result.rows;
    } catch (error) {
      console.error(`❌ [SOURCE OF TRUTH] Get failed:`, error.message);
      return [];
    }
  }

  /**
   * Get full Source of Truth (all active documents)
   */
  async getFullSourceOfTruth() {
    const documents = await this.getDocument(null, null, false);
    
    // Organize by document_type and section
    const organized = {
      mission: [],
      ethics: [],
      vision: [],
      products: [],
      implementation: [],
      other: []
    };

    for (const doc of documents) {
      const type = doc.document_type || 'other';
      if (organized[type]) {
        organized[type].push(doc);
      } else {
        organized.other.push(doc);
      }
    }

    return organized;
  }

  /**
   * Get Source of Truth as formatted text for AI prompts
   */
  async getFormattedForAI() {
    const docs = await this.getDocument(null, null, false);
    
    if (docs.length === 0) {
      return "No Source of Truth documents stored yet. System should reference core mission: Help individuals and businesses reduce overwhelm, build competence, and make money ethically.";
    }

    let formatted = `# SOURCE OF TRUTH - System Mission, Vision, Ethics\n\n`;
    
    // Group by document_type
    const byType = {};
    for (const doc of docs) {
      if (!byType[doc.document_type]) byType[doc.document_type] = [];
      byType[doc.document_type].push(doc);
    }

    for (const [type, typeDocs] of Object.entries(byType)) {
      formatted += `## ${type.toUpperCase()}\n\n`;
      for (const doc of typeDocs) {
        if (doc.section) {
          formatted += `### ${doc.section}\n\n`;
        }
        formatted += `${doc.content}\n\n`;
      }
    }

    return formatted;
  }

  /**
   * Check if AI/drone should reference Source of Truth
   */
  async shouldReferenceSourceOfTruth(taskType, context = {}) {
    // Always reference for:
    // - Mission-critical decisions
    // - Product development
    // - Revenue generation
    // - Ethical considerations
    const criticalTypes = [
      'product_development',
      'revenue_generation',
      'ethical_decision',
      'mission_alignment',
      'user_facing',
      'business_strategy'
    ];

    return criticalTypes.includes(taskType) || 
           context.requiresMissionAlignment === true ||
           context.ethicalConsideration === true;
  }

  /**
   * Get relevant Source of Truth sections for a specific task
   */
  async getRelevantSections(taskType, context = {}) {
    const allDocs = await this.getDocument(null, null, false);
    
    // Filter by relevance
    const relevant = [];
    
    for (const doc of allDocs) {
      // Always include mission, ethics, core beliefs
      if (['mission', 'ethics', 'core_beliefs', 'constitution'].includes(doc.document_type)) {
        relevant.push(doc);
        continue;
      }

      // Include products if task is product-related
      if (taskType.includes('product') && doc.document_type === 'products') {
        relevant.push(doc);
        continue;
      }

      // Include implementation if task is implementation
      if (taskType.includes('implementation') && doc.document_type === 'implementation') {
        relevant.push(doc);
      }
    }

    return relevant;
  }
}
