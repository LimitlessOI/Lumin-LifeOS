/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    COMPREHENSIVE IDEA TRACKER                                    ║
 * ║                    Tracks all ideas with complete metadata                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class ComprehensiveIdeaTracker {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Store an idea with complete metadata
   */
  async storeIdea({
    ideaText,
    originalAuthor = 'user', // 'user', 'chatgpt', 'gemini', 'deepseek', 'grok', 'system'
    contributors = [], // Array of {author, contribution, timestamp}
    priority = 'medium', // 'critical', 'high', 'medium', 'low'
    status = 'pending', // 'pending', 'accepted', 'rejected', 'implemented', 'in_progress'
    rejectionReason = null,
    acceptanceReason = null,
    impact = null, // 1-10
    revenuePotential = null, // estimated $ amount
    difficulty = null, // 'easy', 'medium', 'hard', 'very_hard'
    category = null, // 'feature', 'optimization', 'revenue', 'cost', 'user_experience', etc.
    tags = [],
    relatedIdeas = [], // Array of idea IDs
    implementationNotes = null,
    estimatedTime = null, // hours
    dependencies = [], // Array of idea IDs that must be done first
    createdAt = new Date(),
  }) {
    try {
      const ideaId = `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      await this.pool.query(
        `INSERT INTO comprehensive_ideas 
         (idea_id, idea_text, original_author, contributors, priority, status, 
          rejection_reason, acceptance_reason, impact, revenue_potential, difficulty,
          category, tags, related_ideas, implementation_notes, estimated_time,
          dependencies, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)`,
        [
          ideaId,
          ideaText,
          originalAuthor,
          JSON.stringify(contributors),
          priority,
          status,
          rejectionReason,
          acceptanceReason,
          impact,
          revenuePotential,
          difficulty,
          category,
          JSON.stringify(tags),
          JSON.stringify(relatedIdeas),
          implementationNotes,
          estimatedTime,
          JSON.stringify(dependencies),
          createdAt,
        ]
      );

      return ideaId;
    } catch (error) {
      console.error('Error storing idea:', error.message);
      throw error;
    }
  }

  /**
   * Add a contribution to an existing idea
   */
  async addContribution(ideaId, author, contribution) {
    try {
      // Get current idea
      const result = await this.pool.query(
        `SELECT contributors FROM comprehensive_ideas WHERE idea_id = $1`,
        [ideaId]
      );

      if (result.rows.length === 0) {
        throw new Error('Idea not found');
      }

      const currentContributors = result.rows[0].contributors || [];
      const newContribution = {
        author,
        contribution,
        timestamp: new Date().toISOString(),
      };

      const updatedContributors = [...currentContributors, newContribution];

      await this.pool.query(
        `UPDATE comprehensive_ideas 
         SET contributors = $1, updated_at = NOW()
         WHERE idea_id = $2`,
        [JSON.stringify(updatedContributors), ideaId]
      );

      return newContribution;
    } catch (error) {
      console.error('Error adding contribution:', error.message);
      throw error;
    }
  }

  /**
   * Update idea status
   */
  async updateStatus(ideaId, status, reason = null) {
    try {
      const updateFields = { status, updated_at: 'NOW()' };
      
      if (status === 'rejected' && reason) {
        updateFields.rejection_reason = reason;
      } else if (status === 'accepted' && reason) {
        updateFields.acceptance_reason = reason;
      }

      const setClause = Object.keys(updateFields)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      const values = Object.values(updateFields).map(v => v === 'NOW()' ? new Date() : v);
      values.push(ideaId);

      await this.pool.query(
        `UPDATE comprehensive_ideas 
         SET ${setClause}
         WHERE idea_id = $${values.length}`,
        values
      );

      return true;
    } catch (error) {
      console.error('Error updating status:', error.message);
      throw error;
    }
  }

  /**
   * Get all ideas with filters
   */
  async getIdeas({
    status = null,
    priority = null,
    author = null,
    category = null,
    tags = null,
    minImpact = null,
    minRevenue = null,
    limit = 100,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = {}) {
    try {
      let query = `SELECT * FROM comprehensive_ideas WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (priority) {
        paramCount++;
        query += ` AND priority = $${paramCount}`;
        params.push(priority);
      }

      if (author) {
        paramCount++;
        query += ` AND original_author = $${paramCount}`;
        params.push(author);
      }

      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (minImpact) {
        paramCount++;
        query += ` AND impact >= $${paramCount}`;
        params.push(minImpact);
      }

      if (minRevenue) {
        paramCount++;
        query += ` AND revenue_potential >= $${paramCount}`;
        params.push(minRevenue);
      }

      // Tags filter (JSONB contains)
      if (tags && Array.isArray(tags) && tags.length > 0) {
        paramCount++;
        query += ` AND tags @> $${paramCount}`;
        params.push(JSON.stringify(tags));
      }

      query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        contributors: typeof row.contributors === 'string' ? JSON.parse(row.contributors) : row.contributors,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
        relatedIdeas: typeof row.related_ideas === 'string' ? JSON.parse(row.related_ideas) : row.related_ideas,
        dependencies: typeof row.dependencies === 'string' ? JSON.parse(row.dependencies) : row.dependencies,
      }));
    } catch (error) {
      console.error('Error getting ideas:', error.message);
      return [];
    }
  }

  /**
   * Get idea statistics
   */
  async getStatistics() {
    try {
      const stats = await this.pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'implemented') as implemented,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(DISTINCT original_author) as unique_authors,
          AVG(impact) as avg_impact,
          SUM(revenue_potential) as total_revenue_potential,
          COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE priority = 'high') as high_count
        FROM comprehensive_ideas
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting statistics:', error.message);
      return null;
    }
  }

  /**
   * Search ideas by text
   */
  async searchIdeas(searchText) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM comprehensive_ideas 
         WHERE idea_text ILIKE $1 
            OR implementation_notes ILIKE $1
            OR category ILIKE $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [`%${searchText}%`]
      );

      return result.rows.map(row => ({
        ...row,
        contributors: typeof row.contributors === 'string' ? JSON.parse(row.contributors) : row.contributors,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      }));
    } catch (error) {
      console.error('Error searching ideas:', error.message);
      return [];
    }
  }

  /**
   * Get all user's ideas
   */
  async getUserIdeas(userIdentifier = 'user') {
    return await this.getIdeas({ author: userIdentifier });
  }

  /**
   * Export all ideas to JSON
   */
  async exportAllIdeas() {
    const ideas = await this.getIdeas({ limit: 10000 });
    return {
      exportDate: new Date().toISOString(),
      totalIdeas: ideas.length,
      ideas: ideas,
    };
  }
}
