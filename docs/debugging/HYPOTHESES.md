# Debugging Hypotheses - AI Counsel OS

## Hypothesis A: Invalid Model Keys
**Issue**: `callCouncilMember()` called with model registry names instead of COUNCIL_MEMBERS keys
**Expected Behavior**: All calls use valid keys from COUNCIL_MEMBERS
**Test**: Check if member key exists in COUNCIL_MEMBERS before calling
**Files**: All files with `callCouncilMember()` calls

## Hypothesis B: Opt-in/Opt-out Logic Errors
**Issue**: Feature flags use wrong boolean logic (opt-out instead of opt-in)
**Expected Behavior**: `useOpenSourceCouncil === true` for opt-in
**Test**: Verify all feature flags use correct logic
**Files**: server.js, all service files

## Hypothesis C: Model Name Mismatches
**Issue**: Hardcoded model names don't match COUNCIL_MEMBERS keys
**Expected Behavior**: All model references use COUNCIL_MEMBERS keys
**Test**: Validate all model references
**Files**: idea-engine, conflict-arbitrator, video-editing-council

## Hypothesis D: Missing Error Handling
**Issue**: Functions don't handle errors gracefully
**Expected Behavior**: All errors caught and logged
**Test**: Check try/catch coverage
**Files**: All service files

## Hypothesis E: Async/Await Issues
**Issue**: Missing await or incorrect promise handling
**Expected Behavior**: All async operations properly awaited
**Test**: Check for unhandled promises
**Files**: All async functions

## Hypothesis F: Cost Calculation Errors
**Issue**: Incorrect cost tracking or calculation
**Expected Behavior**: Accurate cost tracking
**Test**: Verify cost calculations
**Files**: server.js (callCouncilMember, updateDailySpend)

## Hypothesis G: Cache Logic Issues
**Issue**: Cache not working or returning stale data
**Expected Behavior**: Cache works correctly
**Test**: Verify cache hits/misses
**Files**: server.js (getCachedResponse, cacheResponse)

## Hypothesis H: Provider Availability Checks
**Issue**: Not checking if provider is available before calling
**Expected Behavior**: Check availability before API calls
**Test**: Verify availability checks
**Files**: All adapter files
