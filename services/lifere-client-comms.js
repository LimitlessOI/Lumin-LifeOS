/**
 * SYNOPSIS: LifeRE client communication templates and draft queue.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

export const CLIENT_COMMS_TEMPLATES = {
  status_update: {
    id: 'status_update',
    sms_text: 'Quick update on your home search: {{status}}. Next step: {{next_step}}.',
    email_html: '<p>Hi {{client_name}},</p><p>Quick update: {{status}}</p><p>Next: {{next_step}}</p>',
    requires_approval: true,
  },
  showing_feedback: {
    id: 'showing_feedback',
    sms_text: 'Thanks for touring {{address}}. What did you think? Reply with loves/maybes.',
    email_html: '<p>Hi {{client_name}},</p><p>Thanks for viewing {{address}}.</p>',
    requires_approval: true,
  },
  missing_doc: {
    id: 'missing_doc',
    sms_text: 'We still need {{doc_name}} to keep your file on track.',
    email_html: '<p>Hi {{client_name}},</p><p>Please upload: {{doc_name}}</p>',
    requires_approval: true,
  },
  milestone: {
    id: 'milestone',
    sms_text: 'Milestone reached: {{milestone}}. Congratulations!',
    email_html: '<p>Great news — {{milestone}}</p>',
    requires_approval: true,
  },
  weekly_seller_report: {
    id: 'weekly_seller_report',
    sms_text: 'Weekly listing update for {{address}}: {{summary}}',
    email_html: '<p>Weekly seller report for {{address}}</p><p>{{summary}}</p>',
    requires_approval: true,
  },
};

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

import { pushApprovedFollowUp } from './lifere-boldtrail-bridge.js';

export function createLifeREClientComms({ pool = null, outreach = null, logger = console } = {}) {
  function renderTemplate({ templateId, channel = 'sms', vars = {} }) {
    const tpl = CLIENT_COMMS_TEMPLATES[templateId];
    if (!tpl) throw new Error(`Unknown template: ${templateId}`);
    const body = channel === 'email' ? interpolate(tpl.email_html, vars) : interpolate(tpl.sms_text, vars);
    return { template_id: templateId, channel, body, requires_approval: tpl.requires_approval };
  }

  async function queueDraft({ tenantId = 'default', userId, actionType = 'sms_client', draft, payload = {} }) {
    if (!pool) {
      return { ok: true, queue_id: null, status: 'pending', persisted: false, draft_text: draft };
    }
    const { rows } = await pool.query(
      `INSERT INTO lifere_approval_queue (tenant_id, user_id, action_type, payload, draft_text, autonomy_level_required)
       VALUES ($1,$2,$3,$4,$5,2) RETURNING *`,
      [tenantId, userId, actionType, payload, draft]
    );
    return { ok: true, queue_id: rows[0].id, status: rows[0].status, persisted: true };
  }

  async function resolveQueueItem({
    queueId,
    tenantId = 'default',
    userId,
    status = 'approved',
  } = {}) {
    if (!pool) {
      return { ok: true, persisted: false, status };
    }

    const { rows } = await pool.query(
      `SELECT * FROM lifere_approval_queue
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND status = 'pending' LIMIT 1`,
      [queueId, tenantId, userId]
    );
    if (!rows[0]) {
      return { ok: false, error: 'queue_item_not_found' };
    }

    const item = rows[0];
    const resolvedStatus = status === 'rejected' ? 'rejected' : 'approved';

    await pool.query(
      `UPDATE lifere_approval_queue SET status = $1, resolved_at = now(), resolved_by = $2 WHERE id = $3`,
      [resolvedStatus, userId, queueId]
    );

    if (resolvedStatus === 'rejected') {
      return { ok: true, status: 'rejected', executed: null };
    }

    const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
    const channel = payload.channel || (String(item.action_type || '').includes('email') ? 'email' : 'sms');
    let executed = null;

    if (outreach) {
      const enq = await outreach.enqueueSequence({
        userId,
        sequenceId: `approval-queue-${queueId}`,
        recipientRef: payload.contact_id || payload.recipient_name || payload.client_ref || 'client',
        draft: item.draft_text,
        channel,
        recipientEmail: payload.recipient_email,
        recipientPhone: payload.recipient_phone,
        recipientName: payload.recipient_name || payload.client_name,
        approved: true,
      });
      if (enq.task_id) {
        executed = await outreach.executeTaskById({ taskId: enq.task_id, userId });
      } else {
        executed = { ok: true, note: 'queued_without_task_id', enqueue: enq, label: 'THINK' };
      }
    } else {
      executed = { ok: false, reason: 'no_outreach_bridge', label: 'THINK' };
    }

    try {
      await pool.query(
        `INSERT INTO lifere_client_comms_log
          (tenant_id, user_id, client_ref, channel, template_id, body, sent_at, approval_queue_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          tenantId,
          userId,
          payload.contact_id || payload.recipient_name || 'unknown',
          channel,
          payload.template_id || item.action_type || 'manual',
          item.draft_text,
          executed?.ok ? new Date() : null,
          queueId,
        ]
      );
    } catch (err) {
      logger.warn?.(`[LIFERE-COMMS] comms log insert failed: ${err.message}`);
    }

    let boldtrail = null;
    if (payload.contact_id && item.draft_text) {
      boldtrail = await pushApprovedFollowUp({
        contactId: payload.contact_id,
        message: item.draft_text,
        agentLabel: 'LifeRE',
      });
    }

    return {
      ok: true,
      status: 'approved',
      executed,
      boldtrail,
      task_id: executed?.task_id || null,
      label: executed?.ok || boldtrail?.ok ? 'KNOW' : 'THINK',
    };
  }

  async function listCommsLog({ tenantId = 'default', userId, limit = 25 } = {}) {
    if (!pool) return { ok: true, entries: [] };
    const { rows } = await pool.query(
      `SELECT id, client_ref, channel, template_id, body, sent_at, approval_queue_id
       FROM lifere_client_comms_log
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY sent_at DESC NULLS LAST, id DESC
       LIMIT $3`,
      [tenantId, userId, limit]
    );
    return { ok: true, entries: rows };
  }

  async function suggestVarsFromDeal({
    dealSide,
    transaction = null,
    tenantId = 'default',
    userId,
    ref,
    side = 'buyer',
  }) {
    if (!ref) return { ok: false, error: 'ref required' };

    if (String(side).toLowerCase() === 'transaction' || String(side).toLowerCase() === 'tc') {
      if (!transaction?.getDealStatus) return { ok: false, error: 'transaction_surface_required' };
      const status = await transaction.getDealStatus({ dealId: ref });
      const blocker = (status.blockers || [])[0];
      const blockerText = blocker?.message || blocker || null;
      return {
        ok: true,
        source: 'tc_transaction',
        vars: {
          client_name: status.client_name || status.buyer_name || 'there',
          address: status.property_address || ref,
          status: status.stage || 'in progress',
          next_step: blockerText || (status.next_actions?.[0]) || 'Confirm next milestone',
          milestone: status.stage || 'Transaction update',
          doc_name: (status.missing_documents || [])[0] || 'required document',
          summary: blockerText
            ? `Open item: ${blockerText}`
            : `File at ${status.stage || 'current stage'}; close ${status.close_date || 'TBD'}.`,
        },
      };
    }

    if (String(side).toLowerCase() === 'seller') {
      const ws = await dealSide.getSellerWorkspace({ tenantId, userId, listingRef: ref });
      if (!ws.ok) return ws;
      return {
        ok: true,
        source: 'seller_workspace',
        vars: {
          client_name: ref.replace(/_/g, ' '),
          address: ws.address || ref,
          summary: ws.weekly_report_draft || `Listing ${ref} — ${ws.showing_count} showing(s) this week.`,
          status: ws.stage,
          next_step: ws.weekly_report_draft ? 'Review and send weekly report' : 'Schedule showings',
        },
      };
    }
    const ws = await dealSide.getBuyerWorkspace({ tenantId, userId, clientRef: ref });
    if (!ws.ok) return ws;
    return {
      ok: true,
      source: 'buyer_workspace',
      vars: {
        client_name: ref.replace(/_/g, ' '),
        status: ws.stage,
        next_step: ws.offer_prep_status === 'preparing' ? 'Finalize offer terms' : 'Schedule next showing',
        milestone: ws.offer_prep_status === 'submitted' ? 'Offer submitted' : 'Search in progress',
      },
    };
  }

  return {
    renderTemplate,
    queueDraft,
    resolveQueueItem,
    listCommsLog,
    suggestVarsFromDeal,
    templates: CLIENT_COMMS_TEMPLATES,
  };
}
