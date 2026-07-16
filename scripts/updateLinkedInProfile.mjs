/**
 * SYNOPSIS: Exports updateLinkedInProfile — scripts/updateLinkedInProfile.mjs.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
[{"old_string":"export async function updateLinkedInProfile(accessToken, profileData)","new_string":"export async function updateLinkedInProfile(accessToken, profileData) {\n  profileData = { ...profileData, ...createSprintOfferProfileData(sprintOffers) }"},{"old_string":"export function createSprintOfferProfileData(sprintOffers) {","new_string":"export function updateLinkedInSection(sprintOffers) {\n  return createSprintOfferProfileData(sprintOffers);\n}\n\nexport function createSprintOfferProfileData(sprintOffers) {"}]