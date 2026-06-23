/**
 * SYNOPSIS: LifeRE client communication templates and draft queue.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
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

export function createLifeREClientComms({ pool = null } = {}) {
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

  return { renderTemplate, queueDraft, templates: CLIENT_COMMS_TEMPLATES };
}
