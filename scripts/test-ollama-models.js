#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OLLAMA MODELS TEST SCRIPT                                     ║
 * ║                    Tests all open source models                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

// Models to test
const MODELS = [
  { key: 'ollama_llama', model: 'llama3.2:1b', prompt: 'Say hello in one sentence.' },
  { key: 'ollama_phi3', model: 'phi3:mini', prompt: 'What is 2+2?' },
  { key: 'ollama_deepseek', model: 'deepseek-coder:latest', prompt: 'Write a hello world in Python.' },
];

async function testOllamaConnection() {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running!');
      console.log(`   Available models: ${data.models?.length || 0}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Ollama is not running or not accessible');
    console.error(`   Endpoint: ${OLLAMA_ENDPOINT}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testModel(modelKey, modelName, prompt) {
  console.log(`\n🧪 Testing ${modelKey} (${modelName})...`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Failed: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    const responseText = data.response || '';

    console.log(`   ✅ Success! (${duration}ms)`);
    console.log(`   Response: ${responseText.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testLifeOSAPI() {
  console.log('\n🧪 Testing LifeOS API integration...');
  
  const LIFOS_ENDPOINT = process.env.LIFOS_ENDPOINT || 'http://localhost:8080';
  const COMMAND_KEY = process.env.COMMAND_CENTER_KEY || 'MySecretKey2025LifeOS';
  
  try {
    const response = await fetch(`${LIFOS_ENDPOINT}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'x-command-key': COMMAND_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Say hello!',
        member: 'ollama_llama',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Failed: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ LifeOS API working!`);
    console.log(`   Response: ${data.response?.substring(0, 100) || JSON.stringify(data)}...`);
    return true;
  } catch (error) {
    console.log(`   ⚠️  LifeOS API not accessible: ${error.message}`);
    console.log(`   (This is OK if server is not running)`);
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    OLLAMA MODELS TEST                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🔗 Endpoint: ${OLLAMA_ENDPOINT}\n`);

  // Test connection
  const isConnected = await testOllamaConnection();
  if (!isConnected) {
    console.log('\n❌ Cannot proceed - Ollama is not accessible');
    console.log('   Please start Ollama: ollama serve');
    process.exit(1);
  }

  // Test each model
  let successCount = 0;
  for (const model of MODELS) {
    const success = await testModel(model.key, model.model, model.prompt);
    if (success) successCount++;
  }

  // Test LifeOS API
  await testLifeOSAPI();

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Test Results: ${successCount}/${MODELS.length} models working`);
  
  if (successCount === MODELS.length) {
    console.log('✅ All tests passed!');
  } else {
    console.log('⚠️  Some models failed. Make sure all models are downloaded:');
    console.log('   ./scripts/setup-ollama-models.sh');
  }
  
  console.log('\n💡 To use models via LifeOS API:');
  console.log('   curl -X POST http://localhost:8080/api/v1/chat \\');
  console.log('     -H "x-command-key: MySecretKey2025LifeOS" \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"message": "Hello!", "member": "ollama_llama"}\'');
  console.log('');
}

main().catch(console.error);
