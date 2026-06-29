#!/usr/bin/env node
/**
 * SYNOPSIS: Build LifeOS Android APK (debug, sideload-ready) and copy to public/downloads/.
 * Build LifeOS Android APK (debug, sideload-ready) and copy to public/downloads/.
 * Requires: Android Studio / SDK, `npm run mobile:add:android` once.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = path.join(ROOT, 'android');
const OUT_APK = path.join(ROOT, 'public', 'downloads', 'lifeos.apk');
const RELEASE_JSON = path.join(ROOT, 'public', 'downloads', 'release.json');

function run(cmd, opts = {}) {
  console.log('→', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || ROOT, env: { ...process.env, ...opts.env } });
}

function main() {
  if (!fs.existsSync(ANDROID)) {
    console.log('No android/ folder — running cap add android…');
    run('npx cap add android');
  }
  run('npx cap sync android');

  const gradlew = process.platform === 'win32'
    ? path.join(ANDROID, 'gradlew.bat')
    : path.join(ANDROID, 'gradlew');
  if (!fs.existsSync(gradlew)) {
    console.error('HALT: gradlew missing. Install Android Studio and open the android project once.');
    process.exit(1);
  }

  run(`${process.platform === 'win32' ? 'gradlew.bat' : './gradlew'} assembleDebug`, { cwd: ANDROID });

  const debugApk = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(debugApk)) {
    console.error('HALT: app-debug.apk not found at', debugApk);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT_APK), { recursive: true });
  fs.copyFileSync(debugApk, OUT_APK);
  console.log('✅ Copied to', OUT_APK);

  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '1.0.0';
  const release = JSON.parse(fs.readFileSync(RELEASE_JSON, 'utf8'));
  release.updated_at = new Date().toISOString();
  release.android.available = true;
  release.android.version = version;
  release.android.build = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(RELEASE_JSON, JSON.stringify(release, null, 2) + '\n');
  console.log('✅ Updated release.json — deploy to Railway then open /install');
}

main();
