/**
 * SYNOPSIS: Exports testSubjectLines — services/site-builder-ab-subject-testing.js.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
/**
 * Initiates a subject-line A/B test and records events.
 */
export async function testSubjectLines(db, siteId, variantA, variantB) {
  // Create a new test
  const test = await createTest(db, siteId, variantA, variantB);

  // Simulate sending and opening events for both variants
  await recordEvent(db, test.id, 'a', 'sent');
  await recordEvent(db, test.id, 'b', 'sent');
  await recordEvent(db, test.id, 'a', 'open');
  await recordEvent(db, test.id, 'b', 'open');

  return test;
}

/**
 * Retrieves results of the A/B test and calculates analytics.
 */
export async function getABTestResults(db, testId) {
  // Fetch counts for the test
  const counts = await getCounts(db, testId);

  // Calculate open rates
  const aRate = openRate(counts.a);
  const bRate = openRate(counts.b);

  // Compile results
  const results = {
    variantA: {
      sent: counts.a.sent,
      open: counts.a.open,
      openRate: aRate
    },
    variantB: {
      sent: counts.b.sent,
      open: counts.b.open,
      openRate: bRate
    }
  };

  return results;
}
