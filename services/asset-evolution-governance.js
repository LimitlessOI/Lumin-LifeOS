/**
 * SYNOPSIS: Governance layer for file lineage, SSOT amendments, and deprecated patterns.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const DEPRECATED_PATTERNS = [
  { pattern: /public\/overlay\/(lifeos-communication|lifeos-alpha|command-center|control|portal)\.html/, replacement: 'public/overlay/lifeos-app.html' },
  { pattern: /MISSION_QUEUE\.json/, replacement: 'builderos-reboot/BP_PRIORITY.json' },
];

export function auditFileLineage(filePath, ssotReference) {
  const deprecated = DEPRECATED_PATTERNS
    .filter((d) => d.pattern.test(filePath))
    .map((d) => ({ issue: 'deprecated_path', replacement: d.replacement }));

  return {
    file_path: filePath,
    ssot: ssotReference,
    deprecated,
    canonical: deprecated.length === 0,
    timestamp: new Date().toISOString(),
  };
}

export function trackAmendment(amendments, { id, file, change_summary, rationale }) {
  return [...amendments, {
    id,
    file,
    change_summary,
    rationale,
    at: new Date().toISOString(),
  }];
}

export function findDeprecatedUsages(fileList = []) {
  return fileList.map((p) => auditFileLineage(p, 'unknown'));
}
