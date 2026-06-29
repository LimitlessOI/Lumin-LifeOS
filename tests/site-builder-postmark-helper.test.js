/**
 * SYNOPSIS: Regression tests for `services/site-builder-postmark-helper.js` (no live Postmark calls).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * Regression tests for `services/site-builder-postmark-helper.js` (no live Postmark calls).
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(__dirname, "..", "services", "site-builder-postmark-helper.js");
const { sendProspectOutreach } = await import(pathToFileURL(modPath).href);

test("sendProspectOutreach — no token returns structured error", async () => {
  const prevT = process.env.POSTMARK_SERVER_TOKEN;
  const prevF = process.env.EMAIL_FROM;
  delete process.env.POSTMARK_SERVER_TOKEN;
  process.env.EMAIL_FROM = "from@example.com";
  const r = await sendProspectOutreach({ contact_email: "a@b.com" }, {});
  assert.equal(r.sent, false);
  assert.match(String(r.error || ""), /POSTMARK_SERVER_TOKEN/);
  if (prevT !== undefined) process.env.POSTMARK_SERVER_TOKEN = prevT;
  else delete process.env.POSTMARK_SERVER_TOKEN;
  if (prevF !== undefined) process.env.EMAIL_FROM = prevF;
  else delete process.env.EMAIL_FROM;
});

test("sendProspectOutreach — dry_run returns payload without network", async () => {
  process.env.POSTMARK_SERVER_TOKEN = "test-token";
  process.env.EMAIL_FROM = "from@example.com";
  const r = await sendProspectOutreach(
    { contact_email: "to@example.com", outreach_subject: "Hi", outreach_body_plain: "Body" },
    { dry_run: true },
  );
  assert.equal(r.dry_run, true);
  assert.ok(r.payload);
  assert.equal(r.payload.To, "to@example.com");
  delete process.env.POSTMARK_SERVER_TOKEN;
  delete process.env.EMAIL_FROM;
});
