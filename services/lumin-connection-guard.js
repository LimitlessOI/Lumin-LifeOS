/**
 * SYNOPSIS: Enforce single canonical Lumin connection — block legacy generative chat paths.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAW_PATH = path.join(ROOT, 'builderos-reboot/governance/LUMIN_CONNECTION_LAW.json');

export const CANONICAL_FOUNDER_MESSAGE_PATH =
  '/api/v1/lifeos/builderos/command-control/founder-interface/message';

export const CANONICAL_BUILD_JOB_PATH =
  '/api/v1/lifeos/builderos/command-control/founder-interface/build-job';

let cachedLaw = null;

export function loadLuminConnectionLaw() {
  if (cachedLaw) return cachedLaw;
  cachedLaw = JSON.parse(fs.readFileSync(LAW_PATH, 'utf8'));
  return cachedLaw;
}

export function isLuminSingleConnectionEnforced() {
  const raw = String(process.env.LUMIN_SINGLE_CONNECTION ?? '1').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(raw);
}

export function buildLegacyLuminBlockedResponse(legacyPathId = 'unknown') {
  const law = loadLuminConnectionLaw();
  return {
    ok: false,
    error: law.enforcement?.error_code || 'LUMIN_LEGACY_PATH_RETIRED',
    history_only: true,
    legacy_path_id: legacyPathId,
    canonical_path: law.canonical?.founder_message?.path || CANONICAL_FOUNDER_MESSAGE_PATH,
    canonical_runtime: law.canonical?.founder_message?.runtime || 'services/lumin-chair-orchestrator.js',
    authority: 'builderos-reboot/governance/LUMIN_CONNECTION_LAW.json',
    hint: 'Use POST founder-interface/message — Lumin IS the Chair; legacy chat/copilot send paths are retired.',
  };
}

export function luminConnectionGuardMiddleware(legacyPathId) {
  return function luminConnectionGuard(req, res, next) {
    if (!isLuminSingleConnectionEnforced()) return next();
    const law = loadLuminConnectionLaw();
    const status = Number(law.enforcement?.http_status_retired || 410);
    return res.status(status).json(buildLegacyLuminBlockedResponse(legacyPathId));
  };
}

export function auditLuminConnectionWiring() {
  const law = loadLuminConnectionLaw();
  const checks = [];

  function add(id, ok, detail) {
    checks.push({ id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail });
  }

  add('LAW-01', fs.existsSync(LAW_PATH), 'LUMIN_CONNECTION_LAW.json');
  add('LAW-02', fs.existsSync(path.join(ROOT, 'services/lumin-chair-orchestrator.js')), 'orchestrator exists');

  const appHtml = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-app.html'), 'utf8');
  add('UI-01', /USE_DIRECT_SYSTEM_CHAT\s*=\s*true/.test(appHtml), 'lifeos-app USE_DIRECT_SYSTEM_CHAT=true');
  add(
    'UI-02',
    appHtml.includes(CANONICAL_FOUNDER_MESSAGE_PATH),
    'lifeos-app uses canonical founder-interface endpoint',
  );

  const founderHtml = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-founder-interface.html'), 'utf8');
  add('UI-03', founderHtml.includes('lifeos-app.html'), 'founder-interface.html redirects to lifeos-app');

  const chatRoutes = fs.readFileSync(path.join(ROOT, 'routes/lifeos-chat-routes.js'), 'utf8');
  add(
    'RT-01',
    chatRoutes.includes('lumin-connection-guard') || chatRoutes.includes('luminConnectionGuardMiddleware'),
    'chat routes import connection guard',
  );

  const ccRoutes = fs.readFileSync(path.join(ROOT, 'routes/lifeos-builderos-command-control-routes.js'), 'utf8');
  add('RT-02', ccRoutes.includes('runLuminChairTurn'), 'command-control uses runLuminChairTurn');

  const copilotRoutes = fs.existsSync(path.join(ROOT, 'routes/lifeos-copilot-routes.js'))
    ? fs.readFileSync(path.join(ROOT, 'routes/lifeos-copilot-routes.js'), 'utf8')
    : '';
  add(
    'RT-03',
    !copilotRoutes || copilotRoutes.includes('lumin-connection-guard') || copilotRoutes.includes('luminConnectionGuardMiddleware'),
    'copilot routes guard session message',
  );

  const chatHtml = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-chat.html'), 'utf8');
  add(
    'UI-04',
    chatHtml.includes('lifeos-app.html') || chatHtml.includes('founder-interface/message'),
    'lifeos-chat.html redirects or uses canonical path',
  );

  const passed = checks.filter((c) => c.ok).length;
  return {
    schema: 'lumin_connection_wiring_audit_v1',
    generated_at: new Date().toISOString(),
    enforced: isLuminSingleConnectionEnforced(),
    canonical_path: law.canonical?.founder_message?.path,
    checks,
    ok: checks.every((c) => c.ok),
    score: checks.length ? Math.round((passed / checks.length) * 100) / 10 : 0,
  };
}
