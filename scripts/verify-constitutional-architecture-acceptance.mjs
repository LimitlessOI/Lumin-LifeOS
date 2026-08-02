/**
 * SYNOPSIS: Acceptance script for FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001';
const RECEIPT_REL = 'products/receipts/CONSTITUTIONAL_ARCHITECTURE_V1_ACCEPTANCE.json';
const VERDICT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`;

const REQUIRED_FILES = [
  'docs/constitution/CONSTITUTIONAL_FRAMEWORK.md',
  'docs/constitution/CONSTITUTIONAL_PROCESSES.md',
  'data/constitutional-framework/REGISTRY.json',
  'data/constitutional-framework/RESEARCH_REGISTRY.json',
  'scripts/constitutional-framework.mjs',
  'builderos-reboot/MISSIONS/FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001/FOUNDER_PACKET.md',
  'builderos-reboot/MISSIONS/FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001/BLUEPRINT.json',
  'builderos-reboot/MISSIONS/FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001/ACCEPTANCE_TESTS.json',
];

const PHASE_TESTS = [
  {
    id: 'P0_framework_document',
    run: () => {
      const text = fs.readFileSync(path.join(ROOT, 'docs/constitution/CONSTITUTIONAL_FRAMEWORK.md'), 'utf8');
      for (const phrase of ['Product Governance', 'epistemic confidence', 'constitutional commitment', 'Constitutional Research Registry', 'Constitutional Manufacturing Pipeline', 'Chair is an office', 'Level 7 implementation', 'Implementation (Level 7)']) {
        if (!text.includes(phrase)) throw new Error(`framework missing: ${phrase}`);
      }
      return true;
    },
  },
  {
    id: 'P1_processes_document',
    run: () => {
      const text = fs.readFileSync(path.join(ROOT, 'docs/constitution/CONSTITUTIONAL_PROCESSES.md'), 'utf8');
      for (const phrase of ['Amendment Process', 'Promotion Process', 'Demotion Process', 'Challenge Process', 'Review Process', 'Retirement Process', 'Emergency Change', 'Dispute Resolution', 'Enforcement Process']) {
        if (!text.includes(phrase)) throw new Error(`processes missing: ${phrase}`);
      }
      return true;
    },
  },
  {
    id: 'P2_registry_and_cli',
    run: () => {
      const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/constitutional-framework/REGISTRY.json'), 'utf8'));
      if (!registry.items || registry.items.length < 100) throw new Error(`expected >=100 registry items, got ${registry.items?.length ?? 0}`);
      execSync('node --check scripts/constitutional-framework.mjs', { cwd: ROOT, stdio: 'pipe' });
      return true;
    },
  },
  {
    id: 'P2_seed_and_verify',
    run: () => {
      execSync('node scripts/constitutional-framework.mjs seed', { cwd: ROOT, stdio: 'pipe' });
      execSync('node scripts/constitutional-framework.mjs verify', { cwd: ROOT, stdio: 'pipe' });
      return true;
    },
  },
  {
    id: 'P2_preflight_wiring',
    run: () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      if (!pkg.scripts['builder:preflight']?.includes('scripts/constitutional-framework.mjs verify')) {
        throw new Error('builder:preflight does not include constitutional-framework verify');
      }
      if (!pkg.scripts['builderos:constitutional-architecture:acceptance']) {
        throw new Error('missing builderos:constitutional-architecture:acceptance npm script');
      }
      return true;
    },
  },
  {
    id: 'P3_north_star_ratification',
    run: () => {
      const ssot = fs.readFileSync(path.join(ROOT, 'docs/constitution/NORTH_STAR_SSOT.md'), 'utf8');
      for (const phrase of ['### 2.0M The Constitutional Framework', 'epistemic confidence score', 'constitutional commitment score', 'Constitutional Research Registry', 'Chair is an office, not a role', 'Product Governance (6)', 'Level 7 implementation']) {
        if (!ssot.includes(phrase)) throw new Error(`NORTH_STAR_SSOT missing: ${phrase}`);
      }
      return true;
    },
  },
  {
    id: 'P4_mission_pack',
    run: () => {
      for (const f of REQUIRED_FILES) {
        const full = path.join(ROOT, f);
        if (!fs.existsSync(full)) throw new Error(`missing ${f}`);
      }
      execSync('node --check scripts/verify-constitutional-architecture-acceptance.mjs', { cwd: ROOT, stdio: 'pipe' });
      return true;
    },
  },
  {
    id: 'P5_bp_and_registry',
    run: () => {
      const bp = JSON.parse(fs.readFileSync(path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json'), 'utf8'));
      const item = bp.items?.find((i) => i.mission_id === MISSION_ID);
      if (!item) throw new Error(`${MISSION_ID} not registered in BP_PRIORITY.json`);
      if (item.rank !== 18) throw new Error(`expected rank 18, got ${item.rank}`);
      const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/products/PRODUCT_REGISTRY.json'), 'utf8'));
      const builderos = reg.products?.find((p) => p.product_id === 'builderos');
      if (!builderos?.bp_priority_mission_ids?.includes(MISSION_ID)) {
        throw new Error(`${MISSION_ID} not in builderos bp_priority_mission_ids`);
      }
      return true;
    },
  },
];

function runTests() {
  const passed = [];
  const failed = [];
  for (const t of PHASE_TESTS) {
    try {
      t.run();
      passed.push(t.id);
    } catch (err) {
      failed.push(`${t.id}: ${err.message}`);
    }
  }
  return { passed, failed };
}

function main() {
  const testResult = runTests();
  const now = new Date().toISOString();

  const report = {
    schema: 'constitutional_architecture_v1_acceptance',
    mission_id: MISSION_ID,
    at: now,
    mode: 'phase_gate',
    ok: testResult.failed.length === 0,
    tests_passed: testResult.passed,
    tests_failed: testResult.failed,
    completed_at: now,
    production_base: 'https://lumin-web-production-e3a9.up.railway.app',
    founder_usability_pass: false,
    build_method: 'GAP-FILL',
    produced_by: 'Devin builder (FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001)',
    separation_collapsed: true,
    separation_note: 'Acceptance produced by the same session building the mission; framework and registry are deterministic governance artifacts, not independently SENTRY-verified end-to-end features.',
  };

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION_ID,
    report,
    receiptAbsPath: path.join(ROOT, RECEIPT_REL),
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: path.join(ROOT, VERDICT_REL),
    objectiveName: 'BuilderOS Constitutional Architecture',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base: report.production_base,
    buildRecord: {
      build_method: 'GAP-FILL',
      note: 'Constitutional Framework manufacturing process: authority hierarchy, Knowledge Ladder, two-score confidence model, authority registry, research registry, CLI, and NORTH_STAR_SSOT ratification.',
    },
    verdictExtra: {
      phases: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'],
      next_phase: 'Promote research registry usage and schedule first independent registry audit.',
    },
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
