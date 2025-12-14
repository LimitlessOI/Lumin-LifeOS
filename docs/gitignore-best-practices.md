```markdown
# .gitignore Best Practices

## Overview
This document provides guidance on managing files and directories in a Node.js/React project.

## Key Patterns
- `node_modules/`: Ignore installed packages.
- `build/`, `dist/`: Ignore generated build artifacts.
- `*.log`, `*.env`: Ignore logs and environment files.
- `.DS_Store`: Ignore MacOS system files.
- `*.tmp`: Ignore temporary files.

## Tips
- Always regenerate build artifacts in CI/CD environments.
- Customize patterns for specific project needs.
```