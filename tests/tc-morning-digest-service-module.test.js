/**
 * SYNOPSIS: Regression: TC morning digest module loads (syntax + exports) without DB.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 * Regression: TC morning digest module loads (syntax + exports) without DB.
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(__dirname, "..", "services", "tc-morning-digest-service.js");
const href = pathToFileURL(modPath).href;

test("tc-morning-digest-service — exports load", async () => {
  const mod = await import(href);
  assert.equal(typeof mod.getTCMorningDigest, "function");
  assert.equal(typeof mod.formatTCDigestForEmail, "function");
  assert.equal(typeof mod.formatTCDigestForSMS, "function");
});
