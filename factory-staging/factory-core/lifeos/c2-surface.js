import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const C2_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lifeos/c2');

function loadJson(name) {
  const p = path.join(C2_DIR, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

/**
 * C2 surface — communication bridge only; never assigns builder work or declares truth.
 */
export function getC2SurfaceStatus() {
  const charterPath = path.join(C2_DIR, 'C2_MODULE_CHARTER.md');
  return {
    module: 'C2',
    role: 'command_control_communication_bridge',
    is_department: false,
    is_builder: false,
    is_brain: false,
    artifacts: {
      charter: fs.existsSync(charterPath),
      state_model: Boolean(loadJson('C2_STATE_MODEL.json')),
      escalation_rules: Boolean(loadJson('C2_ESCALATION_RULES.json')),
      communication_preferences: Boolean(loadJson('C2_COMMUNICATION_PREFERENCES.json')),
    },
    authority_note: 'C2 surfaces mission state and escalations — does not execute or prioritize builder work',
  };
}

export function formatC2MissionBrief({ mission_id, mission_state, sentryReview, intakeGate }) {
  return {
    mission_id,
    mission_state: mission_state || 'Building',
    intake: intakeGate?.status,
    sentry: sentryReview?.implementation_status,
    escalations: [],
    density: 'summary',
    note: 'Expand detail on demand — C2 does not infer strategy',
  };
}
