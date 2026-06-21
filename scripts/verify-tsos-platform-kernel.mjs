#!/usr/bin/env node
/**
 * SYNOPSIS: Verify TSOS Platform Kernel Phase 0 wiring.
 * Verify TSOS Platform Kernel Phase 0 wiring.
 * @ssot docs/TSOS_PLATFORM_KERNEL.md
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const checks = [];

function add(name, pass, detail) {
  checks.push({ name, pass, detail });
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

async function main() {
  add('kernel_service_exists', fs.existsSync(path.join(root, 'services/tsos-platform-kernel.js')), 'services/tsos-platform-kernel.js');
  add('kernel_routes_exists', fs.existsSync(path.join(root, 'routes/tsos-platform-kernel-routes.js')), 'routes/tsos-platform-kernel-routes.js');

  const server = read('server.js');
  add('server_imports_kernel', server.includes('createTSOSPlatformKernel'), 'createTSOSPlatformKernel import');
  add('server_wraps_council', server.includes('wrapCouncilMember(rawCallCouncilMember)'), 'council wrap');
  add('server_passes_platformKernel', server.includes('platformKernel'), 'deps.platformKernel');

  const routes = read('startup/register-runtime-routes.js');
  add('ocl_import_fixed', routes.includes('createOperatorConsumptionLedgerRoutes'), 'OCL import present');
  add('kernel_routes_mounted', routes.includes('/api/v1/kernel'), 'kernel route mount');
  add('builder_gets_platformKernel', routes.includes('platformKernel: deps.platformKernel'), 'builder deps');

  const builder = read('routes/lifeos-council-builder-routes.js');
  add('build_wrapped', builder.includes('platformKernel.wrapBuild'), 'wrapBuild on /build');

  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;

  if (baseUrl && key) {
    for (const p of ['/api/v1/kernel/health', '/api/v1/kernel/verify', '/api/v1/tokens/unified/health', '/api/v1/builderos/control-plane/health']) {
      try {
        const res = await fetch(`${baseUrl}${p}`, { headers: { 'x-command-key': key } });
        add(`route_${p}`, res.status === 200, `HTTP ${res.status}`);
      } catch (err) {
        add(`route_${p}`, false, err.message);
      }
    }
  } else {
    add('deploy_route_probe', false, 'PUBLIC_BASE_URL or command key missing — skipped live route probe');
  }

  const failed = checks.filter((c) => !c.pass);
  const status = failed.length === 0 ? 'PASS' : failed.length < checks.length ? 'PARTIAL' : 'FAIL';

  const out = { status, checks, failed: failed.map((f) => f.name), next_action: failed.length ? 'fix failed checks' : 'none' };
  console.log(JSON.stringify(out, null, 2));
  process.exit(status === 'PASS' ? 0 : status === 'PARTIAL' ? 1 : 2);
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'FAIL', error: err.message }, null, 2));
  process.exit(2);
});
