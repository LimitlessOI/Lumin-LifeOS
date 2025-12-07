#!/bin/bash
# Pre-commit check script
# Run syntax check and duplicate declaration check before committing

echo "🔍 Running pre-commit checks..."

# Check syntax
echo "  Checking syntax..."
if ! node --check server.js > /dev/null 2>&1; then
  echo "❌ Syntax errors found! Run: node --check server.js"
  exit 1
fi

# Check for duplicates
echo "  Checking for duplicate declarations..."
if ! node scripts/check-duplicates.js > /dev/null 2>&1; then
  echo "❌ Duplicate declarations found!"
  node scripts/check-duplicates.js
  exit 1
fi

echo "✅ All checks passed!"
exit 0
