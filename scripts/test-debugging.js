/**
 * SYNOPSIS: Test script to verify debugging fixes
 * Test script to verify debugging fixes
 * Run this to test critical paths and verify fixes
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test 1: Verify COUNCIL_MEMBERS keys
console.log('🧪 Test 1: Verifying COUNCIL_MEMBERS keys...\n');

// Import server to get COUNCIL_MEMBERS (we'll need to extract it)
const serverPath = join(__dirname, '..', 'server.js');
const serverContent = await import('fs').then(fs => 
  fs.promises.readFile(serverPath, 'utf8')
);

// Extract COUNCIL_MEMBERS keys
const councilMembersMatch = serverContent.match(/const COUNCIL_MEMBERS = \{[\s\S]*?\};/);
if (councilMembersMatch) {
  const keys = [];
  const keyMatches = councilMembersMatch[0].matchAll(/(\w+):\s*\{/g);
  for (const match of keyMatches) {
    keys.push(match[1]);
  }
  
  console.log(`✅ Found ${keys.length} COUNCIL_MEMBERS keys`);
  console.log(`   Sample keys: ${keys.slice(0, 5).join(', ')}...\n`);
  
  // Test keys used in code
  const testKeys = [
    'ollama_deepseek_v3',
    'deepseek',
    'ollama_deepseek',
    'chatgpt',
    'gemini',
  ];
  
  console.log('🧪 Test 2: Verifying key usage...\n');
  for (const key of testKeys) {
    const isValid = keys.includes(key);
    console.log(`   ${isValid ? '✅' : '❌'} ${key}: ${isValid ? 'VALID' : 'INVALID'}`);
  }
} else {
  console.log('❌ Could not extract COUNCIL_MEMBERS');
}

// Test 3: Check for opt-in logic
console.log('\n🧪 Test 3: Checking opt-in logic...\n');
const optInPattern = /useOpenSourceCouncil\s*===\s*true/g;
const optOutPattern = /useOpenSourceCouncil\s*!==\s*false/g;

const optInMatches = serverContent.match(optInPattern) || [];
const optOutMatches = serverContent.match(optOutPattern) || [];

console.log(`   ✅ Opt-in patterns (=== true): ${optInMatches.length}`);
console.log(`   ${optOutMatches.length > 0 ? '❌' : '✅'} Opt-out patterns (!== false): ${optOutMatches.length}`);

if (optOutMatches.length > 0) {
  console.log(`   ⚠️  Found ${optOutMatches.length} opt-out patterns (should be opt-in)`);
  optOutMatches.forEach((match, i) => {
    const lineNum = serverContent.substring(0, serverContent.indexOf(match)).split('\n').length;
    console.log(`      Line ${lineNum}: ${match.substring(0, 60)}...`);
  });
}

// Test 4: Check for invalid model keys
console.log('\n🧪 Test 4: Checking for invalid model keys...\n');
const invalidPatterns = [
  /callCouncilMember\(['"]deepseek-v3['"]/,
  /callCouncilMember\(['"]deepseek-r1:32b['"]/,
  /callCouncilMember\(['"]deepseek-r1:70b['"]/,
];

let foundInvalid = false;
for (const pattern of invalidPatterns) {
  const matches = serverContent.match(pattern);
  if (matches) {
    foundInvalid = true;
    console.log(`   ❌ Found invalid pattern: ${pattern}`);
    matches.forEach(match => {
      const lineNum = serverContent.substring(0, serverContent.indexOf(match)).split('\n').length;
      console.log(`      Line ${lineNum}: ${match.substring(0, 60)}...`);
    });
  }
}

if (!foundInvalid) {
  console.log('   ✅ No invalid model keys found');
}

console.log('\n✅ Testing complete!\n');
