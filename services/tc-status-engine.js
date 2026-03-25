/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-status-engine.js
 * Derives the at-a-glance transaction/file state for agent and client portal views.
 */

const CLIENT_UPDATE_EVENTS = new Set([
  'party_intro_sent',
  'deadline_reminder_sent',
  'welcome_sent',
  'client_update_sent',
  'seller_update_sent',
  'approval_request_sent',
]);

const INTERNAL_PROGRESS_EVENTS = new Set([
  'created',
  'td_created',
  'doc_uploaded',
  'fee_collected',
  'party_intro_sent',
]);

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffInDays(future, now) {
  if (!future || !now) return null;
  return Math.ceil((future.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeChecklist(documents) {
  const checklist = Array.isArray(documents?.checklist) ? documents.checklist : [];
  return checklist.map((item, index) => ({
    id: item.id || index + 1,
    name: item.name || item.title || `Document ${index + 1}`,
    required: Boolean(item.required),
    received: Boolean(item.received || item.complete),
    owner: item.owner || item.requestedFrom || null,
    dueDate: item.dueDate || item.due_date || null,
  }));
}

function latestEvent(events, predicate) {
  return events.find(predicate) || null;
}

function classifyWaitingOn(missingDocs, blockers, nextActionOwner) {
  if (blockers.some((blocker) => blocker.owner === 'seller' || blocker.owner === 'buyer' || blocker.owner === 'client')) {
    return 'client';
  }
  if (missingDocs.some((doc) => /seller|buyer|client/i.test(doc.owner || doc.name))) return 'client_documents';
  if (blockers.some((blocker) => blocker.owner === 'agent')) return 'agent';
  if (blockers.some((blocker) => blocker.owner === 'title')) return 'title';
  if (blockers.some((blocker) => blocker.owner === 'lender')) return 'lender';
  if (nextActionOwner === 'internal') return 'tc_team';
  return 'none';
}

function derivePortalSyncStatus(transaction, events) {
  const hasEvent = (type) => events.some((event) => event.event_type === type);
  const tdLinked = Boolean(transaction.transaction_desk_id || hasEvent('td_created'));
  const docsUploaded = hasEvent('doc_uploaded');

  return {
    transactionDesk: tdLinked ? 'linked' : 'pending',
    skySlope: docsUploaded ? 'synced' : tdLinked ? 'ready' : 'pending',
    boldTrail: hasEvent('boldtrail_synced') ? 'synced' : 'pending',
    asana: hasEvent('asana_synced') ? 'synced' : 'pending',
    dropbox: hasEvent('dropbox_synced') ? 'synced' : 'pending',
  };
}

function deriveContingencies(transaction, now) {
  return Object.entries(transaction.key_dates || {})
    .filter(([key]) => key !== 'acceptance')
    .map(([name, dateStr]) => {
      const date = asDate(dateStr);
      const daysRemaining = diffInDays(date, now);
      return {
        name,
        label: name.replace(/_/g, ' '),
        date: dateStr,
        daysRemaining,
        status:
          daysRemaining === null
            ? 'unknown'
            : daysRemaining < 0
              ? 'expired'
              : daysRemaining === 0
                ? 'today'
                : 'upcoming',
      };
    });
}

function deriveBlockers(transaction, contingencies, missingDocs, portalSyncStatus, now) {
  const blockers = [];
  const closeDate = asDate(transaction.close_date);
  const daysToClose = diffInDays(closeDate, now);

  for (const contingency of contingencies) {
    if (contingency.daysRemaining !== null && contingency.daysRemaining < 0) {
      blockers.push({
        type: 'deadline_expired',
        severity: 'critical',
        owner: 'internal',
        message: `${contingency.label} expired on ${contingency.date}`,
      });
    }
  }

  if (daysToClose !== null && daysToClose < 0 && transaction.status !== 'closed') {
    blockers.push({
      type: 'close_date_passed',
      severity: 'critical',
      owner: 'internal',
      message: `Close date passed on ${transaction.close_date}`,
    });
  }

  if (missingDocs.length > 0) {
    blockers.push({
      type: 'missing_required_docs',
      severity: missingDocs.length >= 3 ? 'high' : 'medium',
      owner: missingDocs.some((doc) => /seller|buyer|client/i.test(doc.owner || doc.name)) ? 'client' : 'agent',
      message: `${missingDocs.length} required document(s) still missing`,
      items: missingDocs.map((doc) => doc.name),
    });
  }

  if (transaction.status === 'active' && portalSyncStatus.transactionDesk === 'pending') {
    blockers.push({
      type: 'portal_not_created',
      severity: 'medium',
      owner: 'internal',
      message: 'TransactionDesk/SkySlope file has not been created yet',
    });
  }

  return { blockers, daysToClose };
}

function deriveStage(transaction, blockers, missingDocs, portalSyncStatus) {
  if (transaction.status === 'closed') return 'closed';
  if (transaction.status === 'cancelled') return 'blocked';
  if (blockers.some((blocker) => blocker.severity === 'critical')) return 'blocked';
  if (missingDocs.length > 0) return 'awaiting_missing_items';
  if (portalSyncStatus.transactionDesk === 'pending') return 'intake';
  if (portalSyncStatus.skySlope === 'ready') return 'ready_for_filing';
  if (portalSyncStatus.skySlope === 'synced') {
    return transaction.agent_role === 'listing' ? 'active_listing' : 'active_transaction';
  }
  return 'docs_review';
}

function deriveHealthStatus(blockers, contingencies, daysToClose) {
  if (blockers.some((blocker) => blocker.severity === 'critical')) return 'red';
  if (blockers.length > 0) return 'yellow';
  if (daysToClose !== null && daysToClose <= 3) return 'yellow';
  if (contingencies.some((item) => item.daysRemaining !== null && item.daysRemaining >= 0 && item.daysRemaining <= 2)) return 'yellow';
  return 'green';
}

function deriveNextAction({ transaction, missingDocs, blockers, portalSyncStatus, daysToClose }) {
  if (blockers.length > 0) {
    const blocker = blockers[0];
    if (blocker.type === 'missing_required_docs') {
      return {
        nextAction: 'Request missing documents and prepare follow-up for review',
        nextActionOwner: blocker.owner === 'client' ? 'client' : 'agent',
      };
    }
    return {
      nextAction: blocker.message,
      nextActionOwner: blocker.owner || 'internal',
    };
  }

  if (portalSyncStatus.transactionDesk === 'pending') {
    return {
      nextAction: 'Create the transaction file in SkySlope / TransactionDesk',
      nextActionOwner: 'internal',
    };
  }

  if (portalSyncStatus.skySlope === 'ready') {
    return {
      nextAction: 'Upload reviewed documents to SkySlope',
      nextActionOwner: 'internal',
    };
  }

  if (daysToClose !== null && daysToClose <= 7) {
    return {
      nextAction: 'Run closing-prep review and confirm remaining parties/documents',
      nextActionOwner: 'internal',
    };
  }

  if (missingDocs.length === 0 && transaction.agent_role === 'listing') {
    return {
      nextAction: 'Prepare the next seller update and confirm listing-performance data is current',
      nextActionOwner: 'internal',
    };
  }

  return {
    nextAction: 'Monitor the file and keep communication current',
    nextActionOwner: 'internal',
  };
}

export function createTCStatusEngine({ now = () => new Date() } = {}) {
  function deriveTransactionState({ transaction, events = [] }) {
    const orderedEvents = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const currentTime = now();
    const checklist = normalizeChecklist(transaction.documents);
    const missingDocs = checklist.filter((doc) => doc.required && !doc.received);
    const contingencies = deriveContingencies(transaction, currentTime);
    const portalSyncStatus = derivePortalSyncStatus(transaction, orderedEvents);
    const { blockers, daysToClose } = deriveBlockers(transaction, contingencies, missingDocs, portalSyncStatus, currentTime);
    const stage = deriveStage(transaction, blockers, missingDocs, portalSyncStatus);
    const healthStatus = deriveHealthStatus(blockers, contingencies, daysToClose);
    const { nextAction, nextActionOwner } = deriveNextAction({
      transaction,
      missingDocs,
      blockers,
      portalSyncStatus,
      daysToClose,
    });

    const lastClientUpdate = latestEvent(orderedEvents, (event) => CLIENT_UPDATE_EVENTS.has(event.event_type));
    const lastProgressEvent = latestEvent(orderedEvents, (event) => INTERNAL_PROGRESS_EVENTS.has(event.event_type));
    const nextClientUpdateDueAt = lastClientUpdate
      ? new Date(new Date(lastClientUpdate.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : transaction.status === 'active'
        ? new Date(currentTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null;

    const riskFlags = [
      ...blockers.map((blocker) => blocker.message),
      ...contingencies
        .filter((item) => item.daysRemaining !== null && item.daysRemaining >= 0 && item.daysRemaining <= 3)
        .map((item) => `${item.label} deadline in ${item.daysRemaining} day(s) (${item.date})`),
      ...(daysToClose !== null && daysToClose >= 0 && daysToClose <= 7 ? [`Close of escrow in ${daysToClose} day(s)`] : []),
    ];

    return {
      stage,
      health_status: healthStatus,
      next_action: nextAction,
      next_action_owner: nextActionOwner,
      waiting_on: classifyWaitingOn(missingDocs, blockers, nextActionOwner),
      last_completed_step: lastProgressEvent?.event_type || null,
      missing_doc_count: missingDocs.length,
      missing_docs: missingDocs,
      blocker_count: blockers.length,
      blockers,
      last_client_update_at: lastClientUpdate?.created_at || null,
      next_client_update_due_at: nextClientUpdateDueAt,
      portal_sync_status: portalSyncStatus,
      days_to_close: daysToClose,
      contingencies,
      risk_flags: riskFlags,
      checklist_summary: {
        total: checklist.length,
        required: checklist.filter((item) => item.required).length,
        completed: checklist.filter((item) => item.received).length,
      },
      communication_summary: {
        last_client_update_at: lastClientUpdate?.created_at || null,
        next_client_update_due_at: nextClientUpdateDueAt,
        total_client_updates: orderedEvents.filter((event) => CLIENT_UPDATE_EVENTS.has(event.event_type)).length,
      },
    };
  }

  return { deriveTransactionState };
}

export default createTCStatusEngine;
