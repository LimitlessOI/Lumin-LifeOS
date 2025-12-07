/**
 * Auto-run system setup guides
 * Executes setup steps automatically where possible
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GUIDES_DIR = path.join(__dirname, '..');

async function autoRunGuides() {
  console.log('🚀 Auto-running system guides...\n');

  const guides = [
    {
      name: 'Vapi Phone System Setup',
      file: 'guide.md',
      steps: [
        {
          description: 'Check for Vapi API key',
          action: async () => {
            if (process.env.VAPI_API_KEY) {
              console.log('   ✅ VAPI_API_KEY found');
              return true;
            } else {
              console.log('   ⚠️ VAPI_API_KEY not found - will prompt for it');
              return false;
            }
          },
        },
        {
          description: 'Check for Vapi Assistant ID',
          action: async () => {
            if (process.env.VAPI_ASSISTANT_ID) {
              console.log('   ✅ VAPI_ASSISTANT_ID found');
              return true;
            } else {
              console.log('   ⚠️ VAPI_ASSISTANT_ID not found');
              return false;
            }
          },
        },
      ],
    },
    {
      name: 'Railway Ollama Setup',
      file: 'RAILWAY_OLLAMA_SETUP.md',
      steps: [
        {
          description: 'Check Railway deployment',
          action: async () => {
            // Check if we're on Railway
            if (process.env.RAILWAY_ENVIRONMENT) {
              console.log('   ✅ Running on Railway');
              return true;
            } else {
              console.log('   ℹ️ Not on Railway (local development)');
              return false;
            }
          },
        },
      ],
    },
  ];

  for (const guide of guides) {
    console.log(`\n📖 ${guide.name}:`);
    
    for (const step of guide.steps) {
      console.log(`   ${step.description}...`);
      try {
        await step.action();
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Guide auto-run complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review guide.md for Vapi setup');
  console.log('   2. Review RAILWAY_OLLAMA_SETUP.md for Ollama');
  console.log('   3. Set missing environment variables');
  console.log('   4. Restart the server');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoRunGuides();
}

export { autoRunGuides };
