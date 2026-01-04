/**
 * MEMORY SYSTEM - Anti-Hallucination Edition
 * 
 * Rules:
 * 1. All memories must have a source (conversation_id, timestamp, user confirmation)
 * 2. Memories are validated before storage
 * 3. Memories have confidence scores
 * 4. Memories can be marked as "user confirmed" vs "inferred"
 * 5. Retrieval includes confidence and source
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(process.cwd(), 'data', 'memories.json');

// Memory types
const MEMORY_TYPES = {
  USER_STATED: 'user_stated',      // User explicitly said this
  USER_CONFIRMED: 'user_confirmed', // AI inferred, user confirmed
  AI_INFERRED: 'ai_inferred',       // AI inferred, not confirmed (LOW confidence)
  SYSTEM_FACT: 'system_fact'        // System-generated fact (file exists, etc)
};

// Initialize memory store
async function initMemoryStore() {
  try {
    await fs.access(MEMORY_FILE);
    console.log('✅ [MEMORY] Memory store exists');
  } catch {
    const dataDir = path.dirname(MEMORY_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(MEMORY_FILE, JSON.stringify({
      user_profile: [],
      goals: [],
      preferences: [],
      facts: [],
      conversation_history: []
    }, null, 2));
    console.log('✅ [MEMORY] Memory store initialized');
  }
}

// Store a memory with validation
async function storeMemory(category, content, options = {}) {
  const memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    content,
    type: options.type || MEMORY_TYPES.AI_INFERRED,
    confidence: options.confidence || 0.5,
    source: {
      conversation_id: options.conversationId || null,
      timestamp: new Date().toISOString(),
      user_confirmed: options.userConfirmed || false
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Validation: Don't store low-confidence inferences without confirmation
  if (memory.type === MEMORY_TYPES.AI_INFERRED && memory.confidence < 0.7) {
    console.log(`⚠️ [MEMORY] Skipping low-confidence inference: ${JSON.stringify(content).substring(0, 100)}`);
    return null;
  }
  
  const store = await loadMemoryStore();
  
  // Check for duplicates
  const existingIndex = store[category]?.findIndex(m => 
    m.content === content || 
    (typeof content === 'object' && JSON.stringify(m.content) === JSON.stringify(content))
  );
  
  if (existingIndex >= 0) {
    // Update existing memory
    store[category][existingIndex] = {
      ...store[category][existingIndex],
      ...memory,
      updated_at: new Date().toISOString()
    };
    console.log(`🔄 [MEMORY] Updated: ${category} - ${JSON.stringify(content).substring(0, 50)}`);
  } else {
    // Add new memory
    if (!store[category]) store[category] = [];
    store[category].push(memory);
    console.log(`💾 [MEMORY] Stored: ${category} - ${JSON.stringify(content).substring(0, 50)}`);
  }
  
  await saveMemoryStore(store);
  return memory;
}

// Retrieve memories with confidence filtering
async function retrieveMemories(category, options = {}) {
  const store = await loadMemoryStore();
  let memories = store[category] || [];
  
  // Filter by minimum confidence
  const minConfidence = options.minConfidence || 0.5;
  memories = memories.filter(m => m.confidence >= minConfidence);
  
  // Filter by type if specified
  if (options.type) {
    memories = memories.filter(m => m.type === options.type);
  }
  
  // Sort by confidence (highest first)
  memories.sort((a, b) => b.confidence - a.confidence);
  
  // Limit results
  if (options.limit) {
    memories = memories.slice(0, options.limit);
  }
  
  return memories;
}

// Confirm an inferred memory (upgrades confidence)
async function confirmMemory(memoryId) {
  const store = await loadMemoryStore();
  
  for (const category of Object.keys(store)) {
    if (!Array.isArray(store[category])) continue;
    
    const memory = store[category].find(m => m.id === memoryId);
    if (memory) {
      memory.type = MEMORY_TYPES.USER_CONFIRMED;
      memory.confidence = 1.0;
      memory.source.user_confirmed = true;
      memory.updated_at = new Date().toISOString();
      await saveMemoryStore(store);
      console.log(`✅ [MEMORY] Confirmed: ${memoryId}`);
      return memory;
    }
  }
  
  return null;
}

// Delete a memory (user says it's wrong)
async function deleteMemory(memoryId) {
  const store = await loadMemoryStore();
  
  for (const category of Object.keys(store)) {
    if (!Array.isArray(store[category])) continue;
    
    const index = store[category].findIndex(m => m.id === memoryId);
    if (index >= 0) {
      const deleted = store[category].splice(index, 1)[0];
      await saveMemoryStore(store);
      console.log(`🗑️ [MEMORY] Deleted: ${memoryId}`);
      return deleted;
    }
  }
  
  return null;
}

// Build context for AI prompt (only high-confidence memories)
async function buildContextForPrompt() {
  const context = {
    user_profile: await retrieveMemories('user_profile', { minConfidence: 0.8 }),
    goals: await retrieveMemories('goals', { minConfidence: 0.8 }),
    preferences: await retrieveMemories('preferences', { minConfidence: 0.7 }),
    recent_facts: await retrieveMemories('facts', { minConfidence: 0.9, limit: 10 })
  };
  
  // Format for prompt
  let promptContext = '## User Context (Verified Memories)\n\n';
  
  if (context.user_profile.length > 0) {
    promptContext += '### Profile\n';
    context.user_profile.forEach(m => {
      promptContext += `- ${JSON.stringify(m.content)} [confidence: ${m.confidence}]\n`;
    });
  }
  
  if (context.goals.length > 0) {
    promptContext += '\n### Goals\n';
    context.goals.forEach(m => {
      promptContext += `- ${JSON.stringify(m.content)} [${m.type}]\n`;
    });
  }
  
  if (context.preferences.length > 0) {
    promptContext += '\n### Preferences\n';
    context.preferences.forEach(m => {
      promptContext += `- ${JSON.stringify(m.content)}\n`;
    });
  }
  
  promptContext += '\n⚠️ IMPORTANT: Only reference memories listed above. Do not invent or assume information not provided.\n';
  
  return promptContext;
}

// Helper functions
async function loadMemoryStore() {
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { user_profile: [], goals: [], preferences: [], facts: [], conversation_history: [] };
  }
}

async function saveMemoryStore(store) {
  await fs.writeFile(MEMORY_FILE, JSON.stringify(store, null, 2));
}

export {
  initMemoryStore,
  storeMemory,
  retrieveMemories,
  confirmMemory,
  deleteMemory,
  buildContextForPrompt,
  MEMORY_TYPES
};

export default {
  initMemoryStore,
  storeMemory,
  retrieveMemories,
  confirmMemory,
  deleteMemory,
  buildContextForPrompt,
  MEMORY_TYPES
};
