/**
 * SYNOPSIS: LifeRE ↔ BoldTrail bridge — pipeline read + approval-gated write-back.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import {
  extractContactsFromResponse,
  isBoldTrailAPIAvailable,
  listContactsFiltered,
  normalizeBoldTrailContact,
  probeBoldTrailApi,
  addContactNote,
  tagContact,
} from '../src/integrations/boldtrail.js';

const STATUS_PRIORITY = {
  new: 100,
  prospect: 85,
  active: 75,
  client: 55,
  sphere: 45,
  pending: 40,
  closed: 0,
  unknown: 30,
};

const STATUS_ACTION = {
  new: 'Follow up new lead',
  prospect: 'Advance prospect',
  active: 'Move active deal forward',
  client: 'Check in with client',
  sphere: 'Sphere touch',
  pending: 'Clear pending item',
  unknown: 'Follow up contact',
};

function uniqueContacts(contacts) {
  const seen = new Set();
  const out = [];
  for (const c of contacts) {
    if (!c?.id || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function scoreContact(contact) {
  const base = STATUS_PRIORITY[contact.status_label] ?? STATUS_PRIORITY.unknown;
  let bonus = 0;
  if (!contact.phone && !contact.email) bonus -= 15;
  if (contact.status_label === 'new') bonus += 10;
  return base + bonus;
}

function sortByPriority(contacts) {
  return [...contacts].sort((a, b) => scoreContact(b) - scoreContact(a));
}

function contactToPriority(contact, rank) {
  const verb = STATUS_ACTION[contact.status_label] || STATUS_ACTION.unknown;
  return {
    rank,
    task: `${verb}: ${contact.name}`,
    why_now: contact.status_label === 'new'
      ? 'new BoldTrail lead — speed to lead wins'
      : contact.status_label === 'prospect'
        ? 'prospect in pipeline — conversion window'
        : contact.status_label === 'active'
          ? 'active deal — keep momentum'
          : 'synced from BoldTrail CRM',
    boldtrail_contact_id: contact.id,
    contact,
  };
}

export async function getBoldTrailConnectionStatus() {
  if (!isBoldTrailAPIAvailable()) {
    return {
      connected: false,
      configured: false,
      reason: 'missing_token',
      portal_url: 'https://boldtrail.exprealty.com',
    };
  }

  const probe = await probeBoldTrailApi();
  return {
    connected: !!probe.ok,
    configured: !!probe.configured,
    probe: probe.probe || null,
    status: probe.status || null,
    reason: probe.reason || null,
    base_url: probe.baseUrl || null,
    portal_url: 'https://boldtrail.exprealty.com',
  };
}

export async function fetchBoldTrailPipeline({ limit = 50, assignedAgentId = null } = {}) {
  const status = await getBoldTrailConnectionStatus();
  if (!status.connected) {
    return {
      ok: false,
      connected: false,
      reason: status.reason || 'not_connected',
      contacts: [],
      summary: null,
    };
  }

  const responses = await Promise.all([
    listContactsFiltered({ limit, assignedAgentId }),
    listContactsFiltered({ limit: 15, status: 0, assignedAgentId }),
    listContactsFiltered({ limit: 15, status: 4, assignedAgentId }),
    listContactsFiltered({ limit: 15, status: 7, assignedAgentId }),
  ]);

  const merged = [];
  for (const res of responses) {
    if (!res.ok) continue;
    const rows = extractContactsFromResponse(res.data)
      .map(normalizeBoldTrailContact)
      .filter(Boolean);
    merged.push(...rows);
  }

  const contacts = sortByPriority(uniqueContacts(merged));
  const summary = {
    total: contacts.length,
    new: contacts.filter((c) => c.status_label === 'new').length,
    active: contacts.filter((c) => c.status_label === 'active').length,
    prospect: contacts.filter((c) => c.status_label === 'prospect').length,
    sphere: contacts.filter((c) => c.status_label === 'sphere').length,
    missing_contact_info: contacts.filter((c) => !c.phone && !c.email).length,
  };

  return {
    ok: true,
    connected: true,
    contacts,
    summary,
  };
}

export function buildTop3FromBoldTrail(contacts) {
  const ranked = sortByPriority(contacts);
  return ranked.slice(0, 3).map((c, i) => contactToPriority(c, i + 1));
}

export function buildFollowUpQueueFromBoldTrail(contacts, { limit = 10 } = {}) {
  return sortByPriority(contacts)
    .slice(0, limit)
    .map((contact, index) => ({
      rank: index + 1,
      contact_id: contact.id,
      lead: contact.name,
      status_label: contact.status_label,
      recipient_phone: contact.phone || null,
      recipient_email: contact.email || null,
      message_draft: `Hey ${contact.name.split(' ')[0] || 'there'}, quick check-in — still planning to move forward? Happy to help with next steps.`,
      execute_external: false,
      requires_agent_approval: true,
      source: 'boldtrail',
    }));
}

export function buildBlockerScanFromBoldTrail(summary) {
  if (!summary) {
    return ['BoldTrail not connected — using LifeRE defaults'];
  }

  const blockers = [];
  if (summary.new > 0) blockers.push(`${summary.new} new lead(s) awaiting first touch`);
  if (summary.missing_contact_info > 0) {
    blockers.push(`${summary.missing_contact_info} contact(s) missing phone/email`);
  }
  if (summary.active > 0) blockers.push(`${summary.active} active deal(s) need momentum`);
  if (summary.prospect > 0) blockers.push(`${summary.prospect} prospect(s) in pipeline`);
  if (!blockers.length) blockers.push('Pipeline clear — focus on sphere and new business');
  return blockers;
}

export async function loadBoldTrailContext(options = {}) {
  const pipeline = await fetchBoldTrailPipeline(options);
  if (!pipeline.ok) {
    return {
      connected: false,
      reason: pipeline.reason,
      top3: [],
      follow_up_queue: [],
      pipeline_summary: null,
      blocker_scan: buildBlockerScanFromBoldTrail(null),
    };
  }

  const top3 = buildTop3FromBoldTrail(pipeline.contacts);
  const follow_up_queue = buildFollowUpQueueFromBoldTrail(pipeline.contacts);

  return {
    connected: true,
    top3,
    follow_up_queue,
    pipeline_summary: pipeline.summary,
    blocker_scan: buildBlockerScanFromBoldTrail(pipeline.summary),
    portal_url: 'https://boldtrail.exprealty.com',
  };
}

export async function enrichDailyCommandCenter(body = {}) {
  const boldtrail = await loadBoldTrailContext({
    limit: body.boldtrail_limit || 50,
    assignedAgentId: body.assigned_agent_id || null,
  });

  return {
    agent: body.agent || 'agent',
    backlog: body.backlog || [],
    boldtrail,
  };
}

export async function pushApprovedFollowUp({ contactId, message, agentLabel = 'LifeRE' } = {}) {
  if (!contactId || !message) {
    return { ok: false, error: 'contact_id and message required' };
  }

  if (!isBoldTrailAPIAvailable()) {
    return { ok: false, error: 'BoldTrail API not configured' };
  }

  const noteText = `[${agentLabel}] ${String(message).trim()}`;
  const noteResult = await addContactNote(contactId, noteText);
  if (!noteResult.ok) {
    return {
      ok: false,
      error: 'failed_to_write_note',
      status: noteResult.status || null,
      detail: noteResult.data || noteResult.error || null,
    };
  }

  await tagContact(contactId, 'LifeRE-followed-up');

  return {
    ok: true,
    contact_id: contactId,
    wrote_note: true,
    tagged: true,
    requires_agent_approval: false,
    executed: true,
  };
}
