/**
 * SYNOPSIS: Exports closeFinding — services/findingLifecycleService.js.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
[{"old_string":"export function closeFinding(findingId, verification) {","new_string":"export function verifyFinding(verification) {\n  return verification;\n}\n\nexport function closeFinding(findingId, verification) {"},{"old_string":"export function assignFinding(findingId, assignee) {","new_string":"export { openFinding, listFindings, assignFinding, closeFinding, verifyFinding };\n\nexport function assignFinding(findingId, assignee) {"}]