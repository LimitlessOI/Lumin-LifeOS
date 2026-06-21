#!/usr/bin/env node
/**
 * SYNOPSIS: Voice Rail retirement guard — history only, not active system.
 * Voice Rail retirement guard — history only, not active system.
 */
import { syncMissionFromTechnicalReceipt } from '../services/bp-priority-sync.js';

const command = process.argv.slice(2).join(' ') || 'voice-rail';
const lines = [
  'HIST_ONLY_BLOCKED',
  `command: ${command}`,
  'reason: Voice Rail is retired as failed history-only program.',
  'policy: Runtime route /api/v1/lifeos/voice-rail is intentionally unmounted.',
  'next: Use terminal-native BuilderOS command path (builderos:intake:direct / builderos:system-path).',
];

try {
  syncMissionFromTechnicalReceipt({
    missionId: 'PRODUCT-VOICE-RAIL-V1-0001',
    receipt: {
      verdict: 'FAIL',
      completed_at: new Date().toISOString(),
      git_sha: '',
      production_base: '',
      founder_usability_pass: false,
    },
    root: process.cwd(),
    buildRecord: { note: 'Voice Rail retired HIST_ONLY guard invoked.' },
  });
} catch {
  // Retirement guard remains fail-closed even when BP sync is unavailable.
}

console.error(lines.join('\n'));
process.exit(1);
