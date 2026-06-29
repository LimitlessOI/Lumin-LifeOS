#!/usr/bin/env node
/**
 * SYNOPSIS: iOS ad-hoc IPA + OTA manifest for direct install (no App Store).
 * iOS ad-hoc IPA + OTA manifest for direct install (no App Store).
 * Requires: Mac, Xcode, Apple Developer account, devices registered in profile.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IOS = path.join(ROOT, 'ios');
const OUT_IPA = path.join(ROOT, 'public', 'downloads', 'lifeos.ipa');
const OUT_PLIST = path.join(ROOT, 'public', 'downloads', 'lifeos-ios.plist');
const RELEASE_JSON = path.join(ROOT, 'public', 'downloads', 'release.json');
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app';

function run(cmd, opts = {}) {
  console.log('→', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || ROOT, shell: true });
}

function main() {
  if (process.platform !== 'darwin') {
    console.error('HALT: iOS builds require macOS + Xcode.');
    process.exit(1);
  }
  if (!fs.existsSync(IOS)) {
    console.log('No ios/ folder — run: npm run mobile:add:ios');
    run('npx cap add ios');
  }
  run('npx cap sync ios');

  console.log(`
═══════════════════════════════════════════════════════════════
 iOS ad-hoc install (no App Store)
═══════════════════════════════════════════════════════════════
1. Open Xcode: npm run mobile:ios
2. Signing & Capabilities → your Team → Ad Hoc provisioning
3. Register each iPhone UDID in Apple Developer → Devices
4. Product → Archive → Distribute App → Ad Hoc → export IPA
5. Copy exported .ipa to: public/downloads/lifeos.ipa
6. Run this script again with LIFEOS_IPA=/path/to/export.ipa

Or set LIFEOS_IPA to skip manual copy:
  LIFEOS_IPA=~/Desktop/LifeOS.ipa npm run mobile:build:ios:adhoc
`);

  const ipaSrc = process.env.LIFEOS_IPA;
  if (!ipaSrc || !fs.existsSync(ipaSrc)) {
    console.log('No LIFEOS_IPA set — manual Xcode export required (see above).');
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(OUT_IPA), { recursive: true });
  fs.copyFileSync(ipaSrc, OUT_IPA);
  console.log('✅ Copied IPA to', OUT_IPA);

  const plist = fs.readFileSync(path.join(ROOT, 'mobile', 'ios', 'ota', 'manifest.plist.template'), 'utf8')
    .replace(/https:\/\/robust-magic-production\.up\.railway\.app/g, BASE_URL.replace(/\/$/, ''));
  fs.writeFileSync(OUT_PLIST, plist);

  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '1.0.0';
  const release = JSON.parse(fs.readFileSync(RELEASE_JSON, 'utf8'));
  release.updated_at = new Date().toISOString();
  release.ios.available = true;
  release.ios.version = version;
  release.ios.build = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(RELEASE_JSON, JSON.stringify(release, null, 2) + '\n');

  console.log(`
✅ OTA manifest: ${OUT_PLIST}
✅ Install URL for registered iPhones:
   ${BASE_URL.replace(/\/$/, '')}/install

Users tap "Install LifeOS on iPhone" (itms-services link).
`);
}

main();
