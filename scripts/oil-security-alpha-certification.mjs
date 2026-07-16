/**
 * SYNOPSIS: Exports runAlphaCertification — scripts/oil-security-alpha-certification.mjs.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
[
  {
    "old_string": "export function runAlphaCertification() {\n  const command = '/usr/bin/node --input-type=module -e \"import('file:///home/ubuntu/repos/Lumin-LifeOS-worktree/scripts/.factory-import-check-')\"';\n  \n  exec(command, (error, stdout, stderr) => {\n    if (error) {\n      console.error(`Error executing command: ${error.message}`);\n      return;\n    }\n    if (stderr) {\n      console.error(`Error: ${stderr}`);\n      return;\n    }\n    console.log(`Output: ${stdout}`);\n  });\n}",
    "new_string": "export function runAlphaCertification() {\n  const command = '/usr/bin/node --input-type=module -e \"import('file:///home/ubuntu/repos/Lumin-LifeOS-worktree/scripts/.factory-import-check-')\"';\n  \n  exec(command, (error, stdout, stderr) => {\n    if (error) {\n      console.error(`Error executing command: ${error.message}`);\n      return;\n    }\n    if (stderr) {\n      console.error(`Error: ${stderr}`);\n      return;\n    }\n    if (!stdout.includes('Stage 1 checklist')) {\n      console.error('Error: Stage 1 checklist not completed.');\n      return;\n    }\n    console.log(`Output: ${stdout}`);\n  });\n}"
  }
]
