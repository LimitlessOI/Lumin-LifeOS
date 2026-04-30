// services/site-builder.js

const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * Strip markdown code fences from generated HTML
 * Handles both ```html and ``` variants, with or without language tag
 */
function stripMarkdownFences(content) {
  let cleaned = content;
  
  // Strip leading fence: ```html\n or ```\n at start
  cleaned = cleaned.replace(/^```(?:html)?\s*\n/, '');
  
  // Strip trailing fence: \n``` at end
  cleaned = cleaned.replace(/\n```\s*$/, '');
  
  return cleaned.trim();
}

class SiteBuilder {
  constructor(pool, callAI) {
    this.pool = pool;
    this.callAI = callAI;
  }

  // ... existing methods ...

  async generateSiteHtml(userId, siteId, prompt) {
    try {
      const site = await this.getSite(userId, siteId);
      if (!site) {
        throw new Error('Site not found');
      }

      const systemPrompt = `You are a web designer. Generate a complete, modern, responsive single-page HTML site based on the user's request.
Include inline CSS and JavaScript. Make it beautiful and functional.
End your response with BUILD_COMPLETE on its own line.`;

      const response = await this.callAI({
        model: 'gemini_flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      });

      // Strip BUILD_COMPLETE marker
      let clean = response.replace(/BUILD_COMPLETE[\s\S]*$/, "").trim();
      
      // Strip markdown fences
      clean = stripMarkdownFences(clean);

      // Save to database
      await this.pool.query(
        `UPDATE sites SET html = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [clean, siteId, userId]
      );

      logger.info(`Generated HTML for site ${siteId}`, { userId, length: clean.length });

      return { html: clean, siteId };
    } catch (error) {
      logger.error('Error generating site HTML', { error, userId, siteId });
      throw error;
    }
  }

  async generateBlogPosts(userId, siteId, topics) {
    try {
      const site = await this.getSite(userId, siteId);
      if (!site) {
        throw new Error('Site not found');
      }

      const posts = [];

      for (const topic of topics) {
        const systemPrompt = `You are a blog post writer. Generate a complete HTML blog post about: ${topic}
Include proper HTML structure with article tags, headings, paragraphs, and styling.
Make it engaging and well-formatted.
End your response with BUILD_COMPLETE on its own line.`;

        const response = await this.callAI({
          model: 'gemini_flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Write a blog post about: ${topic}` }
          ],
          temperature: 0.8,
        });

        // Strip BUILD_COMPLETE marker
        let clean = response.replace(/BUILD_COMPLETE[\s\S]*$/, "").trim();
        
        // Strip markdown fences
        clean = stripMarkdownFences(clean);

        // Save post to database
        const result = await this.pool.query(
          `INSERT INTO blog_posts (site_id, user_id, title, html, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [siteId, userId, topic, clean]
        );

        posts.push({
          id: result.rows[0].id,
          title: topic,
          html: clean
        });

        logger.info(`Generated blog post for site ${siteId}`, { userId, topic, postId: result.rows[0].id });
      }

      return posts;
    } catch (error) {
      logger.error('Error generating blog posts', { error, userId, siteId });
      throw error;
    }
  }

  // ... rest of existing methods ...
}

module.exports = { createSiteBuilder: (pool, callAI) => new SiteBuilder(pool, callAI) };