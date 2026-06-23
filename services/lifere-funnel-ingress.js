/**
 * SYNOPSIS: LifeRE ClickFunnels webhook ingress (stub without secret).
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREFunnelIngress({ pool = null } = {}) {
  async function handleClickFunnelsWebhook({ secret, body, tenantId = 'default', userId = 'adam' }) {
    if (!process.env.CLICKFUNNELS_WEBHOOK_SECRET && !secret) {
      return {
        ok: true,
        accepted: false,
        status: 200,
        reason: 'clickfunnels_secret_not_configured',
        hint: 'Set CLICKFUNNELS_WEBHOOK_SECRET on Railway to accept live funnel webhooks',
        label: 'THINK',
      };
    }
    if (secret && secret !== process.env.CLICKFUNNELS_WEBHOOK_SECRET) {
      return { ok: false, status: 401, error: 'Invalid webhook secret' };
    }
    if (pool) {
      await pool.query(
        `INSERT INTO lifere_funnel_events (tenant_id, user_id, funnel_id, step, lead_ref, payload)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenantId, userId, body.funnel_id || 'unknown', body.step || 'capture', body.email || null, body]
      );
    }
    return { ok: true, lead_ref: body.email || null };
  }

  return { handleClickFunnelsWebhook };
}
