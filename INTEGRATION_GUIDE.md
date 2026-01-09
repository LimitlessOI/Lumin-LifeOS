# Enhanced Council Features - Integration Guide

This guide explains how to integrate the new Enhanced Council features into the existing LifeOS system.

## Features Added

1. **Dynamic Council Expansion** (`council/dynamic-expansion.js`)
   - Intelligently expands AI Council from 3 to 5 agents when needed
   - Contracts back to 3 when consensus is strong

2. **Enhanced Consensus Protocol** (`council/enhanced-consensus.js`)
   - 5-phase decision system with steel-manning
   - Forces agents to argue opposite positions before final vote

3. **Decision Filters** (`core/decision-filters.js`)
   - Wisdom lenses (Adam, Ford, Edison, Jesus, Buffett, Musk, Family)
   - Multi-perspective decision evaluation with veto power

4. **Enhanced FSAR Severity Gate** (`audit/fsar/enhanced-severity-gate.js`)
   - Severity = Likelihood × Damage × Reversibility
   - Hard block (≥45), Soft block (25-44), Warn (<25)

## Integration Steps

### Step 1: Verify Files Created

All feature files have been created in the correct locations:

```
council/
  ├── dynamic-expansion.js ✅
  ├── enhanced-consensus.js ✅
  └── roles/
      └── temporal_adversary.js (existing)

core/
  └── decision-filters.js ✅

audit/fsar/
  ├── fsar_runner.js (existing)
  └── enhanced-severity-gate.js ✅

routes/
  └── enhanced-council-routes.js ✅
```

### Step 2: Add to server.js

Add the following import near the top of `server.js` (around line 40-50, after other imports):

```javascript
// Enhanced Council Features
import { registerEnhancedCouncilRoutes } from './routes/enhanced-council-routes.js';
```

### Step 3: Register Routes

Add this code AFTER the existing routes are defined (around line 8750-8800, before the server.listen() call):

```javascript
// ==================== ENHANCED COUNCIL FEATURES ====================
// Dynamic expansion, enhanced consensus, decision filters, FSAR severity gate
if (tier0Council && tier1Council && modelRouter) {
  console.log('🎯 [STARTUP] Registering Enhanced Council routes...');

  // callCouncilMember function (if not already defined)
  const callCouncilMember = async (agentKey, prompt, options = {}) => {
    // Route through modelRouter or implement direct agent calling
    // This is a placeholder - adjust based on your existing callCouncilMember implementation
    return await modelRouter.route(prompt, {
      ...options,
      taskType: 'council_decision',
      riskLevel: 'high',
    });
  };

  registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey);
  console.log('✅ [STARTUP] Enhanced Council routes registered');
} else {
  console.warn('⚠️ [STARTUP] Enhanced Council features not initialized (missing tier0/tier1/router)');
}
```

### Step 4: Create Database Tables (Optional)

If you want persistent logging, create these database tables:

```sql
-- Council Expansion Log
CREATE TABLE IF NOT EXISTS council_expansion_log (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'expansion' or 'contraction'
  council_size INTEGER NOT NULL,
  decision_context JSONB,
  expanded_votes JSONB,
  reason TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consensus Protocol Log
CREATE TABLE IF NOT EXISTS consensus_protocol_log (
  id SERIAL PRIMARY KEY,
  final_decision TEXT NOT NULL,
  consensus BOOLEAN NOT NULL,
  confidence NUMERIC(3,2),
  unanimous BOOLEAN,
  escalated BOOLEAN,
  audit_trail JSONB NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision Filter Log
CREATE TABLE IF NOT EXISTS decision_filter_log (
  id SERIAL PRIMARY KEY,
  decision_text TEXT NOT NULL,
  weighted_score NUMERIC(4,2) NOT NULL,
  passes BOOLEAN NOT NULL,
  perspectives JSONB NOT NULL,
  vetoes JSONB NOT NULL,
  recommendation JSONB NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FSAR Gate Log
CREATE TABLE IF NOT EXISTS fsar_gate_log (
  id SERIAL PRIMARY KEY,
  proposal_text TEXT NOT NULL,
  severity_score INTEGER NOT NULL,
  gate_action TEXT NOT NULL, -- 'HARD_BLOCK', 'SOFT_BLOCK', 'WARN'
  can_proceed BOOLEAN NOT NULL,
  requires_human BOOLEAN NOT NULL,
  likelihood INTEGER NOT NULL,
  damage INTEGER NOT NULL,
  reversibility INTEGER NOT NULL,
  recommendation JSONB NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_expansion_log_created ON council_expansion_log(created_at);
CREATE INDEX IF NOT EXISTS idx_consensus_log_created ON consensus_protocol_log(created_at);
CREATE INDEX IF NOT EXISTS idx_filter_log_created ON decision_filter_log(created_at);
CREATE INDEX IF NOT EXISTS idx_fsar_gate_log_created ON fsar_gate_log(created_at);
```

### Step 5: Test the Features

Use the API endpoints to test each feature:

#### 1. Test Dynamic Council Expansion

```bash
curl -X POST http://localhost:8080/api/v1/council/expansion/evaluate \
  -H "x-command-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "firstRoundConsensus": false,
      "averageConfidence": 0.5,
      "stakesLevel": "high"
    }
  }'
```

#### 2. Test Enhanced Consensus Protocol

```bash
curl -X POST http://localhost:8080/api/v1/council/consensus/enhanced \
  -H "x-command-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": {
      "description": "Should we deploy the new feature to production?",
      "context": "Feature has passed tests but has high impact"
    }
  }'
```

#### 3. Test Decision Filters

```bash
curl -X POST http://localhost:8080/api/v1/decision/filters \
  -H "x-command-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": {
      "description": "Launch paid API service for $500/month",
      "context": "Will help us reach financial independence faster"
    }
  }'
```

#### 4. Test FSAR Severity Gate

```bash
curl -X POST http://localhost:8080/api/v1/audit/fsar/gate \
  -H "x-command-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": "Delete all user data older than 1 year to save database costs"
  }'
```

## API Endpoints Summary

### Dynamic Council Expansion
- `POST /api/v1/council/expansion/evaluate` - Evaluate if expansion needed
- `GET /api/v1/council/expansion/config` - Get council configuration
- `GET /api/v1/council/expansion/stats` - Get expansion statistics

### Enhanced Consensus Protocol
- `POST /api/v1/council/consensus/enhanced` - Run 5-phase consensus protocol

### Decision Filters
- `POST /api/v1/decision/filters` - Apply all wisdom lenses
- `POST /api/v1/decision/adam` - Apply Adam's lens (founder perspective)
- `GET /api/v1/decision/filters/config` - Get lens configuration
- `GET /api/v1/decision/filters/stats` - Get filter statistics

### FSAR Severity Gate
- `POST /api/v1/audit/fsar/gate` - Run enhanced FSAR evaluation
- `GET /api/v1/audit/fsar/gate/config` - Get gate configuration
- `GET /api/v1/audit/fsar/gate/stats` - Get gate statistics

## Notes

- All features are ADDITIONS to the existing system - nothing was removed or replaced
- Features integrate with the existing Two-Tier Council (Tier0 + Tier1)
- Database tables are optional - features will work without them (just no persistence)
- All routes require authentication via `x-command-key` header

## Rollback

If you need to rollback these features:

1. Remove the import from server.js
2. Remove the route registration code from server.js
3. Optionally drop the database tables

The existing system will continue to work normally.

## Status

✅ All 4 features implemented and ready for integration
✅ Routes module created
✅ Integration instructions provided
⏳ Awaiting server.js integration
⏳ Awaiting database table creation (optional)
⏳ Awaiting testing
