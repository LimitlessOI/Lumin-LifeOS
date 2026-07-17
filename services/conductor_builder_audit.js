/**
 * SYNOPSIS: Existing code in the file
 */
// Existing code in the file
// (Assuming the file already contains some code that should be preserved)

class BuilderAuditTrail {
  constructor() {
    this.trail = [];
  }

  record(action, details) {
    const timestamp = new Date().toISOString();
    this.trail.push({ action, details, timestamp });
  }

  getTrail() {
    return this.trail;
  }
}

function auditBuilderTrail(action, details) {
  const auditTrail = new BuilderAuditTrail();
  auditTrail.record(action, details);
  return auditTrail.getTrail();
}

export { auditBuilderTrail };
