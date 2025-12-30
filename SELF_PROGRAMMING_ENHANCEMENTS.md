# 🚀 Self-Programming Capability Enhancements

## Overview

The LifeOS self-programming system has been enhanced with four critical capabilities that enable full autonomous programming:

1. **Codebase Context Reader** - Reads existing files before modifying them
2. **Dependency Manager** - Auto-installs missing dependencies
3. **Error Recovery System** - Retries with automatic fixes
4. **Migration Generator** - Auto-generates database migrations

---

## ✅ What Was Built

### 1. `core/codebase-reader.js`
**Purpose:** Reads existing code files to provide context for AI code generation.

**Features:**
- Caches file reads for performance
- Identifies related files via import analysis
- Builds context objects for AI prompts
- Infers relevant files from instruction keywords

**Usage:**
```javascript
import { codebaseReader } from './core/codebase-reader.js';

// Read a file
const content = await codebaseReader.readFile('server.js');

// Get related files
const related = await codebaseReader.getRelatedFiles('routes/index.js');

// Build context for multiple files
const context = await codebaseReader.buildContext(['server.js', 'routes/index.js']);
```

---

### 2. `core/dependency-manager.js`
**Purpose:** Automatically detects and installs missing npm packages from code.

**Features:**
- Extracts imports from code (ES6 and CommonJS)
- Checks package.json for existing dependencies
- Auto-installs missing packages via `npm install`
- Handles scoped packages (@org/package)

**Usage:**
```javascript
import { dependencyManager } from './core/dependency-manager.js';

// Extract imports from code
const imports = await dependencyManager.extractImports(code);

// Ensure all dependencies are installed
const result = await dependencyManager.ensureDependencies(code);
// Returns: { installed: ['lodash', 'express'], skipped: ['fs'], total: 3 }
```

---

### 3. `core/error-recovery.js`
**Purpose:** Retries failed operations with automatic fixes.

**Features:**
- Retries operations up to N times (default: 3)
- Automatic fixes for common error patterns:
  - Missing modules → auto-install
  - Undefined variables → AI-generated fixes
  - Syntax errors → validation
  - Database errors → migration generation
  - Port conflicts → kill process
- Error history tracking

**Usage:**
```javascript
import ErrorRecovery from './core/error-recovery.js';

const errorRecovery = new ErrorRecovery(3, callCouncilMember);

const result = await errorRecovery.withRetry(async () => {
  // Your operation that might fail
  return await someOperation();
}, { context: 'additional info' });

if (result.success) {
  console.log('Operation succeeded after', result.attempts, 'attempts');
} else {
  console.error('Operation failed:', result.error);
}
```

---

### 4. `core/migration-generator.js`
**Purpose:** Auto-generates database migrations from code analysis.

**Features:**
- Detects SQL queries in code
- Identifies table references (FROM, INTO, UPDATE, JOIN)
- Generates CREATE TABLE statements
- Creates indexes and triggers
- Timestamped migration files

**Usage:**
```javascript
import { migrationGenerator } from './core/migration-generator.js';

// Detect schema needs from code
const needs = await migrationGenerator.detectSchemaNeeds(code);
// Returns: { tables: ['users', 'posts'], columns: [...], indexes: [...] }

// Generate migration
const migration = await migrationGenerator.generateMigration(needs, 'add_user_tables');
// Returns: { filename: '1234567890_add_user_tables.sql', filepath: '...', sql: '...' }
```

---

## 🔧 Integration with `handleSelfProgramming`

The `handleSelfProgramming` function in `server.js` has been enhanced to use all four modules:

### Enhanced Flow:

1. **Load Modules** (with graceful fallback)
   ```javascript
   const codebaseReader = await import('./core/codebase-reader.js');
   const dependencyManager = await import('./core/dependency-manager.js');
   // ... etc
   ```

2. **Read Existing Context**
   - Identifies files that will be modified
   - Reads existing code from those files
   - Includes context in AI prompt

3. **Generate Code with Context**
   - AI receives existing code context
   - Generates code that integrates properly
   - Follows existing patterns

4. **Install Dependencies**
   - Extracts imports from generated code
   - Checks package.json
   - Auto-installs missing packages

5. **Generate Migrations** (if needed)
   - Detects database schema needs
   - Generates migration files
   - Creates tables, indexes, triggers

6. **Write Files with Error Recovery**
   - Wraps file writing in retry logic
   - Auto-fixes common errors
   - Clears cache after modifications

---

## 📊 Enhanced Response Format

The `handleSelfProgramming` function now returns additional information:

```javascript
{
  ok: true,
  filesModified: ['server.js', 'routes/index.js'],
  taskId: 'task_1234567890',
  snapshotId: 'snapshot_123',
  deployed: false,
  results: [...],
  
  // NEW FIELDS:
  migrationGenerated: {
    filename: '1234567890_auto_add_endpoint.sql',
    filepath: '/path/to/migrations/...'
  },
  dependenciesInstalled: true,
  contextFilesRead: 3
}
```

---

## 🧪 Testing

### Test Case 1: Add New Endpoint
```javascript
POST /api/v1/system/self-program
{
  "instruction": "Add a new endpoint /api/v1/test that returns 'hello'",
  "autoDeploy": false
}
```

**Expected Behavior:**
1. ✅ Reads `server.js` for context
2. ✅ Generates code that integrates with existing routes
3. ✅ Installs any missing dependencies
4. ✅ Writes file with error recovery
5. ✅ Returns success with file path

### Test Case 2: Use External Library
```javascript
{
  "instruction": "Create a new utility function that uses lodash to sort an array"
}
```

**Expected Behavior:**
1. ✅ Generates code with `import _ from 'lodash'`
2. ✅ Detects lodash is not in package.json
3. ✅ Auto-installs lodash via `npm install lodash`
4. ✅ Code works without manual intervention

### Test Case 3: Database Table
```javascript
{
  "instruction": "Add a new database table for user_preferences with columns: user_id, theme, notifications"
}
```

**Expected Behavior:**
1. ✅ Detects database needs from code
2. ✅ Generates migration file in `migrations/`
3. ✅ Creates table with proper schema
4. ✅ Adds indexes and triggers

---

## 🎯 Key Improvements

### Before:
- ❌ Generated code in isolation
- ❌ Didn't read existing files
- ❌ Manual dependency installation
- ❌ No error recovery
- ❌ Manual migration creation

### After:
- ✅ Reads existing code context
- ✅ Integrates with existing patterns
- ✅ Auto-installs dependencies
- ✅ Retries with auto-fixes
- ✅ Auto-generates migrations

---

## 🔍 Error Handling

The system now handles errors gracefully:

1. **Module Loading Errors**
   - Falls back to basic self-programming if modules can't load
   - Logs warnings but continues

2. **Context Reading Errors**
   - Continues without context if files can't be read
   - Logs warnings

3. **Dependency Installation Errors**
   - Logs error but continues
   - Code may fail at runtime, but system doesn't crash

4. **Migration Generation Errors**
   - Logs warning if migration fails
   - Continues with code generation

5. **File Writing Errors**
   - Retries up to 3 times with auto-fixes
   - Falls back to direct execution if error recovery unavailable

---

## 📝 Notes

- All modules use **dynamic imports** for graceful degradation
- Modules are **optional** - system works without them (with reduced capabilities)
- **Caching** is used for performance (codebase-reader)
- **Error history** is tracked for debugging (error-recovery)

---

## 🚀 Next Steps

To fully test the system:

1. **Test Basic Self-Programming**
   ```bash
   curl -X POST http://localhost:8080/api/v1/system/self-program?key=YOUR_KEY \
     -H "Content-Type: application/json" \
     -d '{"instruction": "Add endpoint /api/v1/test"}'
   ```

2. **Test Dependency Installation**
   ```bash
   curl -X POST http://localhost:8080/api/v1/system/self-program?key=YOUR_KEY \
     -H "Content-Type: application/json" \
     -d '{"instruction": "Create function using lodash"}'
   ```

3. **Test Database Migration**
   ```bash
   curl -X POST http://localhost:8080/api/v1/system/self-program?key=YOUR_KEY \
     -H "Content-Type: application/json" \
     -d '{"instruction": "Add user_preferences table"}'
   ```

---

## ✅ Status

All modules created and integrated. System is ready for testing!

**Files Created:**
- ✅ `core/codebase-reader.js`
- ✅ `core/dependency-manager.js`
- ✅ `core/error-recovery.js`
- ✅ `core/migration-generator.js`

**Files Modified:**
- ✅ `server.js` - Enhanced `handleSelfProgramming` function

**Syntax Checks:**
- ✅ All files pass `node --check`
