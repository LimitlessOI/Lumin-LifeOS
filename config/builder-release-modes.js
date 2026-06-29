/**
 * SYNOPSIS: config/builder-release-modes.js
 */
// config/builder-release-modes.js
/** @ssot docs/products/project-governance/PRODUCT_HOME.md */

export const BUILDER_MODE = Object.freeze({
  MANUAL: 'MANUAL',
  SUPERVISED: 'SUPERVISED',
  AUTONOMOUS: 'AUTONOMOUS',
});

// Rules enforced per mode by the builder route
export const BUILDER_MODE_RULES = Object.freeze({
  [BUILDER_MODE.MANUAL]: {
    auto_commit: false,
    write_security_receipt: false,
    requires_approval: true,
    description: 'Generate only — output returned to operator, no commit, no receipt.',
  },
  [BUILDER_MODE.SUPERVISED]: {
    auto_commit: true,
    write_security_receipt: true,
    requires_approval: false,
    receipt_type: 'builder_supervised_build',
    description: 'Commit + write builder_supervised_build receipt. OIL can audit the trail.',
  },
  [BUILDER_MODE.AUTONOMOUS]: {
    auto_commit: true,
    write_security_receipt: false,
    requires_approval: false,
    description: 'Current default — commit with no OIL receipt written by builder route.',
  },
});

// Default mode for the builder route (change to SUPERVISED when OIL monitoring is live)
export const DEFAULT_BUILDER_MODE = BUILDER_MODE.SUPERVISED;
