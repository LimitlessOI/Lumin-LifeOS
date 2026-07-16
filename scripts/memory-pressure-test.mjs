[
  {
    "old_string": "/**\n * SYNOPSIS: Exports verifyLiveModePressureTest — scripts/memory-pressure-test.mjs.\n * @ssot docs/products/memory-system/PRODUCT_HOME.md */\nexport async function verifyLiveModePressureTest() {",
    "new_string": "/**\n * @fileoverview Verifies the memory pressure test in live mode.\n * @ssot docs/products/memory-system/PRODUCT_HOME.md\n */\n\nimport { deployBranch } from '../utils/railway-deploy.mjs';\nimport { getNeonState } from '../utils/neon-api.mjs';\nimport { runPressureTest, verifyResults } from './pressure-test-runner.mjs';\n\nexport async function verifyLiveModePressureTest() {"
  }
]
