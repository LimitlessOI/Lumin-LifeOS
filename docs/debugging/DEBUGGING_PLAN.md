# Systematic Debugging Plan - AI Counsel OS

**Date**: 2025-01-13  
**Approach**: Runtime evidence-based debugging

## Critical Bug Patterns Identified

### Pattern 1: Invalid Model Keys
**Issue**: Using model registry names instead of COUNCIL_MEMBERS keys
**Files to Check**: All files calling `callCouncilMember()`

### Pattern 2: Opt-in/Opt-out Logic
**Issue**: Incorrect boolean logic for feature flags
**Files to Check**: All files using `useOpenSourceCouncil`, `useTwoTier`, etc.

### Pattern 3: Model Name Mismatches
**Issue**: Hardcoded model names that don't match COUNCIL_MEMBERS
**Files to Check**: All service files

## Systematic Review Plan

### Phase 1: Model Key Validation
- [ ] Verify all `callCouncilMember()` calls use valid COUNCIL_MEMBERS keys
- [ ] Check for hardcoded model names
- [ ] Verify model registry → COUNCIL_MEMBERS mappings

### Phase 2: Feature Flag Logic
- [ ] Check all `useOpenSourceCouncil` usages
- [ ] Verify opt-in vs opt-out behavior
- [ ] Check cost shutdown logic

### Phase 3: Error Handling
- [ ] Verify error handling in all adapters
- [ ] Check fallback logic
- [ ] Verify graceful degradation

### Phase 4: Integration Points
- [ ] Check service initialization
- [ ] Verify dependency injection
- [ ] Check async/await patterns

## Files Requiring Immediate Review

### High Priority (Critical Paths)
1. `server.js` - Main entry point, routing logic
2. `core/open-source-council.js` - OSC router
3. `services/idea-engine/index.js` - Idea generation
4. `services/conflict-arbitrator/index.js` - Conflict resolution
5. `packages/adapters/*.js` - All adapters

### Medium Priority (Service Files)
6. `core/tier0-council.js` - Tier 0 logic
7. `core/tier1-council.js` - Tier 1 logic
8. `core/model-router.js` - Model routing
9. `core/video-editing-council.js` - Video processing

### Lower Priority (Supporting Files)
10. All other `core/*.js` files
11. All other `services/*.js` files

## Debugging Strategy

1. **Static Analysis First**: Use grep/search to find patterns
2. **Runtime Instrumentation**: Add logs to critical paths
3. **Test Execution**: Run system and collect logs
4. **Log Analysis**: Evaluate hypotheses with evidence
5. **Fix & Verify**: Fix bugs, verify with logs

## Current Status

- ✅ Bug 1 Fixed: Opt-in behavior in server.js
- ✅ Bug 2 Fixed: Model key in idea-engine
- ⏳ Bug 3-6: Need verification (found 4 files using 'deepseek' - may be valid)
- ⏳ Systematic review: In progress
