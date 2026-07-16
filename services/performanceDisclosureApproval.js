/**
 * SYNOPSIS: Exports approvePerformanceDisclosure — services/performanceDisclosureApproval.js.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
[{"old_string":"export function approvePerformanceDisclosure(disclosureText) {","new_string":"export function approveDisclosure(disclosureText) {"},{"old_string":"return {\n      approved: false,","new_string":"return rejectDisclosure()"},{"old_string":"export function approveDisclosure(disclosureText) {","new_string":"export function rejectDisclosure() {\n  return {\n    approved: false,\n    message: 'Disclosure must include both past performance and future risks'\n  };\n}\n\nexport function approveDisclosure(disclosureText) {"}]