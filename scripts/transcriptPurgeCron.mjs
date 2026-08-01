/**
 * SYNOPSIS: word-keeper BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
// schedule('0 0 * * *', purgeOldTranscripts)
export async function purgeOldTranscripts(deps, payload) {
  return { ok: true };
}
