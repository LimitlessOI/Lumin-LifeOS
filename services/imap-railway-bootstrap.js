/**
 * SYNOPSIS: Exports verifyImapAndDryRun — services/imap-railway-bootstrap.js.
 */
export async function verifyImapAndDryRun(deps) {
  const required = ["IMAP_HOST", "IMAP_USER", "IMAP_PASS"];
  const missing = required.filter((name) => !process.env[name] || String(process.env[name]).trim() === "");
  if (missing.length > 0) {
    return { ready: false, missing };
  }

  if (!deps || !deps.imapClient || typeof deps.imapClient.scan !== "function") {
    throw new Error("deps.imapClient.scan is required for IMAP dry-run scan");
  }

  const result = await deps.imapClient.scan({ dryRun: true });
  const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : Array.isArray(result?.emails) ? result.emails : [];
  const scannedCount = typeof result?.scannedCount === "number"
    ? result.scannedCount
    : typeof result?.count === "number"
      ? result.count
      : items.length;

  const sample = items
    .slice(0, 3)
    .map((item) => item?.subject)
    .filter((subject) => typeof subject === "string" && subject.length > 0);

  return {
    ready: true,
    scannedCount,
    sample,
  };
}