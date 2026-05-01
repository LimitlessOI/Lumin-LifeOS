#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

const child = spawn(
  process.execPath,
  ['scripts/verify-project.mjs', '--project', 'site_builder', ...args],
  {
    stdio: 'inherit',
  },
);

child.on('close', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
