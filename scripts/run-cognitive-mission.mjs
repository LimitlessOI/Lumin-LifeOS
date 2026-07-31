/**
 * SYNOPSIS: CLI runner for the BuilderOS Cognitive Chair.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import {
  composeReasoning,
  formatTranscript,
  loadLensRegistry,
  listLenses,
} from '../services/cognitive-chair.mjs';
import { runCognitiveStep, formatBuildPlan } from '../factory-staging/factory-core/builder/cognitive-step-runner.mjs';
import { createCouncilService } from '../services/council-service.js';
import { createCouncilMembers, COUNCIL_ALIAS_MAP } from '../config/council-members.js';
import { createDbPool } from '../services/db.js';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function createCallModel() {
  const validatedDatabaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  if (!validatedDatabaseUrl) {
    throw new Error('DATABASE_URL or NEON_DATABASE_URL is required for --execute mode.');
  }

  const pool = createDbPool({
    validatedDatabaseUrl,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
  });

  const members = createCouncilMembers({
    DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED,
  });

  const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || process.env.BUILDEROS_MAX_DAILY_SPEND || 0);

  const service = createCouncilService({
    pool,
    COUNCIL_MEMBERS: members,
    COUNCIL_ALIAS_MAP,
    MAX_DAILY_SPEND,
    COST_SHUTDOWN_THRESHOLD: 0,
    NODE_ENV: process.env.NODE_ENV || 'production',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'local',
    COUNCIL_TIMEOUT_MS: 60000,
    COUNCIL_PING_TIMEOUT_MS: 10000,
    getOpenSourceCouncil: () => null,
    providerCooldowns: null,
    getSourceOfTruthManager: () => null,
    updateROI: () => {},
    trackAIPerformance: async () => {},
    notifyCriticalIssue: async () => {},
  });

  const callModel = async ({ member, prompt, options }) => {
    return service.callCouncilMember(member, prompt, { ...options, returnObject: true });
  };

  return { callModel, pool };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`Usage: node scripts/run-cognitive-mission.mjs --mission "..." [--responsibilities chair,architect,cfo] [--lenses steve-jobs,cfo-roi] [--execute] [--dry-run] [--build-mode] [--output path] [--list-lenses]`);
    process.exit(0);
  }

  if (args['list-lenses']) {
    const lenses = listLenses();
    console.log(JSON.stringify(lenses, null, 2));
    process.exit(0);
  }

  const mission = args.mission || args.m;
  if (!mission) {
    console.error('Missing required argument: --mission <string>');
    process.exit(1);
  }

  const responsibilities = (args.responsibilities || args.r || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const lenses = (args.lenses || args.l || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const execute = args.execute === true || args.execute === 'true';
  const dryRun = args['dry-run'] === true || !execute;
  const buildMode = args['build-mode'] === true || args['build-mode'] === 'true';

  let callModel = null;
  let pool = null;

  if (execute) {
    const created = createCallModel();
    callModel = created.callModel;
    pool = created.pool;
    console.log('🧠 Cognitive Chair running in EXECUTE mode (models will be called).');
  } else {
    console.log('🧠 Cognitive Chair running in DRY-RUN mode (no models called; prompts and structure generated).');
  }

  let transcript = null;
  let buildResult = null;
  const root = process.cwd();

  if (buildMode) {
    buildResult = await runCognitiveStep({
      mission,
      responsibilities,
      lenses,
      root,
      callModel,
      dryRun,
    });
    transcript = buildResult.transcript;
  } else {
    transcript = await composeReasoning({
      mission,
      responsibilities,
      lenses,
      callModel,
    });
  }

  if (pool) {
    await pool.end().catch(() => {});
  }

  const outputPath = args.output || args.o;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(buildMode ? buildResult : transcript, null, 2), 'utf8');
    console.log(`Wrote JSON ${buildMode ? 'build plan' : 'transcript'} to ${outputPath}`);
  } else {
    const defaultDir = 'products/receipts';
    fs.mkdirSync(defaultDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(defaultDir, `${buildMode ? 'COGNITIVE_BUILD_PLAN' : 'COGNITIVE_TRANSCRIPT'}_${stamp}.json`);
    fs.writeFileSync(defaultPath, JSON.stringify(buildMode ? buildResult : transcript, null, 2), 'utf8');
    console.log(`Wrote JSON ${buildMode ? 'build plan' : 'transcript'} to ${defaultPath}`);
  }

  let markdown;
  if (buildMode) {
    markdown = formatBuildPlan(buildResult);
  } else {
    markdown = formatTranscript(transcript);
  }
  const mdPath = (outputPath || `products/receipts/${buildMode ? 'COGNITIVE_BUILD_PLAN' : 'COGNITIVE_TRANSCRIPT'}_${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
    .replace(/\.json$/, '.md');
  fs.writeFileSync(mdPath, markdown, 'utf8');
  console.log(`Wrote Markdown ${buildMode ? 'build plan' : 'transcript'} to ${mdPath}`);

  console.log('\n--- CHAIR SYNTHESIS PREVIEW ---\n');
  if (transcript.chair?.parsed) {
    console.log(`Position: ${transcript.chair.parsed.chair_position || ''}`);
    console.log(`Next action: ${transcript.chair.parsed.next_action || ''}`);
  } else if (transcript.chair?.prompt) {
    console.log('(Dry-run: synthesis prompt generated but not sent.)');
  }
  if (buildMode && buildResult.gate) {
    console.log(`Gate: ${buildResult.gate.verdict} (p_hat=${buildResult.gate.p_hat?.toFixed(2)}, threshold=${buildResult.gate.threshold?.toFixed(2)})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
