/**
 * Index the Feature Index document into the knowledge base
 * This makes it searchable and automatically injectable into AI prompts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURE_INDEX_PATH = path.join(__dirname, '..', 'FEATURE_INDEX.md');

async function indexFeatureCatalog() {
  try {
    // Read the feature index
    const content = fs.readFileSync(FEATURE_INDEX_PATH, 'utf8');
    
    // Upload to knowledge base via API
    const response = await fetch('http://localhost:3000/api/v1/knowledge/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'FEATURE_INDEX.md',
        content: content,
        category: 'context',
        tags: ['features', 'index', 'catalog', 'reference', 'documentation', 'system-overview'],
        description: 'Complete feature index and catalog of all LifeOS features, functions, and systems. Searchable reference for all capabilities.',
        businessIdea: false,
        securityRelated: false,
        historical: false,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Feature Index indexed successfully!');
      console.log(`   File ID: ${result.fileId}`);
      console.log(`   Category: ${result.category}`);
      console.log('\n📚 The Feature Index is now searchable in the knowledge base!');
      console.log('   You can search for features using:');
      console.log('   - GET /api/v1/knowledge/search?q=feature+name');
      console.log('   - The system will automatically inject it into AI prompts');
    } else {
      const error = await response.text();
      console.error('❌ Failed to index:', error);
    }
  } catch (error) {
    console.error('❌ Error indexing feature catalog:', error.message);
    console.log('\n💡 To manually index, use:');
    console.log('   POST /api/v1/knowledge/upload');
    console.log('   with the FEATURE_INDEX.md content');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  indexFeatureCatalog();
}

export { indexFeatureCatalog };
