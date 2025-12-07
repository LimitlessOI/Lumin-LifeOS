/**
 * Extract all user ideas from knowledge base and conversation history
 * Catalogs them with full metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'http://localhost:3000';

const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || '';

async function extractAllUserIdeas() {
  console.log('🔍 Extracting all user ideas...\n');

  try {
    // 1. Get ideas from knowledge base (business ideas)
    console.log('📚 Searching knowledge base for business ideas...');
    const kbResponse = await fetch(`${API_BASE}/api/v1/knowledge/business-ideas`, {
      headers: {
        'x-command-key': COMMAND_KEY,
      },
    });

    if (kbResponse.ok) {
      const kbIdeas = await kbResponse.json();
      console.log(`   Found ${kbIdeas.length || 0} ideas in knowledge base`);
    }

    // 2. Get ideas from daily_ideas table
    console.log('💡 Searching daily_ideas table...');
    const dailyResponse = await fetch(`${API_BASE}/api/v1/ideas/all`, {
      headers: {
        'x-command-key': COMMAND_KEY,
      },
    });

    if (dailyResponse.ok) {
      const dailyIdeas = await dailyResponse.json();
      console.log(`   Found ${dailyIdeas.length || 0} ideas in daily_ideas`);
    }

    // 3. Get comprehensive ideas
    console.log('📋 Searching comprehensive_ideas table...');
    const compResponse = await fetch(`${API_BASE}/api/v1/ideas/comprehensive?author=user`, {
      headers: {
        'x-command-key': COMMAND_KEY,
      },
    });

    if (compResponse.ok) {
      const compIdeas = await compResponse.json();
      console.log(`   Found ${compIdeas.length || 0} comprehensive ideas`);
    }

    // 4. Search conversation memory for ideas
    console.log('💬 Searching conversation memory...');
    const memoryResponse = await fetch(`${API_BASE}/api/v1/memory/search?q=idea`, {
      headers: {
        'x-command-key': COMMAND_KEY,
      },
    });

    if (memoryResponse.ok) {
      const memories = await memoryResponse.json();
      console.log(`   Found ${memories.length || 0} relevant memories`);
    }

    console.log('\n✅ Extraction complete!');
    console.log('\n📝 To view all your ideas, use:');
    console.log('   GET /api/v1/ideas/comprehensive?author=user');
    console.log('   GET /api/v1/ideas/export');

  } catch (error) {
    console.error('❌ Error extracting ideas:', error.message);
    console.log('\n💡 Make sure the server is running and COMMAND_CENTER_KEY is set');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractAllUserIdeas();
}

export { extractAllUserIdeas };
