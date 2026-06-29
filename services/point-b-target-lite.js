/**
 * SYNOPSIS: Read POINT_B_TARGET.json without factory-staging boot dependency.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';

const TARGET_PATH = path.join(REPO_ROOT, 'builderos-reboot/POINT_B_TARGET.json');

export function loadPointBTarget() {
  if (!fs.existsSync(TARGET_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(TARGET_PATH, 'utf8'));
    return data?.target || null;
  } catch {
    return null;
  }
}
