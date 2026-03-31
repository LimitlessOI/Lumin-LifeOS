/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Filename-only classification for buyer inspection / repair-request packages (R4R).
 */

/**
 * @param {string} filename
 * @returns {'repair_request' | 'inspection_report' | 'other'}
 */
export function classifyR4RAttachment(filename = '') {
  const f = String(filename || '').toLowerCase();
  if (
    /r4r|repair[\s_-]*request|request\s*for\s*repairs|binsr|birr|buyers?[\s_-]*inspection[\s_-]*response/i.test(
      f
    )
  ) {
    return 'repair_request';
  }
  if (/inspection\s*report|home\s*inspection|inspection/i.test(f)) {
    return 'inspection_report';
  }
  return 'other';
}
