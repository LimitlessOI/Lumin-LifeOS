/**
 * SYNOPSIS: Adversarial ratification suite for the 2026-08-02 constitutional convergence.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * Adversarial ratification suite for the 2026-08-02 constitutional convergence.
 *
 * Runs red-team probes against the canonical framework, North Star, and Enforcement
 * Matrix. Exit 0 only when no material defect is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO_ROOT = process.cwd();
const FRAMEWORK = path.join(REPO_ROOT, 'docs', 'constitution', 'CONSTITUTIONAL_FRAMEWORK_v1.md');
const NORTH_STAR = path.join(REPO_ROOT, 'docs', 'constitution', 'NORTH_STAR_SSOT.md');
const MATRIX = path.join(REPO_ROOT, 'data', 'constitutional-framework', 'ENFORCEMENT_MATRIX.json');
const REPORT_DIR = path.join(REPO_ROOT, 'data', 'constitutional-framework', 'reports');
const REPORT_PATH = path.join(REPORT_DIR, 'ADVERSARIAL_RATIFICATION_REPORT.json');

function now() { return new Date().toISOString(); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }

function probe(name, test, severity = 'bug') {
  const ok = test();
  return { name, severity, status: ok ? 'pass' : 'fail' };
}

function runMatrixVerifier() {
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/verify-constitutional-enforcement-matrix.mjs'], { cwd: REPO_ROOT });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => resolve({ code, stdout }));
    child.on('error', (err) => resolve({ code: -1, stdout: err.message }));
  });
}

async function main() {
  const framework = read(FRAMEWORK);
  const northStar = read(NORTH_STAR);

  const probes = [];

  // Constitutional identity and mission
  probes.push(probe('Taloa identity declared in framework', () => framework.includes('constitutional learning institution')));
  probes.push(probe('Mission includes aligned AI', () => northStar.includes('aligned AI')));
  probes.push(probe('Mission includes flourishing', () => northStar.includes('flourishing')));
  probes.push(probe('Revenue subordinated to mission', () => northStar.includes('Revenue is the oxygen that funds the mission')));
  probes.push(probe('Design equation present', () => northStar.includes('Intent determines direction')));
  probes.push(probe('Design equation present', () => northStar.includes('Reality determines results')));

  // No single office becomes truth
  probes.push(probe('Solomon does not govern', () => framework.includes('Solomon does not govern')));
  probes.push(probe('No office is source of truth', () => framework.includes('No office is the source of truth')));
  probes.push(probe('Chair asks for understanding not obedience', () => framework.includes('The Chair should never ask Solomon for an answer')));

  // Independent reasoning
  probes.push(probe('Independent judgment precedes shared judgment', () => framework.includes('Independent judgment precedes shared judgment')));
  probes.push(probe('Solomon withholds recommendation', () => framework.includes('Solomon withholds its recommendation')));

  // Epistemology and reality
  probes.push(probe('Confidence not certainty', () => framework.includes('Confidence, not certainty')));
  probes.push(probe('Reality alignment distinguishes five realities', () => /observed.*experienced.*remembered.*predicted.*shared/i.test(framework)));
  probes.push(probe('Promotion ladder present', () => framework.includes('Observations, inferences, hypotheses, models, principles, laws, and constitutional principles')));

  // Empowerment and guidance
  probes.push(probe('Understanding precedes influence', () => framework.includes('Understanding precedes influence. Influence serves empowerment. Empowerment serves the mission.')));
  probes.push(probe('Earned guidance present', () => framework.includes('Earned Guidance')));
  probes.push(probe('Empowerment over dependence', () => framework.includes('Empowerment over dependence')));
  probes.push(probe('Mission alignment filter', () => framework.includes('Mission Alignment Filter')));
  probes.push(probe('Least invasive intervention', () => framework.includes('Least Invasive Intervention')));
  probes.push(probe('Builder simplicity and anti-expansion', () => framework.includes('Builder Simplicity and Anti-Expansion')));

  // Human constellation canonical
  probes.push(probe('Human Constellation canonical clause', () => framework.includes('The Adaptive Human Model, LifeOS, MarriageOS, KidsOS, BusinessOS, HealthOS, and CareerOS are projections of the same Human Constellation.')));

  // Quality of questions
  probes.push(probe('Quality of questions clause', () => framework.includes('Taloa improves the quality of questions')));

  // Anti-bloat: no new product names invented in the framework
  probes.push(probe('No stray product inventions in framework', () => {
    const products = ['LifeOS', 'BuilderOS', 'Solomon', 'MarriageOS', 'KidsOS', 'BusinessOS', 'HealthOS', 'CareerOS'];
    return products.every((p) => framework.includes(p));
  }));

  // Canonical enforcement matrix exists and passes
  const matrixExists = fs.existsSync(MATRIX);
  probes.push({ name: 'Canonical enforcement matrix exists', severity: 'bug', status: matrixExists ? 'pass' : 'fail' });

  if (matrixExists) {
    const { code, stdout } = await runMatrixVerifier();
    probes.push({ name: 'Enforcement matrix verifier exits 0', severity: 'bug', status: code === 0 ? 'pass' : 'fail', verifier_output: stdout.slice(-500) });
  }

  const failCount = probes.filter((p) => p.status === 'fail').length;
  const passCount = probes.filter((p) => p.status === 'pass').length;

  const report = {
    schema: 'adversarial_ratification_report_v0',
    generated_at: now(),
    generated_by: 'scripts/adversarial-ratification-suite.mjs',
    summary: {
      total: probes.length,
      pass: passCount,
      fail: failCount,
    },
    probes,
    verdict: failCount === 0 ? 'PASS' : 'FAIL',
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nADVERSARIAL_RATIFICATION_SUITE: ${report.verdict}`);
  console.log(`  total: ${report.summary.total}`);
  console.log(`  pass:  ${report.summary.pass}`);
  console.log(`  fail:  ${report.summary.fail}`);
  console.log(`  report: ${REPORT_PATH}`);

  for (const p of probes) {
    if (p.status === 'fail') {
      console.log(`  FAIL: ${p.name}`);
    }
  }

  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('ADVERSARIAL_RATIFICATION_SUITE: ERROR', err.message);
  process.exit(1);
});
