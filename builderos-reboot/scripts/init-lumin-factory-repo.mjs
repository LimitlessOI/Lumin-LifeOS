#!/usr/bin/env node
/**
 * SYNOPSIS: Initialize lumin-factory/ as git-ready standalone repo from bundle. Initialize lumin-factory/ as git-ready standalone repo from bundle. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET = path.join(REPO_ROOT, 'lumin-factory');

spawnSync(process.execPath, ['builderos-reboot/scripts/build-lumin-factory-bundle.mjs'], { cwd: REPO_ROOT, stdio: 'inherit' });

if (fs.existsSync(TARGET)) fs.rmSync(TARGET, { recursive: true, force: true });
fs.cpSync(path.join(REPO_ROOT, 'lumin-factory-bundle'), TARGET, { recursive: true });

const rootPkg = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/CONTENT/lumin-factory-root-package.json');
const rootReadme = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/CONTENT/lumin-factory-root-README.md');
if (fs.existsSync(rootPkg)) fs.copyFileSync(rootPkg, path.join(TARGET, 'package.json'));
if (fs.existsSync(rootReadme)) fs.writeFileSync(path.join(TARGET, 'README.md'), fs.readFileSync(rootReadme, 'utf8'));

fs.writeFileSync(path.join(TARGET, '.gitignore'), 'node_modules/\nfactory-staging/node_modules/\nfactory-staging/data/\n.DS_Store\n', 'utf8');

const manifest = {
  repo_init_id: 'LUMIN-FACTORY-INIT-001',
  created_at: new Date().toISOString(),
  path: 'lumin-factory/',
  git_ready: true,
  push_required: 'Adam creates GitHub repo and pushes — not automated without credentials',
};
fs.writeFileSync(path.join(TARGET, 'REPO_INIT_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (!fs.existsSync(path.join(TARGET, '.git'))) {
  const gitInit = spawnSync('git', ['init'], { cwd: TARGET, encoding: 'utf8' });
  if (gitInit.status !== 0) {
    console.warn('git init failed (non-fatal):', gitInit.stderr || gitInit.stdout);
  } else {
    console.log(`git init OK in ${TARGET}`);
  }
}

console.log(`Initialized ${TARGET} (git-ready — create GitHub repo Lumin-Factory and push)`);
