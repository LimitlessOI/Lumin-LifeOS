/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    PROMOTION ENGINE                                                ║
 * ║                    Self-promotion: blog posts, social media, email                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class PromotionEngine {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.warn('⚠️ [PROMOTION] Already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ [PROMOTION] Engine started - will generate content and promote automatically');

    // Generate blog post daily
    setInterval(async () => {
      try {
        await this.generateBlogPost();
      } catch (error) {
        console.error('❌ [PROMOTION] Blog post generation error:', error.message);
      }
    }, 24 * 60 * 60 * 1000); // Daily

    // Post to social media every 6 hours
    setInterval(async () => {
      try {
        await this.postToSocialMedia();
      } catch (error) {
        console.error('❌ [PROMOTION] Social media error:', error.message);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // Send email campaigns weekly
    setInterval(async () => {
      try {
        await this.sendEmailCampaign();
      } catch (error) {
        console.error('❌ [PROMOTION] Email campaign error:', error.message);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly

    // Run immediately on start
    setTimeout(() => {
      this.generateBlogPost().catch(console.error);
      this.postToSocialMedia().catch(console.error);
    }, 60000); // After 1 minute
  }

  /**
   * Generate a blog post about API cost savings
   */
  async generateBlogPost() {
    console.log('📝 [PROMOTION] Generating blog post...');

    const topics = [
      'How to Cut AI API Costs by 90%',
      'The Hidden Costs of AI APIs and How to Avoid Them',
      'Local-First AI: Why Free Models Can Handle 90% of Your Requests',
      'Smart Model Routing: Save Thousands Without Sacrificing Quality',
      'Case Study: How We Reduced AI Costs from $10K to $1K Monthly',
      'The Pay-From-Savings Model: Only Pay When We Save You Money',
    ];

    const topic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `Write a compelling blog post about: "${topic}"

Requirements:
- 800-1200 words
- SEO-optimized with relevant keywords
- Include real examples and numbers
- Call-to-action at the end linking to our cost savings service
- Professional but accessible tone
- Include subheadings for readability

Focus on:
- The problem (high AI API costs)
- Our solution (intelligent routing, caching, local-first)
- Real savings examples
- How the pay-from-savings model works
- Why companies should switch

Return the blog post in markdown format with proper headings.`;

    try {
      const content = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 3000,
        temperature: 0.7,
      });

      // Save blog post
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `blog-${timestamp}.md`;
      const blogDir = 'public/blog';
      
      // Create directory if needed
      const fs = await import('fs/promises');
      await fs.mkdir(blogDir, { recursive: true });
      
      const fullPath = `${blogDir}/${filename}`;
      await fs.writeFile(fullPath, content, 'utf-8');

      // Store in database
      await this.pool.query(
        `INSERT INTO blog_posts (title, content, slug, status, published_at)
         VALUES ($1, $2, $3, 'published', NOW())
         ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
        [topic, content, filename.replace('.md', '')]
      );

      console.log(`✅ [PROMOTION] Blog post generated: ${filename}`);

      // Post to social media about the new blog post
      await this.postToSocialMedia(`New blog post: ${topic} - Read it here: /blog/${filename.replace('.md', '')}`);

      return { success: true, filename, topic };
    } catch (error) {
      console.error('❌ [PROMOTION] Blog generation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Post to social media (Twitter/X, LinkedIn)
   */
  async postToSocialMedia(customMessage = null) {
    console.log('📱 [PROMOTION] Posting to social media...');

    const messages = [
      'Save 90% on AI API costs with intelligent model routing. Pay only 20% of what you save. No upfront cost. →',
      'Spending $10K/month on OpenAI? We can cut that to $1K. You pay us 20% of savings. Net: $7,200/month saved. →',
      'Local-first AI architecture: Use free Ollama models for 90% of requests. Only pay for cloud APIs when needed. →',
      'The pay-from-savings model: We only make money when you save money. No risk, all reward. →',
      'Intelligent caching + smart routing = 90% cost reduction. See how it works →',
    ];

    const message = customMessage || messages[Math.floor(Math.random() * messages.length)];
    const url = 'https://robust-magic-production.up.railway.app/cost-savings';
    const fullMessage = `${message} ${url}`;

    // Store post in database
    await this.pool.query(
      `INSERT INTO social_media_posts (platform, message, url, status, scheduled_at)
       VALUES ('twitter', $1, $2, 'published', NOW()),
              ('linkedin', $1, $2, 'published', NOW())
       ON CONFLICT DO NOTHING`,
      [fullMessage, url]
    );

    console.log(`✅ [PROMOTION] Social media post created: ${fullMessage.substring(0, 50)}...`);

    // TODO: Actually post to Twitter/LinkedIn APIs when configured
    // For now, just log and store

    return { success: true, message: fullMessage };
  }

  /**
   * Send email campaign to potential customers
   */
  async sendEmailCampaign() {
    console.log('📧 [PROMOTION] Sending email campaign...');

    // Get potential customers (leads, signups, etc.)
    const leads = await this.pool.query(
      `SELECT email, company_name, monthly_spend, source
       FROM api_cost_savings_clients
       WHERE subscription_status = 'pending' OR subscription_status = 'active'
       ORDER BY created_at DESC
       LIMIT 100`
    );

    if (leads.rows.length === 0) {
      console.log('📭 [PROMOTION] No leads to email');
      return { success: true, sent: 0 };
    }

    const subject = 'How to Save 90% on Your AI API Costs';
    const emailContent = await this.generateEmailContent();

    let sent = 0;
    for (const lead of leads.rows) {
      try {
        // Personalize email
        const personalized = emailContent
          .replace('{{name}}', lead.company_name || 'there')
          .replace('{{current_spend}}', lead.monthly_spend ? `$${lead.monthly_spend.toLocaleString()}` : 'your current spend')
          .replace('{{estimated_savings}}', lead.monthly_spend ? `$${(lead.monthly_spend * 0.9).toLocaleString()}` : 'thousands');

        // Store email in database
        await this.pool.query(
          `INSERT INTO email_campaigns (recipient_email, subject, content, status, sent_at)
           VALUES ($1, $2, $3, 'sent', NOW())`,
          [lead.email, subject, personalized]
        );

        sent++;
        console.log(`  ✅ Sent to: ${lead.email}`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  ❌ Failed to send to ${lead.email}:`, error.message);
      }
    }

    console.log(`✅ [PROMOTION] Email campaign sent to ${sent} recipients`);

    // TODO: Actually send emails via SendGrid, Mailgun, etc. when configured

    return { success: true, sent };
  }

  /**
   * Generate email content
   */
  async generateEmailContent() {
    const prompt = `Write a compelling email about our API cost savings service.

Tone: Professional but friendly, helpful
Length: 200-300 words
Include:
- Subject line suggestion
- Personalization placeholders: {{name}}, {{current_spend}}, {{estimated_savings}}
- Clear value proposition
- How it works (brief)
- Call-to-action button
- No spammy language

Return as HTML email with inline styles.`;

    try {
      const content = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 1500,
        temperature: 0.7,
      });

      return content;
    } catch (error) {
      // Fallback template
      return `
        <h2>Save 90% on AI API Costs</h2>
        <p>Hi {{name}},</p>
        <p>You're currently spending {{current_spend}}/month on AI APIs. We can reduce that by 90%.</p>
        <p>Our intelligent routing system uses free local models for 90% of requests, and you only pay us 20% of what you save.</p>
        <p>Estimated savings: {{estimated_savings}}/month</p>
        <a href="https://robust-magic-production.up.railway.app/cost-savings">Learn More →</a>
      `;
    }
  }

  /**
   * Track what's working (analytics)
   */
  async trackConversion(event, data = {}) {
    try {
      await this.pool.query(
        `INSERT INTO promotion_analytics (event_type, event_data, created_at)
         VALUES ($1, $2, NOW())`,
        [event, JSON.stringify(data)]
      );
    } catch (error) {
      console.warn('⚠️ [PROMOTION] Analytics tracking failed:', error.message);
    }
  }

  /**
   * Get promotion stats
   */
  async getStats() {
    try {
      const stats = await this.pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as blog_posts,
          (SELECT COUNT(*) FROM social_media_posts WHERE status = 'published') as social_posts,
          (SELECT COUNT(*) FROM email_campaigns WHERE status = 'sent') as emails_sent,
          (SELECT COUNT(*) FROM api_cost_savings_clients) as signups,
          (SELECT COUNT(*) FROM api_cost_savings_clients WHERE source IS NOT NULL) as tracked_signups
      `);

      return stats.rows[0] || {};
    } catch (error) {
      console.error('❌ [PROMOTION] Stats error:', error.message);
      return {};
    }
  }
}
