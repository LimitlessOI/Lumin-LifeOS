/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ENHANCED CONVERSATION SCRAPER                                    ║
 * ║                    Scrapes ALL conversations from AI platforms with login        ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import crypto from 'crypto';
import { autoInstaller } from './auto-installer.js';

// Encryption key (should be in env var)
const ENCRYPTION_KEY = process.env.CONVERSATION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class EnhancedConversationScraper {
  constructor(pool, knowledgeBase, callCouncilMember) {
    this.pool = pool;
    this.knowledgeBase = knowledgeBase;
    this.callCouncilMember = callCouncilMember;
    this.puppeteer = null;
    this.scrapingStatus = new Map(); // Track scraping progress
    this.autoInstaller = autoInstaller;
  }

  /**
   * Initialize Puppeteer for browser automation (auto-installs if needed)
   */
  async initPuppeteer() {
    if (this.puppeteer) return true;
    
    try {
      // Try to import Puppeteer
      const puppeteerModule = await import('puppeteer');
      this.puppeteer = puppeteerModule.default || puppeteerModule;
      console.log('✅ [SCRAPER] Puppeteer initialized');
      return true;
    } catch (error) {
      // Puppeteer not found - auto-install it
      console.log('📦 [SCRAPER] Puppeteer not found, auto-installing...');
      
      const installResult = await this.autoInstaller.requireOrInstall('puppeteer', {
        save: true,
        dev: false,
      });

      if (!installResult.success) {
        console.error('❌ [SCRAPER] Failed to auto-install Puppeteer:', installResult.error);
        return false;
      }

      // Try to import again after installation
      try {
        // Clear module cache and re-import
        const puppeteerModule = await import('puppeteer');
        this.puppeteer = puppeteerModule.default || puppeteerModule;
        console.log('✅ [SCRAPER] Puppeteer auto-installed and initialized');
        return true;
      } catch (importError) {
        console.error('❌ [SCRAPER] Puppeteer installed but import failed:', importError.message);
        console.warn('   You may need to restart the server for Puppeteer to work');
        return false;
      }
    }
  }

  /**
   * Store credentials securely (encrypted)
   */
  async storeCredentials(provider, credentials) {
    try {
      // Encrypt credentials
      const encrypted = this.encrypt(JSON.stringify(credentials));
      
      await this.pool.query(
        `INSERT INTO ai_platform_credentials 
         (provider, encrypted_credentials, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (provider) DO UPDATE SET 
           encrypted_credentials = $2, 
           updated_at = NOW()`,
        [provider, encrypted]
      );

      console.log(`✅ [SCRAPER] Stored credentials for ${provider}`);
      return true;
    } catch (error) {
      console.error(`❌ [SCRAPER] Error storing credentials:`, error.message);
      return false;
    }
  }

  /**
   * Get stored credentials (decrypted)
   */
  async getCredentials(provider) {
    try {
      const result = await this.pool.query(
        `SELECT encrypted_credentials FROM ai_platform_credentials WHERE provider = $1`,
        [provider]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const decrypted = this.decrypt(result.rows[0].encrypted_credentials);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`❌ [SCRAPER] Error getting credentials:`, error.message);
      return null;
    }
  }

  /**
   * Delete credentials
   */
  async deleteCredentials(provider) {
    try {
      await this.pool.query(
        `DELETE FROM ai_platform_credentials WHERE provider = $1`,
        [provider]
      );
      console.log(`✅ [SCRAPER] Deleted credentials for ${provider}`);
      return true;
    } catch (error) {
      console.error(`❌ [SCRAPER] Error deleting credentials:`, error.message);
      return false;
    }
  }

  /**
   * Encrypt data
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Scrape ALL conversations from a platform
   */
  async scrapeAllConversations(provider, options = {}) {
    const statusId = `scrape_${provider}_${Date.now()}`;
    this.scrapingStatus.set(statusId, {
      provider,
      status: 'starting',
      progress: 0,
      total: 0,
      extracted: 0,
      errors: [],
    });

    try {
      // Get credentials
      const credentials = await this.getCredentials(provider);
      if (!credentials) {
        throw new Error(`No credentials stored for ${provider}. Store them first.`);
      }

      // Initialize browser
      const hasPuppeteer = await this.initPuppeteer();
      if (!hasPuppeteer) {
        throw new Error('Puppeteer not installed. Cannot scrape with login.');
      }

      // Scrape based on provider
      let result;
      switch (provider) {
        case 'chatgpt':
          result = await this.scrapeChatGPT(credentials, statusId);
          break;
        case 'gemini':
          result = await this.scrapeGemini(credentials, statusId);
          break;
        case 'claude':
          result = await this.scrapeClaude(credentials, statusId);
          break;
        case 'grok':
          result = await this.scrapeGrok(credentials, statusId);
          break;
        case 'deepseek':
          result = await this.scrapeDeepSeek(credentials, statusId);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Update status
      const status = this.scrapingStatus.get(statusId);
      status.status = 'completed';
      status.progress = 100;
      status.extracted = result.conversations?.length || 0;

      // Extract ideas from conversations
      if (result.conversations && result.conversations.length > 0) {
        await this.extractAndStoreIdeas(provider, result.conversations);
      }

      return {
        statusId,
        provider,
        success: true,
        conversations: result.conversations?.length || 0,
        ideasExtracted: status.ideasExtracted || 0,
      };
    } catch (error) {
      const status = this.scrapingStatus.get(statusId);
      status.status = 'failed';
      status.error = error.message;
      
      console.error(`❌ [SCRAPER] Error scraping ${provider}:`, error.message);
      return {
        statusId,
        provider,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scrape ChatGPT conversations
   */
  async scrapeChatGPT(credentials, statusId) {
    console.log('🤖 [SCRAPER] Scraping ChatGPT...');
    const status = this.scrapingStatus.get(statusId);
    status.status = 'scraping';

    const browser = await this.puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to ChatGPT
      await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Login
      status.progress = 10;
      await this.loginChatGPT(page, credentials);
      status.progress = 30;

      // Wait for dashboard
      await page.waitForSelector('nav[aria-label*="Chat"], nav[aria-label*="History"]', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Extract all conversations
      status.progress = 40;
      const conversations = await this.extractAllChatGPTConversations(page, statusId);
      status.progress = 90;

      await browser.close();
      
      return { conversations };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Login to ChatGPT
   */
  async loginChatGPT(page, credentials) {
    try {
      // Check if already logged in
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('nav[aria-label*="Chat"]') !== null;
      });

      if (isLoggedIn) {
        console.log('✅ [SCRAPER] Already logged in to ChatGPT');
        return;
      }

      // Click login button
      const loginButton = await page.$('button:has-text("Log in"), a[href*="/login"]');
      if (loginButton) {
        await loginButton.click();
        await page.waitForTimeout(2000);
      }

      // Enter email
      const emailInput = await page.$('input[type="email"], input[name="email"], input[id*="email"]');
      if (emailInput) {
        await emailInput.type(credentials.email, { delay: 100 });
        await page.waitForTimeout(1000);
        
        // Click continue/submit
        const continueButton = await page.$('button[type="submit"], button:has-text("Continue"), button:has-text("Next")');
        if (continueButton) {
          await continueButton.click();
          await page.waitForTimeout(2000);
        }
      }

      // Enter password
      const passwordInput = await page.$('input[type="password"], input[name="password"]');
      if (passwordInput) {
        await passwordInput.type(credentials.password, { delay: 100 });
        await page.waitForTimeout(1000);
        
        // Click login/submit
        const loginSubmitButton = await page.$('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
        if (loginSubmitButton) {
          await loginSubmitButton.click();
          await page.waitForTimeout(5000);
        }
      }

      // Wait for login to complete
      await page.waitForSelector('nav[aria-label*="Chat"], nav[aria-label*="History"]', { timeout: 20000 });
      console.log('✅ [SCRAPER] Logged in to ChatGPT');
    } catch (error) {
      console.error('❌ [SCRAPER] Login error:', error.message);
      throw new Error(`ChatGPT login failed: ${error.message}`);
    }
  }

  /**
   * Extract ALL ChatGPT conversations
   */
  async extractAllChatGPTConversations(page, statusId) {
    const conversations = [];
    const status = this.scrapingStatus.get(statusId);
    
    try {
      // Scroll to load all conversations (use page.evaluate with async function)
      await page.evaluate(async () => {
        const sidebar = document.querySelector('nav[aria-label*="Chat"], nav[aria-label*="History"]');
        if (sidebar) {
          let lastHeight = sidebar.scrollHeight;
          while (true) {
            sidebar.scrollTop = sidebar.scrollHeight;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const newHeight = sidebar.scrollHeight;
            if (newHeight === lastHeight) break;
            lastHeight = newHeight;
          }
        }
      });

      // Get all conversation links
      const conversationLinks = await page.$$eval(
        'nav a[href*="/c/"], nav a[href*="/chat/"]',
        links => links.map(link => ({
          href: link.href,
          title: link.textContent.trim() || link.getAttribute('title') || 'Untitled',
        }))
      );

      status.total = conversationLinks.length;
      console.log(`📊 [SCRAPER] Found ${conversationLinks.length} ChatGPT conversations`);

      // Extract each conversation
      for (let i = 0; i < conversationLinks.length; i++) {
        try {
          const link = conversationLinks[i];
          status.progress = 40 + Math.floor((i / conversationLinks.length) * 50);
          status.current = i + 1;

          // Navigate to conversation
          await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 30000 });
          await page.waitForTimeout(2000);

          // Extract messages
          const messages = await page.evaluate(() => {
            const messageElements = document.querySelectorAll(
              '[data-message-author-role], [class*="message"], [class*="Message"]'
            );
            
            const extracted = [];
            messageElements.forEach(el => {
              const role = el.getAttribute('data-message-author-role') || 
                          (el.textContent.includes('You:') ? 'user' : 'assistant');
              const content = el.textContent.trim();
              
              if (content && content.length > 10) {
                extracted.push({ role, content });
              }
            });
            
            return extracted;
          });

          if (messages.length > 0) {
            conversations.push({
              id: link.href.split('/c/')[1]?.split('/')[0] || `conv_${i}`,
              title: link.title,
              messages,
              url: link.href,
              provider: 'chatgpt',
              scrapedAt: new Date().toISOString(),
            });

            status.extracted++;
          }

          // Small delay between conversations
          await page.waitForTimeout(1000);
        } catch (error) {
          console.warn(`⚠️ [SCRAPER] Failed to extract conversation ${i + 1}:`, error.message);
          status.errors.push(`Conversation ${i + 1}: ${error.message}`);
        }
      }

      console.log(`✅ [SCRAPER] Extracted ${conversations.length} ChatGPT conversations`);
      return conversations;
    } catch (error) {
      console.error('❌ [SCRAPER] Error extracting conversations:', error.message);
      throw error;
    }
  }

  /**
   * Scrape Gemini conversations
   */
  async scrapeGemini(credentials, statusId) {
    // Gemini uses Google account - similar approach
    console.log('🤖 [SCRAPER] Scraping Gemini...');
    // Implementation similar to ChatGPT but for Google/Gemini
    // Would navigate to gemini.google.com and extract
    throw new Error('Gemini scraping not yet implemented - use export method');
  }

  /**
   * Scrape Claude conversations
   */
  async scrapeClaude(credentials, statusId) {
    // Claude uses Anthropic account
    console.log('🤖 [SCRAPER] Scraping Claude...');
    throw new Error('Claude scraping not yet implemented - use export method');
  }

  /**
   * Scrape Grok conversations
   */
  async scrapeGrok(credentials, statusId) {
    // Grok uses X/Twitter account
    console.log('🤖 [SCRAPER] Scraping Grok...');
    throw new Error('Grok scraping not yet implemented - use export method');
  }

  /**
   * Scrape DeepSeek conversations
   */
  async scrapeDeepSeek(credentials, statusId) {
    // DeepSeek account
    console.log('🤖 [SCRAPER] Scraping DeepSeek...');
    throw new Error('DeepSeek scraping not yet implemented - use export method');
  }

  /**
   * Extract ideas from conversations and store
   */
  async extractAndStoreIdeas(provider, conversations) {
    console.log(`💡 [SCRAPER] Extracting ideas from ${conversations.length} conversations...`);
    
    let totalIdeas = 0;
    
    for (const conv of conversations) {
      try {
        // Combine all messages
        const fullText = conv.messages
          ?.map(m => `${m.role}: ${m.content}`)
          .join('\n\n') || conv.content || '';

        // Extract ideas using AI
        const ideas = await this.extractIdeas(fullText, provider, conv.id);
        
        // Store in knowledge base
        for (const idea of ideas) {
          await this.knowledgeBase.uploadFile(idea.content, {
            filename: `extracted_${provider}_${conv.id}_${Date.now()}.txt`,
            category: 'business-ideas',
            tags: [idea.type, provider, 'scraped', 'conversation'],
            description: `Extracted from ${provider} conversation: ${conv.title || conv.id}`,
            businessIdea: idea.type === 'idea',
            historical: true,
          });
          
          totalIdeas++;
        }
      } catch (error) {
        console.warn(`⚠️ [SCRAPER] Error extracting ideas from conversation:`, error.message);
      }
    }

    console.log(`✅ [SCRAPER] Extracted ${totalIdeas} ideas from ${conversations.length} conversations`);
    return totalIdeas;
  }

  /**
   * Extract ideas from conversation text
   */
  async extractIdeas(text, provider, conversationId) {
    const prompt = `Extract from this conversation (from building LifeOS system):
1. Business ideas mentioned
2. Technical decisions made
3. Insights or realizations
4. Unique approaches
5. Things that worked
6. Things that didn't work
7. Lessons learned
8. Revenue ideas
9. Product ideas
10. Strategic decisions

Conversation:
${text.substring(0, 8000)}

Return as JSON array:
[
  {
    "type": "idea|decision|insight|lesson|revenue|product",
    "content": "Detailed extraction",
    "impact": "high|medium|low",
    "category": "business|technical|strategy|revenue"
  }
]`;

    try {
      const response = await this.callCouncilMember('gemini', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.warn('AI extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Get scraping status
   */
  getStatus(statusId) {
    return this.scrapingStatus.get(statusId) || null;
  }

  /**
   * List all stored credentials (without revealing them)
   */
  async listStoredCredentials() {
    try {
      const result = await this.pool.query(
        `SELECT provider, created_at, updated_at FROM ai_platform_credentials ORDER BY provider`
      );
      return result.rows.map(row => ({
        provider: row.provider,
        stored: true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      return [];
    }
  }
}
