#!/usr/bin/env node

/**
 * AI Counsel OS CLI
 * Command-line interface for managing the system
 */

import { program } from 'commander';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import services (will be initialized on demand)
let modelRegistry, ideaEngine, orchestrator;

program
  .name('counsel')
  .description('AI Counsel OS - Local-first AI system')
  .version('1.0.0');

// Health check command
program
  .command('health')
  .description('Check system health')
  .action(async () => {
    console.log('🏥 Checking system health...\n');

    const checks = {
      ollama: await checkOllama(),
      models: await checkModels(),
      database: await checkDatabase(),
      directories: checkDirectories(),
    };

    console.log('\n📊 Health Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Object.entries(checks).forEach(([name, status]) => {
      const icon = status.ok ? '✅' : '❌';
      console.log(`${icon} ${name.padEnd(15)} ${status.message}`);
    });

    const allOk = Object.values(checks).every(c => c.ok);
    process.exit(allOk ? 0 : 1);
  });

// Models command
program
  .command('models')
  .description('List and manage models')
  .option('-t, --test', 'Test model availability')
  .action(async (options) => {
    const registry = await loadModelRegistry();
    const models = registry.getAllModels();

    if (options.test) {
      console.log('🧪 Testing model availability...\n');
      for (const model of models.slice(0, 10)) { // Test first 10
        const available = await registry.isModelAvailable(model);
        const icon = available ? '✅' : '❌';
        console.log(`${icon} ${model.name.padEnd(30)} ${model.provider}`);
      }
    } else {
      console.log('📋 Available Models:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const byProvider = {};
      models.forEach(model => {
        if (!byProvider[model.provider]) {
          byProvider[model.provider] = [];
        }
        byProvider[model.provider].push(model);
      });

      Object.entries(byProvider).forEach(([provider, providerModels]) => {
        console.log(`\n${provider.toUpperCase()}:`);
        providerModels.forEach(model => {
          const cost = model.cost_class === 'free' ? '🆓' : '💰';
          console.log(`  ${cost} ${model.name.padEnd(30)} ${model.default_role || 'N/A'}`);
        });
      });
    }
  });

// Ideas commands
const ideasCmd = program
  .command('ideas')
  .description('Manage idea generation');

ideasCmd
  .command('run')
  .description('Run idea generation manually')
  .option('-c, --count <number>', 'Number of ideas to generate', '20')
  .action(async (options) => {
    console.log('💡 Running idea generation...\n');
    
    try {
      const engine = await loadIdeaEngine();
      const result = await engine.run(parseInt(options.count));
      
      console.log('\n✅ Idea generation complete!');
      console.log(`   Generated: ${result.count} ideas`);
      console.log(`   Clusters: ${result.clusters}`);
      console.log(`   Top idea: ${result.topIdeas[0]?.title}`);
      console.log(`\n   See: docs/ideas/${dayjs().format('YYYY-MM-DD')}.md`);
    } catch (error) {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    }
  });

ideasCmd
  .command('review')
  .description('Review generated ideas')
  .option('-d, --date <date>', 'Date to review (YYYY-MM-DD)', dayjs().format('YYYY-MM-DD'))
  .action(async (options) => {
    const date = options.date;
    const filePath = path.join(process.cwd(), 'docs', 'ideas', `${date}.md`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ No ideas found for ${date}`);
      console.log(`   Run: counsel ideas run`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content);
  });

// Benchmark command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .action(async () => {
    console.log('⚡ Running benchmarks...\n');
    console.log('⚠️ Benchmark harness not yet implemented');
    console.log('   See: scripts/benchmark/');
  });

// Helper functions
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      return { ok: true, message: `Running (${data.models?.length || 0} models)` };
    }
    return { ok: false, message: 'Not responding' };
  } catch (error) {
    return { ok: false, message: 'Not running' };
  }
}

async function checkModels() {
  try {
    const registry = await loadModelRegistry();
    const models = registry.getAllModels();
    const free = models.filter(m => m.cost_class === 'free').length;
    return { ok: true, message: `${models.length} total (${free} free)` };
  } catch (error) {
    return { ok: false, message: 'Registry not loaded' };
  }
}

async function checkDatabase() {
  // Check if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    return { ok: true, message: 'Configured' };
  }
  return { ok: false, message: 'Not configured' };
}

function checkDirectories() {
  const dirs = ['data/ideas', 'data/benchmarks', 'docs/ideas'];
  const missing = dirs.filter(dir => !fs.existsSync(path.join(process.cwd(), dir)));
  if (missing.length === 0) {
    return { ok: true, message: 'All directories exist' };
  }
  return { ok: false, message: `Missing: ${missing.join(', ')}` };
}

async function loadModelRegistry() {
  if (!modelRegistry) {
    const { default: ModelRegistry } = await import('../../packages/model-registry/index.js');
    modelRegistry = ModelRegistry;
  }
  return modelRegistry;
}

async function loadIdeaEngine() {
  if (!ideaEngine) {
    // This would need to be initialized with proper dependencies
    console.error('⚠️ Idea engine requires full system initialization');
    console.error('   Use the HTTP API or initialize the full system');
    process.exit(1);
  }
  return ideaEngine;
}

// Parse arguments
program.parse();
