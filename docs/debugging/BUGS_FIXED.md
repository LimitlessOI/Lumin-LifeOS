# Bugs Fixed - Production Ready

## ✅ Bug 1: Debug Instrumentation Removed

**Issue**: Multiple `fetch()` calls to debug endpoint (`http://127.0.0.1:7242/ingest/...`) left in production code.

**Fixed**: All debug instrumentation removed from:
- `server.js` - `callCouncilMember()` function (3 instances removed)
- `server.js` - OSC router logic (4 instances removed)
- `server.js` - Ollama error handlers (2 instances removed)
- `services/idea-engine/index.js` - Idea generation (2 instances removed)

**Status**: ✅ All debug instrumentation removed
**Files Modified**: 
- `server.js` (9 instances removed)
- `services/idea-engine/index.js` (2 instances removed)

## ✅ Bug 2: Model Name Transformation Fixed

**Issue**: Fallback transformation at line 376 used simple regex replacement that didn't match actual COUNCIL_MEMBERS key patterns. For example:
- `"qwen2.5:72b-q4_0"` → `"ollama_qwen2.5_72b_q4_0"` (WRONG - has dots, wrong pattern)
- Actual key: `"ollama_qwen_2_5_72b"` (CORRECT)

**Fixed**: 
1. Expanded `modelMap` to include all known model registry names
2. Changed fallback to return `null` instead of incorrect transformation
3. Added comprehensive mapping for all models in registry
4. Applied same fix to `services/conflict-arbitrator/index.js`

**Status**: ✅ Model mapping fixed
**Files Modified**:
- `services/idea-engine/index.js` - `getVotingModels()` function
- `services/conflict-arbitrator/index.js` - `mapModelNameToCouncilKey()` function

## 📋 Model Mapping Coverage

The following models are now properly mapped:

- ✅ `deepseek-v3` / `deepseek-v3:latest` → `ollama_deepseek_v3`
- ✅ `deepseek-r1:32b` → `ollama_deepseek` (fallback)
- ✅ `deepseek-r1:70b` → `ollama_deepseek` (fallback)
- ✅ `deepseek-coder:latest` → `ollama_deepseek`
- ✅ `deepseek-coder-v2:latest` → `ollama_deepseek_coder_v2`
- ✅ `deepseek-coder:33b` → `ollama_deepseek_coder_33b`
- ✅ `llama3.3:70b-instruct-q4_0` → `ollama_llama_3_3_70b`
- ✅ `llama3.2:1b` → `ollama_llama`
- ✅ `qwen2.5:72b-q4_0` → `ollama_qwen_2_5_72b`
- ✅ `qwen2.5:72b-instruct` → `ollama_qwen_2_5_72b`
- ✅ `qwen2.5:32b-instruct` → `ollama_qwen_coder_32b`
- ✅ `qwen2.5-coder:32b-instruct` → `ollama_qwen_coder_32b`
- ✅ `gemma2:27b-it-q4_0` → `ollama_gemma_2_27b`
- ✅ `codestral:latest` → `ollama_codestral`
- ✅ `phi3:mini` → `ollama_phi3`

**Unmapped models**: If a model registry name isn't in the map, the function returns `null` and it's filtered out (prevents "Unknown member" errors).

## ✅ Verification

- ✅ Syntax check passed: `node --check server.js`
- ✅ Syntax check passed: `node -c services/idea-engine/index.js`
- ✅ Syntax check passed: `node -c services/conflict-arbitrator/index.js`
- ✅ No debug instrumentation found in codebase
- ✅ Model mapping expanded and fallback fixed

## 🚀 Production Ready

Both bugs are fixed and the code is ready for production deployment.
