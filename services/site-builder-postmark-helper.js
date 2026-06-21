/**
 * SYNOPSIS: Standalone Postmark email helper for Site Builder prospect outreach.
 * Standalone Postmark email helper for Site Builder prospect outreach.
 * Queue `site-builder-postmark-send` kept truncating via council; shipped as GAP-FILL (repair loop RL1).
 *
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */

const POSTMARK_API = "https://api.postmarkapp.com/email";

/**
 * @param {Record<string, unknown>} prospect — expects `contact_email` or `email`
 * @param {{ dry_run?: boolean, subject?: string, textBody?: string, from?: string }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function sendProspectOutreach(prospect, opts = {}) {
  const dry = opts.dry_run === true;
  const token = String(process.env.POSTMARK_SERVER_TOKEN || "").trim();
  const to = String(prospect?.contact_email || prospect?.email || "").trim();
  const subject = String(opts.subject || prospect?.outreach_subject || "Quick note about your website").trim();
  const textBody = String(opts.textBody || prospect?.outreach_body_plain || "").trim();
  const from = String(opts.from || process.env.EMAIL_FROM || process.env.POSTMARK_FROM || "").trim();

  const payload = {
    From: from,
    To: to,
    Subject: subject,
    TextBody: textBody || "(no body)",
    MessageStream: "outbound",
  };

  if (!token) {
    return { sent: false, error: "POSTMARK_SERVER_TOKEN not set", dry_run: dry };
  }
  if (!to) {
    return { sent: false, error: "prospect missing contact_email", dry_run: dry };
  }
  if (!from) {
    return { sent: false, error: "EMAIL_FROM or POSTMARK_FROM not set", dry_run: dry };
  }
  if (dry) {
    return { sent: false, dry_run: true, payload };
  }

  const res = await fetch(POSTMARK_API, {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      sent: false,
      error: json.Message || String(json.ErrorCode || res.status),
      status: res.status,
    };
  }
  return { sent: true, message_id: json.MessageID };
}
