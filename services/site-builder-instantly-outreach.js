/**
 * SYNOPSIS: Site Builder cold outreach via Instantly (growth/cold lane — not Postmark/Resend).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Postmark / Resend / SendGrid / SES ban unsolicited cold email. Instantly is built for
 * outbound sequences on Google Workspace / Microsoft inboxes with warmup + rotation.
 * Tip path: add a lead to an Instantly campaign; Instantly sends the sequence.
 */
const INSTANTLY_LEADS_URL = 'https://api.instantly.ai/api/v2/leads';

export function getInstantlyConfig(env = process.env) {
  const apiKey = String(env.INSTANTLY_API_KEY || '').trim();
  const campaignId = String(env.INSTANTLY_CAMPAIGN_ID || '').trim();
  return {
    apiKey,
    campaignId,
    configured: Boolean(apiKey && campaignId),
  };
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

function extractPreviewUrl(html, text) {
  const blob = `${html || ''}\n${text || ''}`;
  const m = blob.match(/https?:\/\/[^\s"'<>]+\/previews\/[\w-]+\/?/i);
  return m ? m[0].replace(/[),.]+$/, '') : null;
}

function extractFirstName(contactName) {
  const n = String(contactName || '').trim();
  if (!n) return null;
  return n.split(/\s+/)[0].slice(0, 80);
}

/**
 * Enqueue a Site Builder prospect into an Instantly campaign.
 * Instantly owns deliverability; we only create/update the lead.
 */
export async function enqueueInstantlyLead({
  email,
  subject,
  html,
  text,
  businessName,
  businessUrl,
  contactName,
  previewUrl,
  clientId,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const { apiKey, campaignId, configured } = getInstantlyConfig(env);
  if (!configured) {
    return {
      success: false,
      provider: 'instantly',
      error: 'INSTANTLY_API_KEY and INSTANTLY_CAMPAIGN_ID required',
    };
  }
  const to = String(email || '').trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return { success: false, provider: 'instantly', error: 'valid email required' };
  }

  const preview = previewUrl || extractPreviewUrl(html, text);
  const personalization = [
    subject ? `Subject: ${subject}` : '',
    preview ? `Preview: ${preview}` : '',
    stripHtml(html) || String(text || '').trim(),
  ].filter(Boolean).join('\n').slice(0, 1500);

  const body = {
    campaign: campaignId,
    email: to,
    company_name: businessName ? String(businessName).slice(0, 200) : null,
    website: businessUrl ? String(businessUrl).slice(0, 500) : null,
    first_name: extractFirstName(contactName),
    personalization: personalization || null,
    custom_variables: {
      source: 'site_builder',
      client_id: clientId ? String(clientId) : '',
      preview_url: preview || '',
      business_name: businessName ? String(businessName).slice(0, 200) : '',
      subject_hint: subject ? String(subject).slice(0, 200) : '',
    },
  };

  try {
    const resp = await fetchImpl(INSTANTLY_LEADS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await resp.text();
    let json = null;
    try { json = JSON.parse(raw); } catch { json = { raw }; }

    if (!resp.ok) {
      const errMsg = json?.message || json?.error || json?.detail || `Instantly HTTP ${resp.status}`;
      return { success: false, provider: 'instantly', error: String(errMsg).slice(0, 400), status: resp.status };
    }

    const leadId = json?.id || json?.lead_id || json?.entity?.id || null;
    return {
      success: true,
      provider: 'instantly',
      messageId: leadId,
      leadId,
      campaignId,
      previewUrl: preview || null,
    };
  } catch (err) {
    return {
      success: false,
      provider: 'instantly',
      error: err?.message || String(err),
    };
  }
}

/**
 * Adapter matching ProspectPipeline sendEmail(to, subject, html) → { success, ... }.
 * Optional meta bag can be attached as sendEmail.meta before the call (used by resend path).
 */
export function createInstantlySendEmailAdapter({ env = process.env, fetchImpl = fetch, logger = console } = {}) {
  const sendEmail = async (to, subject, html) => {
    const meta = sendEmail.meta && typeof sendEmail.meta === 'object' ? sendEmail.meta : {};
    sendEmail.meta = null;
    const result = await enqueueInstantlyLead({
      email: to,
      subject,
      html,
      text: '',
      businessName: meta.businessName,
      businessUrl: meta.businessUrl,
      contactName: meta.contactName,
      previewUrl: meta.previewUrl,
      clientId: meta.clientId,
      env,
      fetchImpl,
    });
    if (!result.success) {
      logger?.warn?.('[INSTANTLY] lead enqueue failed', { to, error: result.error });
    } else {
      logger?.info?.('[INSTANTLY] lead enqueued', { to, leadId: result.leadId, campaignId: result.campaignId });
    }
    return result;
  };
  return sendEmail;
}

export default {
  getInstantlyConfig,
  enqueueInstantlyLead,
  createInstantlySendEmailAdapter,
};