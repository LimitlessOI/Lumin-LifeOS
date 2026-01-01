/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              COMPREHENSIVE IDEA EXTRACTOR                                        ║
 * ║              Mines ALL billion-dollar ideas from conversation dumps              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const ROOT_DIR = path.join(__dirname, '..');

// Categories to look for
const IDEA_CATEGORIES = [
  'overlay_system',
  'sales_multiplier', 
  'coding_assistant',
  'video_generation',
  'social_media_automation',
  'education_k12',
  'education_college', 
  'teacher_tools',
  'personalized_learning',
  'interactive_video',
  'book_to_movie',
  'fan_content_creation',
  'crm_overlay',
  'screen_shopping',
  'legal_documents',
  'habit_tracking',
  'integrity_tracker',
  'therapy_coaching',
  'health_wellness',
  'real_estate_tools',
  'business_automation',
  'revenue_generation',
  'ai_council',
  'pay_it_forward',
  'human_transformation'
];

/**
 * Call Ollama API to extract ideas
 */
async function callOllama(prompt, model = 'qwen2.5:32b-instruct') {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { 
          temperature: 0.2, 
          num_ctx: 8192,
          num_predict: 4096
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error(`  ❌ Ollama error: ${error.message}`);
    return '';
  }
}

/**
 * Sanitize JSON response from LLM
 */
function sanitizeJsonResponse(text) {
  if (!text || typeof text !== 'string') return text;
  
  let cleaned = text
    // Remove markdown code fences
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1')
    .trim();
  
  // Try to extract JSON array if wrapped in other text
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

/**
 * Extract ideas from a chunk of text
 */
async function extractIdeasFromChunk(chunk, sourceFile, chunkNum) {
  const prompt = `You are analyzing a conversation to extract BILLION-DOLLAR business ideas.

CONVERSATION CHUNK:
${chunk}

TASK:
Find ANY mentions of:
- Product ideas (apps, services, platforms, tools)
- Revenue models (how to make money, pricing, monetization)
- Revolutionary features (things no one else does)
- Overlay system features (screen-aware, always-on tools)
- Education tools (K-12, college, teacher tools, personalized learning)
- Sales/CRM tools (customer management, outreach, automation)
- Video/content generation (AI video, animation, movie creation)
- AI assistants (coding, writing, productivity)
- Human transformation concepts (coaching, therapy, habit building)
- Business automation (workflows, integrations, efficiency)
- Real estate tools (property finder, commercial real estate)
- Health/wellness tools (ADHD, executive function, therapy)

For EACH idea found, extract:
1. The core idea (1-2 sentences describing what it is)
2. Category (one of: overlay_system, sales_multiplier, coding_assistant, video_generation, education_k12, education_college, teacher_tools, personalized_learning, interactive_video, book_to_movie, fan_content_creation, crm_overlay, screen_shopping, legal_documents, habit_tracking, integrity_tracker, therapy_coaching, health_wellness, real_estate_tools, business_automation, revenue_generation, ai_council, pay_it_forward, human_transformation)
3. Revenue potential (if mentioned: pricing model, revenue estimate, monetization strategy)
4. Unique differentiator (what makes it special or better than alternatives)
5. Exact quote from text (max 150 chars showing where idea came from)

Return as JSON array:
[
  {
    "idea": "Brief description of the product/service/feature",
    "category": "category_name",
    "revenue": "potential or model if mentioned, else null",
    "differentiator": "what makes it unique",
    "quote": "exact relevant quote from text (max 150 chars)"
  }
]

CRITICAL RULES:
- Extract EVERY idea, even partial or incomplete ones
- Do NOT make up ideas - only extract what's explicitly in the text
- Skip code snippets, technical instructions, error messages, debug output
- Focus on business concepts, product features, revenue ideas, user benefits
- If no ideas found, return empty array: []
- Return ONLY the JSON array, no explanations, no markdown

Return ONLY the JSON array, nothing else.`;

  try {
    const response = await callOllama(prompt, 'qwen2.5:32b-instruct');
    
    if (!response || response.trim().length === 0) {
      return [];
    }
    
    // Sanitize and parse JSON
    const sanitized = sanitizeJsonResponse(response);
    const jsonMatch = sanitized.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        const ideas = JSON.parse(jsonMatch[0]);
        
        // Validate and clean ideas
        return ideas
          .filter(idea => idea && idea.idea && idea.idea.trim().length > 10)
          .map(idea => ({
            idea: (idea.idea || '').trim(),
            category: (idea.category || 'other').toLowerCase(),
            revenue: (idea.revenue || null),
            differentiator: (idea.differentiator || '').trim(),
            quote: (idea.quote || '').trim().substring(0, 150),
            source: sourceFile,
            chunk: chunkNum,
            extracted_at: new Date().toISOString()
          }));
      } catch (parseError) {
        console.warn(`  ⚠️ JSON parse error in chunk ${chunkNum}: ${parseError.message}`);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.warn(`  ⚠️ Error in chunk ${chunkNum}: ${error.message}`);
    return [];
  }
}

/**
 * Process a single dump file
 */
async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const totalChars = content.length;
    console.log(`   Size: ${(totalChars / 1024 / 1024).toFixed(2)} MB (${totalChars.toLocaleString()} chars)`);
    
    // Skip if file is too small or empty
    if (totalChars < 100) {
      console.log(`   ⏭️  Skipping (too small)`);
      return [];
    }
    
    // Split into chunks of ~10000 characters with overlap to avoid cutting ideas in half
    const chunkSize = 10000;
    const overlap = 500;
    const chunks = [];
    
    for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
      const chunk = content.slice(i, Math.min(i + chunkSize, content.length));
      if (chunk.trim().length > 100) { // Only add non-empty chunks
        chunks.push(chunk);
      }
    }
    
    console.log(`   Chunks: ${chunks.length}`);
    
    const allIdeas = [];
    
    // Process chunks with progress indicator
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`   Processing chunk ${i + 1}/${chunks.length}...\r`);
      
      const ideas = await extractIdeasFromChunk(chunks[i], filename, i + 1);
      allIdeas.push(...ideas);
      
      // Small delay to avoid overwhelming Ollama
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   ✅ Extracted ${allIdeas.length} ideas from ${chunks.length} chunks`);
    
    return allIdeas;
  } catch (error) {
    console.error(`   ❌ Error processing ${filename}: ${error.message}`);
    return [];
  }
}

/**
 * Find all dump files
 */
async function findDumpFiles() {
  const possiblePaths = [
    path.join(ROOT_DIR, '• Lumin-Memory', '00_INBOX', 'raw'),
    path.join(ROOT_DIR, 'Lumin-Memory', '00_INBOX', 'raw'),
    path.join(ROOT_DIR, '*Lumin*', '00_INBOX', 'raw'),
    path.join(ROOT_DIR, '**', '*Lumin*', '**', 'raw'),
  ];
  
  const files = [];
  
  for (const basePath of possiblePaths) {
    try {
      // Handle glob patterns
      if (basePath.includes('*')) {
        // Skip glob for now, try direct paths first
        continue;
      }
      
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'README.md') {
          files.push(path.join(basePath, entry.name));
        }
      }
      
      if (files.length > 0) {
        console.log(`✅ Found dump directory: ${basePath}`);
        break; // Found it, stop looking
      }
    } catch (error) {
      // Path doesn't exist, try next
      continue;
    }
  }
  
  return files;
}

/**
 * Main extraction process
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              COMPREHENSIVE IDEA EXTRACTOR                                         ║');
  console.log('║              Mining ALL ideas from conversation dumps                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📁 Root directory: ${ROOT_DIR}`);
  console.log(`🤖 Ollama endpoint: ${OLLAMA_ENDPOINT}\n`);
  
  // Check Ollama connection
  try {
    const testResponse = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
    if (!testResponse.ok) {
      throw new Error(`Ollama not responding (HTTP ${testResponse.status})`);
    }
    console.log('✅ Ollama connection verified\n');
  } catch (error) {
    console.error(`❌ Cannot connect to Ollama: ${error.message}`);
    console.error(`   Make sure Ollama is running at ${OLLAMA_ENDPOINT}`);
    process.exit(1);
  }
  
  // Find dump files
  console.log('🔍 Finding dump files...');
  const dumpFiles = await findDumpFiles();
  
  if (dumpFiles.length === 0) {
    console.error('\n❌ No dump files found!');
    console.error('   Expected location: ~/Projects/Lumin-LifeOS/*Lumin*/00_INBOX/raw/');
    console.error('   Or: ~/Projects/Lumin-LifeOS/• Lumin-Memory/00_INBOX/raw/');
    process.exit(1);
  }
  
  console.log(`✅ Found ${dumpFiles.length} dump files:\n`);
  dumpFiles.forEach(f => console.log(`   📄 ${path.basename(f)}`));
  
  // Process each file
  const allExtractedIdeas = [];
  
  for (const filePath of dumpFiles) {
    const ideas = await processFile(filePath);
    allExtractedIdeas.push(...ideas);
  }
  
  // Deduplicate ideas (simple text similarity)
  console.log(`\n🔄 Deduplicating ${allExtractedIdeas.length} ideas...`);
  const seen = new Set();
  const uniqueIdeas = [];
  
  for (const idea of allExtractedIdeas) {
    const key = idea.idea.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);
    if (!seen.has(key) && idea.idea.trim().length > 20) {
      seen.add(key);
      uniqueIdeas.push(idea);
    }
  }
  
  console.log(`✅ ${uniqueIdeas.length} unique ideas after deduplication\n`);
  
  // Save results
  const outputDir = path.join(ROOT_DIR, 'knowledge', 'extracted-ideas');
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `all-ideas-${timestamp}.json`);
  
  await fs.writeFile(
    outputFile,
    JSON.stringify(uniqueIdeas, null, 2),
    'utf-8'
  );
  
  // Also save as JSONL for easy processing
  const jsonlFile = path.join(outputDir, `all-ideas-${timestamp}.jsonl`);
  const jsonlContent = uniqueIdeas.map(idea => JSON.stringify(idea)).join('\n');
  await fs.writeFile(jsonlFile, jsonlContent, 'utf-8');
  
  // Generate summary
  const categoryCounts = {};
  const sourceCounts = {};
  
  for (const idea of uniqueIdeas) {
    categoryCounts[idea.category] = (categoryCounts[idea.category] || 0) + 1;
    sourceCounts[idea.source] = (sourceCounts[idea.source] || 0) + 1;
  }
  
  const summary = {
    total_ideas: uniqueIdeas.length,
    extraction_date: new Date().toISOString(),
    sources_processed: dumpFiles.length,
    categories: categoryCounts,
    sources: sourceCounts,
    output_files: {
      json: outputFile,
      jsonl: jsonlFile
    }
  };
  
  const summaryFile = path.join(outputDir, `summary-${timestamp}.json`);
  await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
  
  // Print summary
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              EXTRACTION COMPLETE                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Total unique ideas: ${uniqueIdeas.length}`);
  console.log(`📁 Output files:`);
  console.log(`   JSON: ${outputFile}`);
  console.log(`   JSONL: ${jsonlFile}`);
  console.log(`   Summary: ${summaryFile}\n`);
  
  console.log('📈 Top categories:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} ideas`);
    });
  
  console.log('\n📚 Ideas by source:');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`   ${source}: ${count} ideas`);
    });
  
  console.log('\n✅ Done! All ideas extracted and saved.\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { extractIdeasFromChunk, processFile, findDumpFiles };
