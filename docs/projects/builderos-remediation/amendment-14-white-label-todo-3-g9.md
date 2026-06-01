import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetFilePath = 'docs/projects/builderos-remediation/amendment-14-white-label-todo-3-g9.md';

const markdownContent = `
# BuilderOS Remediation: Amendment 14 White Label - Partner Config Endpoint (Todo 3-G9)

This memo addresses the blocking task: "Partner onboarding flow not specified: no endpoint for creating a new partner config." It provides a builder-ready enhancement for the \`AMENDMENT_1