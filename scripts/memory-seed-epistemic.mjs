/**
 * SYNOPSIS: Script — Memory Seed Epistemic.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
[
  {
    "old_string": "function seedEpistemicFacts() {\n  exec('npm run memory:seed', (error, stdout, stderr) => {\n    if (error) {\n      console.error(`Error executing memory seed: ${error.message}`);\n      return;\n    }\n    if (stderr) {\n      console.error(`Stderr from memory seed: ${stderr}`);\n      return;\n    }\n    console.log(`Memory seed output: ${stdout}`);\n  });\n}",
    "new_string": "function seedEpistemicFacts() {\n  exec('npm run memory:seed', (error, stdout, stderr) => {\n    if (error) {\n      console.error(`Error executing memory seed: ${error.message}`);\n      return;\n    }\n    if (stderr) {\n      console.error(`Stderr from memory seed: ${stderr}`);\n      return;\n    }\n    console.log(`Memory seed output: ${stdout}`);\n  });\n}"
  }
]
