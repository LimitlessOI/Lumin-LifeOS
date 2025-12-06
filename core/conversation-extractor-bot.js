/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    CONVERSATION EXTRACTOR BOT                                   ║
 * ║                    Extracts all conversations from AI platforms                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class ConversationExtractorBot {
  constructor(pool, knowledgeBase, callCouncilMember) {
    this.pool = pool;
    this.knowledgeBase = knowledgeBase;
    this.callCouncilMember = callCouncilMember;
    this.processedConversations = new Set();
  }

  /**
   * Extract conversations from ChatGPT
   * Uses browser automation to access conversation history
   */
  async extractChatGPT(credentials) {
    console.log('🤖 [EXTRACTOR] Extracting ChatGPT conversations...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Navigate to ChatGPT
      await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2' });
      
      // Login if needed
      if (credentials.email && credentials.password) {
        await this.loginChatGPT(page, credentials);
      }
      
      // Extract conversations
      const conversations = await this.extractChatGPTConversations(page);
      
      await browser.close();
      
      return {
        provider: 'chatgpt',
        conversations: conversations.length,
        extracted: conversations,
      };
    } catch (error) {
      await browser.close();
      console.error('ChatGPT extraction error:', error.message);
      return { provider: 'chatgpt', error: error.message };
    }
  }

  async loginChatGPT(page, credentials) {
    // Click login button
    await page.click('button:has-text("Log in")');
    await page.waitForTimeout(2000);
    
    // Enter email
    await page.type('input[type="email"]', credentials.email);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Enter password
    await page.type('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
  }

  async extractChatGPTConversations(page) {
    const conversations = [];
    
    // Wait for sidebar to load
    await page.waitForSelector('nav[aria-label*="Chat"]', { timeout: 10000 });
    
    // Get all conversation links
    const conversationLinks = await page.$$eval(
      'nav a[href*="/c/"]',
      links => links.map(link => ({
        href: link.href,
        title: link.textContent.trim(),
      }))
    );
    
    console.log(`Found ${conversationLinks.length} ChatGPT conversations`);
    
    // Extract each conversation
    for (let i = 0; i < Math.min(conversationLinks.length, 100); i++) {
      try {
        const link = conversationLinks[i];
        await page.goto(link.href, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // Extract messages
        const messages = await page.evaluate(() => {
          const messageElements = document.querySelectorAll('[data-message-author-role]');
          return Array.from(messageElements).map(el => ({
            role: el.getAttribute('data-message-author-role'),
            content: el.textContent.trim(),
          }));
        });
        
        conversations.push({
          id: link.href.split('/c/')[1]?.split('/')[0],
          title: link.title,
          messages,
          url: link.href,
        });
        
        console.log(`Extracted conversation ${i + 1}/${conversationLinks.length}`);
      } catch (error) {
        console.warn(`Failed to extract conversation ${i + 1}:`, error.message);
      }
    }
    
    return conversations;
  }

  /**
   * Extract from exported data (safer, recommended)
   */
  async extractFromExport(provider, exportData) {
    console.log(`🤖 [EXTRACTOR] Processing ${provider} export...`);

    const conversations = this.parseExport(provider, exportData);
    const extracted = [];

    for (const conv of conversations) {
      if (this.processedConversations.has(conv.id)) {
        continue; // Skip already processed
      }

      // Extract ideas and insights
      const ideas = await this.extractIdeasFromConversation(conv);
      
      extracted.push({
        conversationId: conv.id,
        provider,
        ideas: ideas.length,
        extractedIdeas: ideas,
      });

      this.processedConversations.add(conv.id);
    }

    // Store in knowledge base
    for (const item of extracted) {
      for (const idea of item.extractedIdeas) {
        await this.knowledgeBase.uploadFile(idea.content, {
          filename: `extracted_${provider}_${Date.now()}.txt`,
          category: 'business-ideas',
          tags: [idea.type, provider, 'extracted'],
          description: `Extracted from ${provider} conversation during system building`,
          businessIdea: idea.type === 'idea',
          historical: true,
        });
      }
    }

    return {
      provider,
      conversationsProcessed: conversations.length,
      ideasExtracted: extracted.reduce((sum, e) => sum + e.ideas, 0),
      uniqueIdeas: extracted.reduce((sum, e) => sum + e.extractedIdeas.length, 0),
    };
  }

  parseExport(provider, data) {
    // Use same parser as AIAccountBot
    const { AIAccountBot } = require('./ai-account-bot.js');
    const bot = new AIAccountBot(this.pool, this.knowledgeBase, this.callCouncilMember);
    return bot.parseExportedData(provider, data);
  }

  async extractIdeasFromConversation(conversation) {
    const ideas = [];
    
    // Combine all messages
    const fullText = conversation.messages
      ?.map(m => `${m.role}: ${m.content}`)
      .join('\n\n') || conversation.content || '';

    // Use AI to extract ideas
    const prompt = `Extract from this conversation (from building LifeOS system):
1. Business ideas mentioned
2. Technical decisions made
3. Insights or realizations
4. Unique approaches
5. Things that worked
6. Things that didn't work
7. Lessons learned

Conversation:
${fullText.substring(0, 8000)}

Return as JSON array:
[
  {
    "type": "idea|decision|insight|lesson",
    "content": "Detailed extraction",
    "impact": "high|medium|low",
    "category": "business|technical|strategy"
  }
]`;

    try {
      const response = await this.callCouncilMember('gemini', prompt);
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ideas.push(...JSON.parse(jsonMatch[0]));
      } else {
        // Fallback extraction
        ideas.push(...this.fallbackExtraction(fullText));
      }
    } catch (error) {
      console.warn('AI extraction failed, using fallback:', error.message);
      ideas.push(...this.fallbackExtraction(fullText));
    }

    return ideas;
  }

  fallbackExtraction(text) {
    const ideas = [];
    
    // Pattern matching for common idea patterns
    const patterns = [
      /(?:idea|concept|thought):\s*(.+?)(?:\.|$)/gi,
      /(?:we should|we could|let's)\s+(.+?)(?:\.|$)/gi,
      /(?:decision|decided):\s*(.+?)(?:\.|$)/gi,
      /(?:insight|realized|learned):\s*(.+?)(?:\.|$)/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        ideas.push({
          type: 'idea',
          content: match[1].trim(),
          impact: 'medium',
          category: 'general',
        });
      }
    });
    
    return ideas;
  }

  /**
   * Process all platforms
   */
  async extractAll(credentials) {
    const results = {};

    // ChatGPT
    if (credentials.chatgpt?.email) {
      results.chatgpt = await this.extractChatGPT(credentials.chatgpt);
    }

    // Others would use export method (safer)
    if (credentials.gemini?.export) {
      results.gemini = await this.extractFromExport('gemini', credentials.gemini.export);
    }

    if (credentials.claude?.export) {
      results.claude = await this.extractFromExport('claude', credentials.claude.export);
    }

    if (credentials.grok?.export) {
      results.grok = await this.extractFromExport('grok', credentials.grok.export);
    }

    if (credentials.deepseek?.export) {
      results.deepseek = await this.extractFromExport('deepseek', credentials.deepseek.export);
    }

    return results;
  }
}
