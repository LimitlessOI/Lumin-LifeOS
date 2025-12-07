# 📊 Comprehensive Historical server.js Analysis

**Generated:** 2025-12-07T01:02:07.226Z
**Commits Analyzed:** 216 valid / 0 invalid
**Total Functions Found:** 259

## 🎯 Executive Summary

This analysis examines 216 historical versions of `server.js` to identify:
- Functions that absolutely should be included
- Functions that need more thought
- What worked and what didn't

## ⚠️ CRITICAL FUNCTIONS (Must Include)

These functions appear in >50% of commits and are still in recent versions:

### `callCouncilMember`
- **Type:** function
- **Appearances:** 312 commits (144.4%)
- **First Seen:** 2025-10-22 04:19:43 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `initDb`
- **Type:** function
- **Appearances:** 248 commits (114.8%)
- **First Seen:** 2025-10-06 22:51:08 -0700
- **Last Seen:** 2025-11-12 11:00:34 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `storeConversationMemory`
- **Type:** function
- **Appearances:** 222 commits (102.8%)
- **First Seen:** 2025-11-02 01:09:41 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `recallConversationMemory`
- **Type:** function
- **Appearances:** 222 commits (102.8%)
- **First Seen:** 2025-11-02 01:09:41 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `isFileProtected`
- **Type:** function
- **Appearances:** 214 commits (99.1%)
- **First Seen:** 2025-11-02 01:09:41 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `updateROI`
- **Type:** function
- **Appearances:** 138 commits (63.9%)
- **First Seen:** 2025-10-22 10:14:58 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `start`
- **Type:** function
- **Appearances:** 134 commits (62.0%)
- **First Seen:** 2025-11-01 23:16:16 -0700
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `callCouncilWithFailover`
- **Type:** function
- **Appearances:** 132 commits (61.1%)
- **First Seen:** 2025-11-12 11:00:34 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `initDatabase`
- **Type:** function
- **Appearances:** 130 commits (60.2%)
- **First Seen:** 2025-11-13 11:37:09 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `trackLoss`
- **Type:** function
- **Appearances:** 130 commits (60.2%)
- **First Seen:** 2025-11-13 11:37:09 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `createProposal`
- **Type:** function
- **Appearances:** 130 commits (60.2%)
- **First Seen:** 2025-11-13 11:37:09 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `loadROIFromDatabase`
- **Type:** function
- **Appearances:** 128 commits (59.3%)
- **First Seen:** 2025-11-13 14:53:10 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `generateDailyIdeas`
- **Type:** function
- **Appearances:** 124 commits (57.4%)
- **First Seen:** 2025-11-13 14:53:10 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `continuousSelfImprovement`
- **Type:** function
- **Appearances:** 124 commits (57.4%)
- **First Seen:** 2025-11-15 13:35:47 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `triggerDeployment`
- **Type:** function
- **Appearances:** 124 commits (57.4%)
- **First Seen:** 2025-11-15 13:35:47 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `commitToGitHub`
- **Type:** function
- **Appearances:** 124 commits (57.4%)
- **First Seen:** 2025-11-15 13:35:47 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `requireCommandKey`
- **Type:** function
- **Appearances:** 124 commits (57.4%)
- **First Seen:** 2025-10-06 22:51:08 -0700
- **Last Seen:** 2025-11-11 20:52:29 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `sandboxTest`
- **Type:** function
- **Appearances:** 122 commits (56.5%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `trackAIPerformance`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `rotateAIsBasedOnPerformance`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `detectBlindSpots`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `guessUserDecision`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `voteOnDailyIdeas`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `createSystemSnapshot`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `rollbackToSnapshot`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

### `conductEnhancedConsensus`
- **Type:** function
- **Appearances:** 120 commits (55.6%)
- **First Seen:** 2025-11-18 14:03:15 -0800
- **Last Seen:** 2025-12-06 16:52:04 -0800
- **Status:** ✅ **CRITICAL - MUST INCLUDE**

## 📋 IMPORTANT FUNCTIONS (Should Include)

These functions appear in >25% of commits:

### `startServer`
- **Appearances:** 104 commits (48.1%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `safeFetch`
- **Appearances:** 100 commits (46.3%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `callDeepSeekBridge`
- **Appearances:** 90 commits (41.7%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleConversation`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleCommand`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleMemoryQuery`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleFileUpload`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleTaskSubmit`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleFinancialRecord`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleDashboardRequest`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleCodeGeneration`
- **Appearances:** 82 commits (38.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `trackCost`
- **Appearances:** 81 commits (37.5%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `tryLocalDeepSeek`
- **Appearances:** 80 commits (37.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `tryCloudDeepSeek`
- **Appearances:** 80 commits (37.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `tryFallbackClaude`
- **Appearances:** 80 commits (37.0%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `recordRevenueEvent`
- **Appearances:** 78 commits (36.1%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleSystemStatus`
- **Appearances:** 78 commits (36.1%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleSystemHealth`
- **Appearances:** 78 commits (36.1%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `handleSystemRepair`
- **Appearances:** 78 commits (36.1%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

### `readSpend`
- **Appearances:** 70 commits (32.4%)
- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**

## 🔄 DEPRECATED FUNCTIONS (Needs Thought)

These were common but haven't appeared in 6+ months:

## 🚀 Feature Evolution

| Feature | Introduced | Last Seen | Adoption Rate | Status |
|---------|------------|-----------|----------------|--------|
| hasCommandCenter | 2025-12-06 16:52:04 -0800 | 2025-10-02 12:11:19 -0700 | 96.8% | ✅ Active |
| hasWebSocket | 2025-12-06 16:52:04 -0800 | 2025-10-02 12:11:19 -0700 | 96.8% | ✅ Active |
| hasCostOptimization | 2025-12-06 16:52:04 -0800 | 2025-10-06 15:38:00 -0700 | 88.0% | ✅ Active |
| hasConsensus | 2025-12-06 16:52:04 -0800 | 2025-10-13 14:25:04 -0700 | 72.2% | ✅ Active |
| hasMICRO | 2025-12-06 16:52:04 -0800 | 2025-10-06 15:38:00 -0700 | 66.7% | ✅ Active |
| hasOutreach | 2025-12-06 16:52:04 -0800 | 2025-10-02 12:11:19 -0700 | 61.1% | ✅ Active |
| hasStripe | 2025-12-06 16:52:04 -0800 | 2025-10-02 12:11:19 -0700 | 47.2% | ✅ Active |
| hasSnapshot | 2025-12-06 16:52:04 -0800 | 2025-10-06 22:51:08 -0700 | 38.4% | ✅ Active |
| hasSandbox | 2025-12-06 16:52:04 -0800 | 2025-10-02 12:11:19 -0700 | 34.3% | ✅ Active |
| hasOllama | 2025-12-06 16:52:04 -0800 | 2025-10-27 15:04:17 -0700 | 31.9% | ✅ Active |
| hasIdeaGenerator | 2025-12-06 16:52:04 -0800 | 2025-10-31 15:20:46 -0700 | 31.5% | ✅ Active |
| hasSelfProgramming | 2025-12-06 16:52:04 -0800 | 2025-11-15 13:35:47 -0800 | 28.7% | ✅ Active |
| hasTwoTier | 2025-12-06 16:52:04 -0800 | 2025-10-12 21:02:12 -0700 | 13.4% | ✅ Active |
| hasKnowledgeBase | 2025-12-06 16:52:04 -0800 | 2025-12-06 13:19:26 -0800 | 10.2% | ✅ Active |
| hasLogMonitor | 2025-12-06 16:52:04 -0800 | 2025-12-06 14:56:39 -0800 | 6.9% | ✅ Active |
| hasAutoQueue | 2025-12-06 16:52:04 -0800 | 2025-12-06 15:08:29 -0800 | 6.5% | ✅ Active |
| hasUserSimulation | 2025-12-06 16:52:04 -0800 | 2025-12-06 16:16:43 -0800 | 0.9% | ✅ Active |
| hasEffectivenessTracker | 2025-12-06 16:52:04 -0800 | 2025-12-06 16:16:43 -0800 | 0.9% | ✅ Active |
| hasPostUpgrade | 2025-12-06 16:52:04 -0800 | 2025-12-06 16:52:04 -0800 | 0.5% | ✅ Active |

## 📈 Metrics Over Time

| Metric | Average | Min | Max |
|--------|---------|-----|-----|
| Lines of Code | 1980 | 13 | 6272 |
| File Size (KB) | 64.16 | 0.26 | 195.95 |
| Function Count | 44 | 0 | 112 |

## 💡 Recommendations

### ⚠️ Missing Critical Functions

These critical functions are NOT in the current server.js:

- **`initDb`** - Appeared in 248 commits
- **`requireCommandKey`** - Appeared in 124 commits

**ACTION REQUIRED:** Review and re-implement these functions.

### ✅ What Worked Well

Based on high adoption rates and recent usage:

- **`callCouncilMember`** - Stable, widely used
- **`initDb`** - Stable, widely used
- **`storeConversationMemory`** - Stable, widely used
- **`recallConversationMemory`** - Stable, widely used
- **`isFileProtected`** - Stable, widely used
- **`updateROI`** - Stable, widely used
- **`start`** - Stable, widely used
- **`callCouncilWithFailover`** - Stable, widely used
- **`initDatabase`** - Stable, widely used
- **`trackLoss`** - Stable, widely used

### ❌ What Didn't Work

Based on low adoption or early removal:

- **`broadcast`** - Low adoption (1 commits)
- **`deriveEncryptionKey`** - Low adoption (1 commits)
- **`encryptData`** - Low adoption (1 commits)
- **`decryptData`** - Low adoption (1 commits)
- **`readImprovements`** - Low adoption (1 commits)
- **`writeImprovements`** - Low adoption (1 commits)
- **`normalize`** - Low adoption (1 commits)
- **`norm`** - Low adoption (1 commits)
- **`chunk`** - Low adoption (1 commits)
- **`shouldAutoMerge`** - Low adoption (1 commits)

## 📝 Full Function List

Total: 259 unique functions

| Function | Type | Appearances | First Seen | Last Seen | Status |
|---------|------|-------------|------------|-----------|--------|
| `callCouncilMember` | function | 312 | 2025-10-22 04:19:43 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `initDb` | function | 248 | 2025-10-06 22:51:08 -0700 | 2025-11-12 11:00:34 -0800 | ✅ |
| `storeConversationMemory` | function | 222 | 2025-11-02 01:09:41 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `recallConversationMemory` | function | 222 | 2025-11-02 01:09:41 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `isFileProtected` | function | 214 | 2025-11-02 01:09:41 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `updateROI` | function | 138 | 2025-10-22 10:14:58 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `start` | function | 134 | 2025-11-01 23:16:16 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `callCouncilWithFailover` | function | 132 | 2025-11-12 11:00:34 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `initDatabase` | function | 130 | 2025-11-13 11:37:09 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `trackLoss` | function | 130 | 2025-11-13 11:37:09 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `createProposal` | function | 130 | 2025-11-13 11:37:09 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `loadROIFromDatabase` | function | 128 | 2025-11-13 14:53:10 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `generateDailyIdeas` | function | 124 | 2025-11-13 14:53:10 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `continuousSelfImprovement` | function | 124 | 2025-11-15 13:35:47 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `triggerDeployment` | function | 124 | 2025-11-15 13:35:47 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `commitToGitHub` | function | 124 | 2025-11-15 13:35:47 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `requireCommandKey` | function | 124 | 2025-10-06 22:51:08 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `sandboxTest` | function | 122 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `trackAIPerformance` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `rotateAIsBasedOnPerformance` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `detectBlindSpots` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `guessUserDecision` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `voteOnDailyIdeas` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `createSystemSnapshot` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `rollbackToSnapshot` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `conductEnhancedConsensus` | function | 120 | 2025-11-18 14:03:15 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `startServer` | function | 104 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `safeFetch` | function | 100 | 2025-10-11 19:52:17 -0700 | 2025-11-02 00:00:09 -0700 | ✅ |
| `callDeepSeekBridge` | function | 90 | 2025-11-02 02:03:03 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleConversation` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleCommand` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleMemoryQuery` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleFileUpload` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleTaskSubmit` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleFinancialRecord` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleDashboardRequest` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleCodeGeneration` | function | 82 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `trackCost` | function | 81 | 2025-10-12 12:18:53 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `tryLocalDeepSeek` | function | 80 | 2025-11-02 03:09:45 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `tryCloudDeepSeek` | function | 80 | 2025-11-02 03:09:45 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `tryFallbackClaude` | function | 80 | 2025-11-02 03:09:45 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `recordRevenueEvent` | function | 78 | 2025-12-01 23:19:29 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `handleSystemStatus` | function | 78 | 2025-11-02 01:44:39 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleSystemHealth` | function | 78 | 2025-11-02 02:52:25 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleSystemRepair` | function | 78 | 2025-11-02 02:52:25 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `readSpend` | function | 70 | 2025-10-12 12:18:53 -0700 | 2025-11-08 12:00:43 -0800 | ✅ |
| `writeSpend` | function | 70 | 2025-10-12 12:18:53 -0700 | 2025-11-08 12:00:43 -0800 | ✅ |
| `requireKey` | function | 67 | 2025-10-27 16:12:44 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `calculateCost` | function | 66 | 2025-11-12 11:00:34 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `robustSandboxTest` | function | 64 | 2025-12-03 15:37:27 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `councilEscalatedSandboxTest` | function | 64 | 2025-12-03 15:37:27 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `broadcastToAll` | function | 64 | 2025-11-13 14:53:10 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `extractFileChanges` | function | 64 | 2025-11-15 13:35:47 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `getCouncilConsensus` | function | 64 | 2025-10-22 04:19:43 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `getStripeClient` | function | 62 | 2025-12-05 13:20:16 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `isSameOrigin` | function | 62 | 2025-11-15 13:35:47 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `syncStripeRevenue` | function | 62 | 2025-12-05 13:20:16 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `sendSMS` | function | 60 | 2025-10-04 16:55:54 -0700 | 2025-12-06 16:52:04 -0800 | ✅ |
| `processWorkQueue` | function | 60 | 2025-10-22 04:44:41 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `getRequestHost` | function | 53 | 2025-11-21 14:31:50 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `executeTask` | function | 52 | 2025-10-22 09:22:55 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `assertKey` | function | 51 | 2025-10-08 13:39:04 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `broadcastToOrchestrator` | function | 50 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `extractKeyFacts` | function | 50 | 2025-11-02 00:00:09 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `sleep` | arrow | 49 | 2025-10-11 19:52:17 -0700 | 2025-11-02 00:00:09 -0700 | ✅ |
| `trackRevenue` | function | 48 | 2025-10-22 10:14:58 -0700 | 2025-11-08 12:00:43 -0800 | ✅ |
| `getApiKey` | arrow | 47 | 2025-12-01 14:18:45 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `validateEnvironment` | function | 47 | 2025-11-02 01:44:39 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleGracefulShutdown` | function | 46 | 2025-11-02 01:09:41 -0700 | 2025-11-11 20:52:29 -0800 | ✅ |
| `detectHallucinations` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `crossValidateResponses` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `validateAgainstWebSearch` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `detectDrift` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `searchWebWithGemini` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `searchWebWithGrok` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `proposeEscalationStrategy` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `persistentCouncilEscalation` | function | 44 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `ghGetFile` | function | 44 | 2025-10-23 18:50:45 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `ghPutFile` | function | 44 | 2025-10-23 18:50:45 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `getCachedResponse` | function | 42 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `getTwilioClient` | function | 42 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `makePhoneCall` | function | 42 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `initializeTwoTierSystem` | function | 42 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `crc32` | function | 41 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `packBits` | function | 41 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `unpackBits` | function | 41 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `encodeLCTP` | function | 41 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `decodeLCTP` | function | 41 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `getTodaySpend` | function | 40 | 2025-10-12 11:47:30 -0700 | 2025-10-22 04:19:43 -0700 | ✅ |
| `createReverseLookup` | function | 39 | 2025-11-03 13:24:01 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `normalizeUrl` | function | 37 | 2025-11-02 23:56:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `analyzeCostSavings` | function | 36 | 2025-12-06 14:51:46 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `checkBudget` | function | 34 | 2025-10-12 11:47:30 -0700 | 2025-10-22 04:19:43 -0700 | ✅ |
| `extractCodeFixes` | function | 32 | 2025-12-03 15:37:27 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `applyCodeFix` | function | 32 | 2025-12-03 15:37:27 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `getOverlayState` | function | 32 | 2025-10-06 22:51:08 -0700 | 2025-10-22 04:19:43 -0700 | ✅ |
| `query` | function | 32 | 2025-10-02 12:11:19 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `extractExecutableTasks` | function | 31 | 2025-11-02 00:00:09 -0700 | 2025-11-07 17:27:31 -0800 | ✅ |
| `handleAIStatus` | function | 30 | 2025-11-07 18:02:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `hashString` | function | 30 | 2025-10-22 10:14:58 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `bootstrap` | function | 30 | 2025-10-02 12:11:19 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `attemptAICall` | function | 28 | 2025-11-08 12:00:43 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `teamMicroResponse` | function | 28 | 2025-10-23 18:50:45 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `venc` | function | 26 | 2025-11-03 13:24:01 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `compressAIPrompt` | function | 25 | 2025-10-22 10:14:58 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `expandAIResponse` | function | 25 | 2025-10-22 10:14:58 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `recallMemory` | function | 24 | 2025-10-30 15:40:59 -0700 | 2025-11-14 16:42:17 -0800 | ✅ |
| `decodeMicroBody` | function | 23 | 2025-11-19 19:47:13 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `buildMicroResponse` | function | 23 | 2025-11-19 19:47:13 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `getApiKeyForProvider` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `extractKeyClaims` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `extractSolutionPattern` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `calculateAgreement` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `findContradictions` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `extractTechnicalTerms` | function | 22 | 2025-12-06 13:19:26 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `hashPrompt` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `cacheResponse` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `advancedCompress` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `advancedDecompress` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `lctpEncode` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `lctpDecode` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `optimizePrompt` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `compressPrompt` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `decompressResponse` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `selectOptimalModel` | function | 21 | 2025-12-06 13:45:49 -0800 | 2025-12-06 16:52:04 -0800 | ✅ |
| `storeMemory` | function | 20 | 2025-10-30 15:40:59 -0700 | 2025-11-14 16:42:17 -0800 | ✅ |
| `getApiKeyStatus` | function | 19 | 2025-11-07 18:02:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `finalize` | function | 18 | 2025-10-30 15:40:59 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `executeOrchBuild` | function | 18 | 2025-10-15 11:14:11 -0700 | 2025-10-22 02:43:40 -0700 | ✅ |
| `createPullRequest` | function | 18 | 2025-10-14 16:22:36 -0700 | 2025-10-17 12:04:04 -0700 | ✅ |
| `load` | function | 18 | 2025-10-02 18:16:12 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `approve` | function | 18 | 2025-10-02 18:16:12 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `councilConsensusWithDebate` | function | 16 | 2025-10-30 17:50:34 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `isProtected` | function | 16 | 2025-10-27 13:58:21 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `writeMemory` | function | 16 | 2025-10-30 15:40:59 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `requireWebhookSecret` | function | 16 | 2025-10-06 22:51:08 -0700 | 2025-10-22 04:19:43 -0700 | ✅ |
| `boldtrailRequest` | function | 16 | 2025-10-04 16:55:54 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `runDailyCouncilMeeting` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleIdeasRequest` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleCouncilVote` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleIdeaDecision` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleSandboxTest` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handlePodStatus` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `handleRunCouncilMeeting` | function | 14 | 2025-11-11 10:12:55 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `askCouncil` | function | 14 | 2025-10-30 15:40:59 -0700 | 2025-10-31 13:12:13 -0700 | ✅ |
| `searchMem` | function | 14 | 2025-10-30 15:40:59 -0700 | 2025-10-31 13:12:13 -0700 | ✅ |
| `checkHealth` | function | 14 | 2025-10-30 15:40:59 -0700 | 2025-10-31 13:12:13 -0700 | ✅ |
| `callAI` | function | 14 | 2025-10-15 11:14:11 -0700 | 2025-10-17 12:04:04 -0700 | ✅ |
| `mergePullRequest` | function | 14 | 2025-10-15 11:14:11 -0700 | 2025-10-17 12:04:04 -0700 | ✅ |
| `gh` | arrow | 14 | 2025-10-08 13:39:04 -0700 | 2025-10-14 02:03:03 -0700 | ✅ |
| `putFile` | arrow | 12 | 2025-10-08 13:39:04 -0700 | 2025-10-12 12:18:53 -0700 | ✅ |
| `createVapiAssistant` | function | 12 | 2025-10-06 15:38:00 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `conductConsensusVote` | function | 10 | 2025-11-13 11:37:09 -0800 | 2025-11-15 16:35:29 -0800 | ✅ |
| `getEnvConfig` | arrow | 10 | 2025-11-08 17:38:00 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `getApiKeys` | arrow | 10 | 2025-11-08 17:38:00 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `testAPI` | function | 10 | 2025-10-30 20:55:05 -0700 | 2025-10-31 13:12:13 -0700 | ✅ |
| `checkUnanimity` | function | 9 | 2025-10-30 17:50:34 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `getOpenAIKey` | function | 8 | 2025-11-07 16:23:20 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `getAnthropicKey` | function | 8 | 2025-11-07 16:23:20 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `getGeminiKey` | function | 8 | 2025-11-07 16:23:20 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `getGrokKey` | function | 8 | 2025-11-07 16:23:20 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `getDeepSeekKey` | function | 8 | 2025-11-07 16:23:20 -0800 | 2025-11-08 12:00:43 -0800 | ✅ |
| `ensureText` | arrow | 8 | 2025-11-04 11:50:47 -0800 | 2025-11-06 19:57:47 -0800 | ✅ |
| `throwIfBad` | arrow | 8 | 2025-11-04 11:50:47 -0800 | 2025-11-06 19:57:47 -0800 | ✅ |
| `throwIfErrorShape` | arrow | 8 | 2025-11-04 11:50:47 -0800 | 2025-11-06 19:57:47 -0800 | ✅ |
| `formatMemoryForSystem` | function | 8 | 2025-10-30 15:40:59 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `callConsensus` | function | 8 | 2025-10-31 12:35:25 -0700 | 2025-10-31 13:12:13 -0700 | ✅ |
| `calculateConsensus` | function | 7 | 2025-10-30 17:50:34 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `recordAIPerformance` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `getAIScores` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `debateProposal` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `evaluateConsequences` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `analyzeUserDecision` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `predictUserChoice` | function | 6 | 2025-11-13 11:37:09 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `CURRENT_DEEPSEEK_ENDPOINT` | arrow | 6 | 2025-11-11 15:48:44 -0800 | 2025-11-11 20:52:29 -0800 | ✅ |
| `getFallbackResponse` | function | 6 | 2025-11-07 11:51:46 -0800 | 2025-11-07 18:40:19 -0800 | ✅ |
| `callOpenAI` | function | 6 | 2025-10-14 16:22:36 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `factCheckResponse` | function | 6 | 2025-10-27 12:20:26 -0700 | 2025-10-27 12:33:58 -0700 | ✅ |
| `smartRoute` | function | 6 | 2025-10-27 12:20:26 -0700 | 2025-10-27 12:33:58 -0700 | ✅ |
| `safeBuildOperation` | function | 6 | 2025-10-12 21:02:12 -0700 | 2025-10-14 02:03:03 -0700 | ✅ |
| `readStampMs` | function | 6 | 2025-10-11 19:52:17 -0700 | 2025-10-14 02:03:03 -0700 | ✅ |
| `writeStampNow` | function | 6 | 2025-10-11 19:52:17 -0700 | 2025-10-14 02:03:03 -0700 | ✅ |
| `shouldBuild` | function | 6 | 2025-10-11 19:52:17 -0700 | 2025-10-14 02:03:03 -0700 | ✅ |
| `verifyWebhook` | function | 6 | 2025-10-06 15:38:00 -0700 | 2025-10-06 17:47:17 -0700 | ✅ |
| `extractMemoryFromMicroResponse` | function | 5 | 2025-10-31 12:35:25 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `extractMemoryFromMicroProtocol` | function | 5 | 2025-10-31 12:35:25 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `rollbackLastDeployment` | function | 4 | 2025-11-13 14:53:10 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `monitorErrorsAndRollback` | function | 4 | 2025-11-13 14:53:10 -0800 | 2025-11-14 16:42:17 -0800 | ✅ |
| `callDeepSeek` | function | 4 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `githubGetFile` | function | 4 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `githubPutFile` | function | 4 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `extractNumber` | function | 4 | 2025-10-30 17:50:34 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `extractRisks` | function | 4 | 2025-10-30 17:50:34 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `extractBlindSpots` | function | 4 | 2025-10-30 17:50:34 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `listDebates` | function | 4 | 2025-10-31 12:35:25 -0700 | 2025-10-31 12:53:07 -0700 | ✅ |
| `saveQueueToDisk` | function | 4 | 2025-10-23 19:42:35 -0700 | 2025-10-23 19:47:38 -0700 | ✅ |
| `shutdown` | function | 4 | 2025-10-23 19:42:35 -0700 | 2025-10-23 19:47:38 -0700 | ✅ |
| `executeGenerationTask` | function | 4 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:46:45 -0700 | ✅ |
| `executeAnalysisTask` | function | 4 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:46:45 -0700 | ✅ |
| `executeBuildTask` | function | 4 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:46:45 -0700 | ✅ |
| `executeOptimizationTask` | function | 4 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:46:45 -0700 | ✅ |
| `executeGenericTask` | function | 4 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:46:45 -0700 | ✅ |
| `getTotalPhase1Spend` | function | 4 | 2025-10-12 21:02:12 -0700 | 2025-10-22 04:19:43 -0700 | ✅ |
| `getFileContent` | function | 4 | 2025-10-14 16:22:36 -0700 | 2025-10-14 16:59:52 -0700 | ✅ |
| `listTodoFiles` | function | 4 | 2025-10-14 16:22:36 -0700 | 2025-10-14 16:59:52 -0700 | ✅ |
| `executeAutonomousBuild` | function | 4 | 2025-10-14 16:22:36 -0700 | 2025-10-14 16:59:52 -0700 | ✅ |
| `minsSince` | function | 4 | 2025-10-11 19:52:17 -0700 | 2025-10-12 21:02:12 -0700 | ✅ |
| `callAutopilotTick` | function | 4 | 2025-10-08 15:38:25 -0700 | 2025-10-08 17:11:07 -0700 | ✅ |
| `generateDailyReport` | function | 4 | 2025-10-08 14:58:14 -0700 | 2025-10-08 15:38:25 -0700 | ✅ |
| `processTasks` | function | 4 | 2025-10-02 12:11:19 -0700 | 2025-10-02 12:25:21 -0700 | ✅ |
| `extractKeyFactsFromNaturalLanguage` | function | 3 | 2025-10-31 13:08:08 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `extractMemWritesFromText` | function | 3 | 2025-10-30 15:40:59 -0700 | 2025-10-30 20:55:05 -0700 | ✅ |
| `trimInput` | function | 3 | 2025-10-06 15:38:00 -0700 | 2025-10-06 16:44:42 -0700 | ✅ |
| `trackCompressionStat` | function | 2 | 2025-11-13 14:53:10 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `quarterlyLossReview` | function | 2 | 2025-11-13 14:53:10 -0800 | 2025-11-13 14:53:10 -0800 | ✅ |
| `vdec` | function | 2 | 2025-11-07 16:23:20 -0800 | 2025-11-07 16:56:48 -0800 | ✅ |
| `putTLV` | function | 2 | 2025-11-07 16:23:20 -0800 | 2025-11-07 16:56:48 -0800 | ✅ |
| `getTLV` | function | 2 | 2025-11-07 16:23:20 -0800 | 2025-11-07 16:56:48 -0800 | ✅ |
| `callWithFallback` | function | 2 | 2025-11-02 00:00:09 -0700 | 2025-11-02 00:00:09 -0700 | ✅ |
| `dbQuery` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callAnthropic` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callGoogle` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callXAI` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callTogether` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callCouncilMemberWithFallback` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `logAPIError` | function | 2 | 2025-11-01 23:16:16 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `readState` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `writeState` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `revertToLastHealthy` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 23:16:16 -0700 | ✅ |
| `callClaude` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 20:47:23 -0700 | ✅ |
| `callChatGPT` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 20:47:23 -0700 | ✅ |
| `callGemini` | function | 2 | 2025-11-01 20:47:23 -0700 | 2025-11-01 20:47:23 -0700 | ✅ |
| `fastConsensusMICRO` | function | 2 | 2025-10-30 15:04:48 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `decideWithTiers` | function | 2 | 2025-10-30 15:04:48 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `activateLocalAIs` | function | 2 | 2025-10-30 14:24:05 -0700 | 2025-10-30 14:24:05 -0700 | ✅ |
| `callModel` | function | 2 | 2025-10-27 16:12:44 -0700 | 2025-10-27 16:12:44 -0700 | ✅ |
| `ghGet` | function | 2 | 2025-10-27 16:12:44 -0700 | 2025-10-27 16:12:44 -0700 | ✅ |
| `ghPut` | function | 2 | 2025-10-27 16:12:44 -0700 | 2025-10-27 16:12:44 -0700 | ✅ |
| `assessComplexity` | function | 2 | 2025-10-27 12:26:50 -0700 | 2025-10-27 12:33:58 -0700 | ✅ |
| `assessQuality` | function | 2 | 2025-10-27 12:26:50 -0700 | 2025-10-27 12:33:58 -0700 | ✅ |
| `generateDiff` | function | 2 | 2025-10-27 12:26:50 -0700 | 2025-10-27 12:33:58 -0700 | ✅ |
| `loadQueueFromDisk` | function | 2 | 2025-10-23 19:42:35 -0700 | 2025-10-23 19:47:38 -0700 | ✅ |
| `createGitHubPR` | function | 2 | 2025-10-22 09:22:55 -0700 | 2025-10-22 09:22:55 -0700 | ✅ |
| `getBudgetStatus` | function | 2 | 2025-10-17 12:04:04 -0700 | 2025-10-17 12:04:04 -0700 | ✅ |
| `startInternalBuildLoop` | function | 2 | 2025-10-16 18:16:18 -0700 | 2025-10-16 18:16:18 -0700 | ✅ |
| `wait` | arrow | 2 | 2025-10-08 14:58:14 -0700 | 2025-10-08 15:38:25 -0700 | ✅ |
| `generateLctpDelta` | function | 2 | 2025-10-06 15:38:00 -0700 | 2025-10-06 16:37:58 -0700 | ✅ |
| `normalizeTask` | function | 2 | 2025-10-06 15:38:00 -0700 | 2025-10-06 16:37:58 -0700 | ✅ |
| `safeWriteProjectFile` | function | 1 | 2025-11-06 19:57:47 -0800 | 2025-11-06 19:57:47 -0800 | ✅ |
| `broadcast` | function | 1 | 2025-11-02 00:00:09 -0700 | 2025-11-02 00:00:09 -0700 | ✅ |
| `deriveEncryptionKey` | function | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `encryptData` | function | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `decryptData` | function | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `readImprovements` | function | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `writeImprovements` | function | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `normalize` | arrow | 1 | 2025-10-31 15:20:46 -0700 | 2025-10-31 15:20:46 -0700 | ✅ |
| `norm` | arrow | 1 | 2025-10-30 15:04:48 -0700 | 2025-10-30 15:04:48 -0700 | ✅ |
| `chunk` | arrow | 1 | 2025-10-27 16:12:44 -0700 | 2025-10-27 16:12:44 -0700 | ✅ |
| `shouldAutoMerge` | function | 1 | 2025-10-20 01:55:46 -0700 | 2025-10-20 01:55:46 -0700 | ✅ |
