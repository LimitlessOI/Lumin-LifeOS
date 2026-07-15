/**
 * SYNOPSIS: services/findingLifecycleService.js
 */
// services/findingLifecycleService.js

const findings = [];

export function openFinding(finding) {
  const newFinding = { ...finding, status: 'open', assignedTo: null };
  findings.push(newFinding);
  return newFinding;
}

export function listFindings() {
  return findings;
}

export function assignFinding(findingId, assignee) {
  const finding = findings.find(f => f.id === findingId && f.status === 'open');
  if (finding) {
    finding.assignedTo = assignee;
    return finding;
  }
  return null;
}

export function closeFinding(findingId, verification) {
  const finding = findings.find(f => f.id === findingId && f.status === 'open');
  if (finding && verification) {
    finding.status = 'closed';
    return finding;
  }
  return null;
}
