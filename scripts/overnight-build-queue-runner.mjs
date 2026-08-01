/**
 * SYNOPSIS: Alias/wrapper for the BuilderOS overnight daemon.
 * Backward-compatible entry point used by the acceptance harness.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export { runOnce, default } from './builderos-overnight-daemon.mjs';

// When run directly, behave exactly like the canonical daemon.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { default: daemonMain } = await import('./builderos-overnight-daemon.mjs');
  daemonMain().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
