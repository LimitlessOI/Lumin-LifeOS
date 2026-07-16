/**
 * SYNOPSIS: Exports triggerRunMemoryImport — scripts/runMemoryImport.mjs.
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
[
  {
    "op": "add",
    "path": "/scripts~1runMemoryImport.mjs",
    "value": "\nexport function triggerRunMemoryImport() {\n  console.log('Operator run-memory-import triggered for handling large exports.');\n  runMemoryImport();\n}\n"
  }
]
