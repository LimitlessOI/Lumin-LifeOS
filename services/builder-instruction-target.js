/**
 * Parse repo-relative target paths and domains from operator/build instructions.
 * Shared by Voice Rail command executor and BuilderOS PBB planner.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

const TARGET_FILE_RE =
  /\b((?:scripts|services|routes|public|config|startup|db\/migrations|builderos-reboot)\/[\w./-]+\.(?:mjs|cjs|js|html|sql|md|json))\b/i;

export function extractTargetFileFromInstruction(instruction) {
  const text = String(instruction || '');
  const match = text.match(TARGET_FILE_RE);
  return match?.[1]?.replace(/\\/g, '/') || null;
}

/** @deprecated alias — Voice Rail founder utterances use the same path grammar */
export const extractTargetFileFromFounderUtterance = extractTargetFileFromInstruction;

export function inferBuilderDomainForTargetFile(targetFile) {
  const path = String(targetFile || '').replace(/\\/g, '/');
  if (path.startsWith('builderos-reboot/')) return 'builderos-platform';
  return 'lifeos-platform';
}

const PROSE_REFUSAL_PREFIX =
  /^(I cannot|I can't|Unfortunately|The content of|The file content was not|I need the|Please provide|I do not have|I'm unable|I am unable)/i;

/** Detect council prose refusals masquerading as codegen output. */
export function looksLikeBuilderProseRefusal(output, targetFile) {
  const text = String(output || '').trim();
  if (!text || !targetFile) return false;
  if (!/\.(js|mjs|cjs)$/i.test(String(targetFile))) return false;
  if (PROSE_REFUSAL_PREFIX.test(text)) return true;
  if (/was not provided/i.test(text) && text.length < 4000) return true;
  const looksLikeCode = /^(import |export |\/\*\*|\/\/|const |function |\/\*|#!)/.test(text);
  return !looksLikeCode && text.length < 2500;
}
