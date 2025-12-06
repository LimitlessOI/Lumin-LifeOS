/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AI ACCOUNT BOT - Extract Ideas from AI Conversations         ║
 * ║                    Reads ChatGPT, Gemini, Claude, Grok, DeepSeek accounts      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { Pool } from 'pg';
import puppeteer from 'puppeteer';

export class AIAccountBot {
  constructor(pool, knowledgeBase, callCouncilMember) {
    this.pool = pool;
    this.knowledgeBase = knowledgeBase;
    this.callCouncilMember = callCouncilMember;
    this.processedConversations = new Set();
    this.extractedIdeas = new Map();
  }

  /**
   * Process ChatGPT account
   * Note: ChatGPT doesn't have a public API for reading conversations
   * We'll need to use browser automation or export feature
   */
  async processChatGPT(credentials) {
    // Option 1: Browser automation (requires credentials)
    // Option 2: Export feature (user exports data)
    // Option 3: API access (if available)
    
    console.log('🤖 [AI BOT] Processing ChatGPT account...');
    
    // For now, we'll use export feature approach
    // User exports their ChatGPT data, we process it
    return {
      provider: 'chatgpt',
      conversations: [],
      ideas: [],
      note: 'ChatGPT requires data export or browser automation',
    };
  }

  /**
   * Process Gemini account
   */
  async processGemini(credentials) {
    try {
      // Gemini has API access - we can use it to get conversation history
      // But we need to check if they have a conversations API
      
      console.log('🤖 [AI BOT] Processing Gemini account...');
      
      // For now, we'll need user to export or use browser automation
      return {
        provider: 'gemini',
        conversations: [],
        ideas: [],
        note: 'Gemini requires data export or API access',
      };
    } catch (error) {
      console.error('Gemini processing error:', error.message);
      return { provider: 'gemini', error: error.message };
    }
  }

  /**
   * Process Claude account (via Anthropic API)
   */
  async processClaude(apiKey) {
    try {
      // Anthropic API might have conversation history endpoint
      console.log('🤖 [AI BOT] Processing Claude account...');
      
      // Check for conversation history API
      // For now, we'll need export or browser automation
      return {
        provider: 'claude',
        conversations: [],
        ideas: [],
        note: 'Claude requires data export or API access',
      };
    } catch (error) {
      console.error('Claude processing error:', error.message);
      return { provider: 'claude', error: error.message };
    }
  }

  /**
   * Process exported conversation data
   * User can export from each platform and upload
   */
  async processExportedData(provider, data) {
    try {
      console.log(`🤖 [AI BOT] Processing exported ${provider} data...`);
      
      const conversations = this.parseExportedData(provider, data);
      const ideas = [];
      
      for (const conv of conversations) {
        const extracted = await this.extractIdeasFromConversation(conv);
        ideas.push(...extracted);
      }
      
      // Deduplicate ideas
      const uniqueIdeas = this.deduplicateIdeas(ideas);
      
      // Store in knowledge base
      for (const idea of uniqueIdeas) {
        await this.storeIdea(idea, provider);
      }
      
      return {
        provider,
        conversationsProcessed: conversations.length,
        ideasExtracted: ideas.length,
        uniqueIdeas: uniqueIdeas.length,
      };
    } catch (error) {
      console.error(`Error processing ${provider} data:`, error.message);
      return { provider, error: error.message };
    }
  }

  /**
   * Parse exported data based on provider format
   */
  parseExportedData(provider, data) {
    // Handle different export formats
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Not JSON, treat as text
        return this.parseTextConversations(data);
      }
    }
    
    switch (provider) {
      case 'chatgpt':
        return this.parseChatGPTExport(data);
      case 'gemini':
        return this.parseGeminiExport(data);
      case 'claude':
        return this.parseClaudeExport(data);
      case 'grok':
        return this.parseGrokExport(data);
      case 'deepseek':
        return this.parseDeepSeekExport(data);
      default:
        return this.parseGenericExport(data);
    }
  }

  parseChatGPTExport(data) {
    // ChatGPT export format
    const conversations = [];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.mapping) {
          // New ChatGPT format
          Object.values(item.mapping).forEach(node => {
            if (node.message) {
              conversations.push({
                id: node.id,
                role: node.message.author?.role || 'user',
                content: node.message.content?.parts?.[0] || node.message.content || '',
                timestamp: node.message.create_time,
              });
            }
          });
        } else if (item.conversations) {
          // Alternative format
          conversations.push(...item.conversations);
        }
      });
    }
    
    return conversations;
  }

  parseGeminiExport(data) {
    // Gemini export format
    const conversations = [];
    
    if (data.conversations) {
      data.conversations.forEach(conv => {
        conversations.push({
          id: conv.id,
          role: 'user',
          content: conv.prompt || conv.input || '',
          timestamp: conv.timestamp,
        });
        conversations.push({
          id: conv.id + '_response',
          role: 'assistant',
          content: conv.response || conv.output || '',
          timestamp: conv.timestamp,
        });
      });
    }
    
    return conversations;
  }

  parseClaudeExport(data) {
    // Claude export format
    const conversations = [];
    
    if (data.conversations) {
      data.conversations.forEach(conv => {
        conv.messages?.forEach(msg => {
          conversations.push({
            id: conv.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          });
        });
      });
    }
    
    return conversations;
  }

  parseGrokExport(data) {
    // Grok export format (similar to Twitter/X)
    return this.parseGenericExport(data);
  }

  parseDeepSeekExport(data) {
    // DeepSeek export format
    return this.parseGenericExport(data);
  }

  parseGenericExport(data) {
    // Generic parser for unknown formats
    const conversations = [];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.message || item.content || item.text) {
          conversations.push({
            id: item.id || Date.now(),
            role: item.role || 'user',
            content: item.message || item.content || item.text,
            timestamp: item.timestamp || item.created_at,
          });
        }
      });
    } else if (data.messages) {
      conversations.push(...data.messages);
    }
    
    return conversations;
  }

  parseTextConversations(text) {
    // Parse plain text conversations
    const conversations = [];
    const lines = text.split('\n');
    let currentConv = null;
    
    for (const line of lines) {
      if (line.match(/^(User|You|Human):/i)) {
        if (currentConv) conversations.push(currentConv);
        currentConv = {
          role: 'user',
          content: line.replace(/^(User|You|Human):\s*/i, ''),
        };
      } else if (line.match(/^(AI|Assistant|ChatGPT|Gemini|Claude|Grok|DeepSeek):/i)) {
        if (currentConv) {
          conversations.push(currentConv);
          conversations.push({
            role: 'assistant',
            content: line.replace(/^(AI|Assistant|ChatGPT|Gemini|Claude|Grok|DeepSeek):\s*/i, ''),
          });
          currentConv = null;
        }
      } else if (currentConv) {
        currentConv.content += '\n' + line;
      }
    }
    
    if (currentConv) conversations.push(currentConv);
    return conversations;
  }

  /**
   * Extract ideas from a conversation
   */
  async extractIdeasFromConversation(conversation) {
    try {
      // Use AI to extract ideas, decisions, insights
      const prompt = `Extract from this conversation:
1. Business ideas mentioned
2. Decisions made
3. Insights or "aha" moments
4. Unique perspectives
5. Action items

Conversation:
${conversation.content}

Return as JSON array: [{"type": "idea|decision|insight", "content": "...", "impact": "high|medium|low"}]`;

      const response = await this.callCouncilMember('gemini', prompt);
      
      // Parse JSON from response
      let ideas = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          ideas = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Fallback: extract ideas manually
        ideas = this.extractIdeasManually(conversation.content);
      }
      
      return ideas.map(idea => ({
        ...idea,
        source: conversation.id,
        provider: conversation.provider,
        timestamp: conversation.timestamp,
      }));
    } catch (error) {
      console.error('Error extracting ideas:', error.message);
      return [];
    }
  }

  extractIdeasManually(text) {
    // Simple pattern matching for ideas
    const ideas = [];
    const ideaPatterns = [
      /(?:idea|concept|thought|insight):\s*(.+?)(?:\.|$)/gi,
      /(?:what if|imagine|suppose)\s+(.+?)(?:\.|$)/gi,
      /(?:we could|we should|let's)\s+(.+?)(?:\.|$)/gi,
    ];
    
    ideaPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        ideas.push({
          type: 'idea',
          content: match[1].trim(),
          impact: 'medium',
        });
      }
    });
    
    return ideas;
  }

  /**
   * Deduplicate ideas - find unique ones
   */
  deduplicateIdeas(ideas) {
    const seen = new Map();
    const unique = [];
    
    for (const idea of ideas) {
      // Create a hash of the idea content
      const hash = this.hashIdea(idea.content);
      
      if (!seen.has(hash)) {
        seen.set(hash, idea);
        unique.push(idea);
      } else {
        // Merge with existing idea if it has additional details
        const existing = seen.get(hash);
        if (idea.content.length > existing.content.length) {
          // Replace with more detailed version
          const index = unique.indexOf(existing);
          unique[index] = idea;
          seen.set(hash, idea);
        }
      }
    }
    
    return unique;
  }

  hashIdea(content) {
    // Simple hash for deduplication
    const normalized = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // First 100 chars for comparison
    
    return normalized;
  }

  /**
   * Store idea in knowledge base
   */
  async storeIdea(idea, provider) {
    try {
      await this.knowledgeBase.uploadFile(idea.content, {
        filename: `idea_${Date.now()}_${provider}.txt`,
        category: 'business-ideas',
        tags: [idea.type, provider, idea.impact || 'medium'],
        description: `Extracted from ${provider} conversation`,
        businessIdea: true,
        historical: false,
      });
    } catch (error) {
      console.error('Error storing idea:', error.message);
    }
  }

  /**
   * Process all AI accounts
   */
  async processAllAccounts(credentials) {
    const results = {};
    
    if (credentials.chatgpt) {
      results.chatgpt = await this.processChatGPT(credentials.chatgpt);
    }
    
    if (credentials.gemini) {
      results.gemini = await this.processGemini(credentials.gemini);
    }
    
    if (credentials.claude) {
      results.claude = await this.processClaude(credentials.claude);
    }
    
    if (credentials.grok) {
      results.grok = await this.processGrok(credentials.grok);
    }
    
    if (credentials.deepseek) {
      results.deepseek = await this.processDeepSeek(credentials.deepseek);
    }
    
    return results;
  }
}
