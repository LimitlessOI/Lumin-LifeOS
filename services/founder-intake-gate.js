/**
 * SYNOPSIS: Founder execute spine — Action Inbox capture + BPB intake gate before build/terminal.
 * WIRED: yes — founder-interface/message via lifeos-builderos-command-control-routes.js
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { createActionInbox } from './action-inbox.js';
import { resolveLifeOSUserId } from './lifeos-user-resolver.js';

export function createFounderIntakeGate({ pool, logger = console }) {
  const inbox = createActionInbox({ pool, logger });

  async function resolveUserId(req) {
    const sub = req.lifeosUser?.sub;
    if (sub && sub !== 'emergency-key' && /^\d+$/.test(String(sub))) {
      return parseInt(sub, 10);
    }
    const handle = req.auth_mode === 'command_key_fallback'
      ? 'adam'
      : (req.lifeosUser?.handle || 'adam');
    return resolveLifeOSUserId(pool, handle);
  }

  async function captureAndGate(req, {
    text,
    source = 'founder-interface',
    sessionId = null,
    autoApproveRoles = new Set(['founder_admin', 'operator', 'admin']),
    forceApprove = false,
  } = {}) {
    if (!pool) {
      return { ok: true, skipped: true, reason: 'no_pool' };
    }

    const userId = await resolveUserId(req);
    if (!userId) {
      return { ok: true, skipped: true, reason: 'no_user' };
    }

    const captured = await inbox.captureItem({
      userId,
      sessionId,
      source,
      rawText: text,
      metadata: { channel: 'founder-interface/message' },
    });

    if (captured.private) {
      return {
        ok: true,
        private: true,
        classification: captured.classification,
        persisted: false,
      };
    }

    let item = captured;
    const role = String(req.lifeosUser?.role || '').toLowerCase();
    const mayAutoApprove = forceApprove || autoApproveRoles.has(role);

    if (mayAutoApprove && item.status === 'staged') {
      item = await inbox.approveItem(item.id);
    }

    const approved = ['approved', 'routed', 'done'].includes(item.status);
    const bpBuildStagedOnly = item.classification === 'bp_build_request' && item.status === 'staged';

    return {
      ok: true,
      inbox_item_id: item.id,
      classification: item.classification,
      status: item.status,
      approved,
      bp_build_staged_only: bpBuildStagedOnly,
      requires_terminal: item.classification === 'bp_build_request',
    };
  }

  return { captureAndGate, inbox };
}

export function runBpbIntakeGateForMission(missionId, opts = {}) {
  return import('../factory-staging/factory-core/bpb/intake-gate.js').then((mod) =>
    mod.runBpbIntakeGate(missionId, { skip_if_missing: true, ...opts }),
  );
}

export function formatInboxGateBlocker(gate) {
  if (!gate || gate.skipped || gate.private) return null;
  if (gate.bp_build_staged_only) {
    return `Action Inbox item #${gate.inbox_item_id} is staged (bp_build_request). Say "execute it" to run the terminal pipeline.`;
  }
  return null;
}
