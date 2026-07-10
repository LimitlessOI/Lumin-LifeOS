/**
 * SYNOPSIS: Exports runDocumentQA — services/document-qa.js.
 */
export async function runDocumentQA(deps, { documentBuffers, transactionId }) {
  if (!deps || typeof deps.callCouncilMember !== 'function') {
    throw new Error('runDocumentQA requires deps.callCouncilMember');
  }

  const buffers = Array.isArray(documentBuffers) ? documentBuffers : [];
  const results = [];

  for (let i = 0; i < buffers.length; i += 1) {
    const entry = buffers[i];
    const buf = Buffer.isBuffer(entry)
      ? entry
      : entry?.buffer && Buffer.isBuffer(entry.buffer)
        ? entry.buffer
        : Buffer.from(entry?.content ?? entry ?? '');

    const prompt = JSON.stringify({
      document: buf.toString('base64'),
      transactionId,
    });

    const raw = await deps.callCouncilMember('document-qa', prompt);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { issues: [], passed: false };
    }

    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues
          .filter(
            (issue) =>
              issue &&
              (issue.type === 'missing-signature' || issue.type === 'missing-field') &&
              typeof issue.location === 'string' &&
              issue.location.length > 0
          )
          .map((issue) => ({
            type: issue.type,
            location: issue.location,
          }))
      : [];

    const passed = typeof parsed?.passed === 'boolean' ? parsed.passed : issues.length === 0;

    results.push({
      documentName:
        typeof entry === 'object' && entry !== null && typeof entry.name === 'string'
          ? entry.name
          : `document-${i + 1}`,
      issues,
      passed,
    });
  }

  return {
    allPassed: results.every((result) => result.passed),
    results,
  };
}