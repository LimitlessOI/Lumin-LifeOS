#!/usr/bin/env node
/**
 * SYNOPSIS: Run unified BuilderOS dispatch gate (fail-closed preflight).
 * Usage: node scripts/builderos-dispatch-gate.mjs [--strict-deploy]
 * @ssot services/builderos-dispatch-gate.js
 */
import 'dotenv/config';
import { runDispatchGate } from '../services/builderos-dispatch-gate.js';

const strictDeploy = process.argv.includes('--strict-deploy');
const report = await runDispatchGate({ allowStaleDeploy: !strictDeploy });
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
