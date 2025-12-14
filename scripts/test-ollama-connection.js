/**
 * Test Ollama Connection and Model Availability
 * Verifies that the AI Counsel OS can connect to your local Ollama instance
 */

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

// Models required by Open Source Council
const REQUIRED_MODELS = {
  'llama3.2:1b': 'ollama_llama',
  'phi3:mini': 'ollama_phi3',
  'deepseek-coder:latest': 'ollama_deepseek',
  'deepseek-coder-v2:latest': 'ollama_deepseek_coder_v2',
  'deepseek-coder:33b': 'ollama_deepseek_coder_33b',
  'qwen2.5-coder:32b-instruct': 'ollama_qwen_coder_32b',
  'codestral:latest': 'ollama_codestral',
  'deepseek-v3:latest': 'ollama_deepseek_v3',
  'llama3.3:70b-instruct-q4_0': 'ollama_llama_3_3_70b',
  'qwen2.5:72b-q4_0': 'ollama_qwen_2_5_72b',
  'gemma2:27b-it-q4_0': 'ollama_gemma_2_27b',
};

async function testConnection() {
  console.log('🔍 Testing Ollama Connection...\n');
  console.log(`Endpoint: ${OLLAMA_ENDPOINT}\n`);

  try {
    // Test 1: Check if Ollama is running
    console.log('📡 Test 1: Checking Ollama availability...');
    const tagsResponse = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
    
    if (!tagsResponse.ok) {
      throw new Error(`Ollama not responding: HTTP ${tagsResponse.status}`);
    }
    
    const tagsData = await tagsResponse.json();
    const availableModels = tagsData.models || [];
    
    console.log(`✅ Ollama is running! Found ${availableModels.length} models\n`);
    
    // Test 2: Check required models
    console.log('📋 Test 2: Checking required models...\n');
    const modelNames = availableModels.map(m => m.name);
    
    let foundCount = 0;
    let missingCount = 0;
    const missing = [];
    
    for (const [modelName, councilKey] of Object.entries(REQUIRED_MODELS)) {
      // Check exact match or partial match (e.g., "deepseek-v3:latest" matches "deepseek-v3")
      const found = modelNames.some(name => 
        name === modelName || 
        name.startsWith(modelName.split(':')[0]) ||
        modelName.startsWith(name.split(':')[0])
      );
      
      if (found) {
        console.log(`  ✅ ${modelName} (${councilKey})`);
        foundCount++;
      } else {
        console.log(`  ❌ ${modelName} (${councilKey}) - NOT FOUND`);
        missing.push(modelName);
        missingCount++;
      }
    }
    
    console.log(`\n📊 Summary: ${foundCount}/${Object.keys(REQUIRED_MODELS).length} required models found\n`);
    
    // Test 3: Test a simple API call
    console.log('🧪 Test 3: Testing API call...');
    const testModel = availableModels.find(m => 
      m.name.includes('llama3.2') || 
      m.name.includes('phi3') ||
      m.name.includes('deepseek-coder')
    );
    
    if (testModel) {
      console.log(`   Using model: ${testModel.name}`);
      
      const generateResponse = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: testModel.name,
          prompt: 'Say "Hello, AI Counsel OS!"',
          stream: false,
        }),
      });
      
      if (generateResponse.ok) {
        const result = await generateResponse.json();
        console.log(`   ✅ API call successful!`);
        console.log(`   Response: ${result.response?.substring(0, 100)}...\n`);
      } else {
        console.log(`   ⚠️  API call failed: HTTP ${generateResponse.status}\n`);
      }
    } else {
      console.log(`   ⚠️  No suitable test model found\n`);
    }
    
    // Test 4: Check for alternative models
    console.log('🔍 Test 4: Available models that might work...\n');
    const alternativeModels = availableModels
      .filter(m => !Object.keys(REQUIRED_MODELS).some(req => m.name.includes(req.split(':')[0])))
      .slice(0, 10);
    
    if (alternativeModels.length > 0) {
      console.log('   These models are available but not in the required list:');
      alternativeModels.forEach(m => {
        console.log(`   - ${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
      console.log('');
    }
    
    // Final status
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (missingCount === 0) {
      console.log('✅ All required models are available!');
      console.log('✅ Open Source Council is ready to use!\n');
    } else {
      console.log(`⚠️  ${missingCount} required models are missing:`);
      missing.forEach(m => console.log(`   - ${m}`));
      console.log('\n💡 You can still use the Open Source Council with available models.');
      console.log('   The system will fall back to available models automatically.\n');
    }
    
    return {
      connected: true,
      endpoint: OLLAMA_ENDPOINT,
      totalModels: availableModels.length,
      foundModels: foundCount,
      missingModels: missingCount,
      missing: missing,
    };
    
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}\n`);
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure Ollama is running: ollama serve');
    console.log('   2. Check the endpoint: echo $OLLAMA_ENDPOINT');
    console.log('   3. Test manually: curl http://localhost:11434/api/tags\n');
    
    return {
      connected: false,
      error: error.message,
    };
  }
}

// Run the test
testConnection().then(result => {
  if (result.connected) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
