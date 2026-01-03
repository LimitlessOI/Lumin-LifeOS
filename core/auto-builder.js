/**
 * AUTO-BUILDER - Anti-Hallucination Edition
 * ONE product at a time. Validate everything. Never deploy garbage.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { routeTask } from './model-router.js';
import { validateResponse, extractCode } from './validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCT_QUEUE = [
  {
    id: 'api_cost_savings',
    name: 'API Cost Savings Service',
    description: 'OpenAI-compatible API routing through free local models',
    components: [
      {
        id: 'landing',
        name: 'Landing Page',
        file: 'products/api-service/index.html',
        type: 'html',
        status: 'pending',
        prompt: `Create a complete HTML landing page for an API Cost Savings Service.

REQUIREMENTS:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Hero section with headline "Cut Your AI API Costs by 90%"
- Three-step "How it works" section
- Pricing cards: Starter $49/mo (10K requests), Pro $99/mo (50K requests), Enterprise $299/mo (unlimited)
- Each pricing card has a button linking to /api/checkout?plan=starter (or pro/enterprise)
- Professional dark theme
- Mobile responsive

OUTPUT ONLY VALID HTML. No explanation. Start with <!DOCTYPE html>`
      },
      {
        id: 'chat_endpoint',
        name: 'Chat Completions API',
        file: 'products/api-service/routes/chat.js',
        type: 'js',
        status: 'pending',
        prompt: `Create an Express.js router for OpenAI-compatible chat completions.

REQUIREMENTS:
- Export an Express router
- POST /v1/chat/completions endpoint
- Extract Bearer token from Authorization header
- Accept body: { model, messages, temperature, max_tokens }
- Call Ollama at http://localhost:11434/api/generate
- Convert Ollama response to OpenAI format with id, object, created, model, choices array
- Handle errors with proper status codes

OUTPUT ONLY VALID JAVASCRIPT. No explanation. No markdown.

Start the file with:
import express from 'express';
const router = express.Router();`
      },
      {
        id: 'checkout',
        name: 'Stripe Checkout',
        file: 'products/api-service/routes/checkout.js',
        type: 'js',
        status: 'pending',
        prompt: `Create an Express.js router for Stripe checkout.

REQUIREMENTS:
- Export an Express router
- GET /checkout endpoint
- Read plan from query param: req.query.plan (starter, pro, or enterprise)
- Use stripe from import('stripe')(process.env.STRIPE_SECRET_KEY)
- Create checkout session with mode: 'subscription'
- Price IDs from env: STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE
- Success URL: process.env.BASE_URL + '/success'
- Cancel URL: process.env.BASE_URL + '/'
- Redirect to session.url

OUTPUT ONLY VALID JAVASCRIPT. No explanation. No markdown.

Start the file with:
import express from 'express';
const router = express.Router();`
      }
    ]
  }
];

let currentProductIndex = 0;
let buildInProgress = false;

export async function runBuildCycle() {
  if (buildInProgress) {
    console.log('⏳ [BUILD] Already in progress');
    return { skipped: true };
  }
  
  buildInProgress = true;
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔨 [AUTO-BUILDER] Starting build cycle');
    console.log('='.repeat(60));
    
    const product = PRODUCT_QUEUE[currentProductIndex];
    
    if (!product) {
      console.log('🎉 All products complete!');
      return { complete: true };
    }
    
    console.log(`\n🎯 Product: ${product.name}`);
    
    for (const comp of product.components) {
      const icon = comp.status === 'complete' ? '✅' : comp.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${icon} ${comp.name}`);
    }
    
    const component = product.components.find(c => c.status === 'pending');
    
    if (!component) {
      console.log(`\n✅ ${product.name} complete!`);
      currentProductIndex++;
      return { productComplete: true };
    }
    
    console.log(`\n📦 Building: ${component.name}`);
    console.log(`📄 File: ${component.file}`);
    
    const result = await buildComponent(component);
    
    if (result.success) {
      component.status = 'complete';
      console.log(`✅ ${component.name} COMPLETE`);
    } else {
      component.status = 'failed';
      component.lastError = result.error;
      console.log(`❌ ${component.name} FAILED: ${result.error}`);
    }
    
    return result;
    
  } finally {
    buildInProgress = false;
  }
}

async function buildComponent(component, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxRetries}`);
    
    let prompt = component.prompt;
    if (lastError && attempt > 1) {
      prompt = `PREVIOUS ATTEMPT FAILED:\n${lastError}\n\nFix this and try again.\n\n${component.prompt}`;
    }
    
    try {
      console.log('🤖 Generating...');
      const response = await routeTask('code_generation', prompt);
      
      console.log('🔍 Validating...');
      const validation = await validateResponse(response, component.type, component.file);
      
      if (!validation.passed) {
        lastError = validation.errors.join('; ');
        console.log(`⚠️ Validation failed: ${lastError}`);
        continue;
      }
      
      console.log('✂️ Extracting code...');
      const code = extractCode(response, component.type);
      
      if (code.length < 100) {
        lastError = 'Code too short (< 100 chars)';
        console.log(`⚠️ ${lastError}`);
        continue;
      }
      
      console.log('💾 Saving...');
      await saveFile(component.file, code);
      
      return { success: true, file: component.file };
      
    } catch (error) {
      lastError = error.message;
      console.log(`⚠️ Error: ${lastError}`);
    }
  }
  
  return { success: false, error: lastError };
}

async function saveFile(filepath, content) {
  const fullPath = path.join(process.cwd(), filepath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  console.log(`💾 Saved: ${filepath}`);
}

export function getStatus() {
  const product = PRODUCT_QUEUE[currentProductIndex];
  if (!product) return { status: 'all_complete' };
  
  return {
    status: 'in_progress',
    product: product.name,
    components: product.components.map(c => ({
      name: c.name,
      status: c.status,
      file: c.file,
      error: c.lastError || null
    })),
    buildInProgress
  };
}

export function resetAllFailed() {
  let count = 0;
  for (const product of PRODUCT_QUEUE) {
    for (const comp of product.components) {
      if (comp.status === 'failed') {
        comp.status = 'pending';
        comp.lastError = null;
        count++;
      }
    }
  }
  return count;
}

export function resetComponent(componentId) {
  for (const product of PRODUCT_QUEUE) {
    const comp = product.components.find(c => c.id === componentId);
    if (comp) {
      comp.status = 'pending';
      comp.lastError = null;
      return true;
    }
  }
  return false;
}

export { PRODUCT_QUEUE };
