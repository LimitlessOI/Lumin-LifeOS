# Runtime Debugging Plan

## Current Status

✅ **Static Analysis Complete**
- Scanned 418 files
- Found 2 errors (false positives in debug scripts - fixed)
- Found 88 warnings (mostly false positives about await patterns)

✅ **Instrumentation Added**
- `callCouncilMember()` function (server.js:2202)
- OSC router logic (server.js:4444)
- Idea engine calls (idea-engine/index.js:82)

## Runtime Debugging Strategy

### Phase 1: Test Critical Paths

**Test 1: callCouncilMember with valid key**
- Call: `callCouncilMember('ollama_deepseek_v3', 'test prompt')`
- Expected: Success, logs show config found
- Check: Logs confirm member key is valid

**Test 2: callCouncilMember with invalid key**
- Call: `callCouncilMember('deepseek-v3', 'test prompt')`
- Expected: Error "Unknown member"
- Check: Logs show config lookup failed

**Test 3: OSC router opt-in behavior**
- Call: `callCouncilWithFailover('test', 'ollama_deepseek', false, {})`
- Expected: OSC router NOT activated (opt-in)
- Check: Logs show `willUseOSC: false`

**Test 4: OSC router explicit opt-in**
- Call: `callCouncilWithFailover('test', 'ollama_deepseek', false, { useOpenSourceCouncil: true })`
- Expected: OSC router activated
- Check: Logs show `willUseOSC: true`

**Test 5: OSC router cost shutdown**
- Set: `MAX_DAILY_SPEND=0`
- Call: `callCouncilWithFailover('test', 'ollama_deepseek', false, {})`
- Expected: OSC router activated (cost shutdown)
- Check: Logs show `inCostShutdown: true, willUseOSC: true`

### Phase 2: Test Idea Engine

**Test 6: Idea generation**
- Call: `ideaEngine.generateIdeas(5)`
- Expected: 5 ideas generated
- Check: Logs show model key used correctly

**Test 7: Idea voting**
- Call: `ideaEngine.voteOnIdeas([...ideas])`
- Expected: Voting completes
- Check: Logs show voting models are valid keys

### Phase 3: Test Other Services

**Test 8: Conflict Arbitrator**
- Call: `conflictArbitrator.startSession({...})`
- Expected: Session created
- Check: Logs show model keys are valid

**Test 9: Video Editing Council**
- Call: `videoCouncil.processRequest({...})`
- Expected: Request processed
- Check: Logs show coordinator model key is valid

## Next Steps

1. Run the system
2. Execute test cases
3. Analyze logs
4. Fix issues found
5. Re-test
