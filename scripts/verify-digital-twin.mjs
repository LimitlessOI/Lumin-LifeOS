/**
 * SYNOPSIS: Verify digital twin facets exist and inject block builds.
 * Usage: node scripts/verify-digital-twin.mjs [userHandle]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLuminContextLoader, CORE_KEYS } from '../services/lumin-context-loader.js';

const userHandle = process.argv[2] || 'adam';
const loader = createLuminContextLoader({});
const twin = await loader.loadFullTwin(userHandle);
const inject = await loader.getTwinInjectBlock(userHandle);

const missingCore = CORE_KEYS.filter((k) => !twin[k]);
const requiredForActive = ['_meta', 'personal', 'goal', 'operating_system', 'decision_identity'];
const missingRequired = requiredForActive.filter((k) => !twin[k]);

const report = {
  ok: missingRequired.length === 0 && inject.length > 200,
  userHandle,
  status: twin._meta?.status || null,
  present_facets: twin.present_facets,
  module_keys: twin.module_keys,
  missing_core: missingCore,
  missing_required: missingRequired,
  inject_chars: inject.length,
  inject_preview: inject.slice(0, 400),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);