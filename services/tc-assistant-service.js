/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-assistant-service.js
 *
 * Chat layer over TC workspace + transaction status, with optional council for open questions.
 */

export function createTCAssistantService({
  coordinator,
  getWorkspace,
  callCouncilMember = null,
  logger = console,
} = {}) {
  async function buildContext(transactionId) {
    const workspace = await getWorkspace();
    const ctx = {
      summary: workspace.summary,
      readiness: workspace.readiness?.readiness,
      blockers: workspace.readiness?.remaining_blockers || [],
      next_actions: workspace.next_actions || [],
      active_count: (workspace.active_transactions || []).length,
      transactions_preview: (workspace.active_transactions || []).slice(0, 15).map((t) => ({
        id: t.id,
        address: t.address,
        stage: t.stage,
        health: t.health_status,
        next: t.next_action,
      })),
    };
    if (transactionId && !Number.isNaN(transactionId)) {
      const report = await coordinator.generateStatusReport(transactionId);
      ctx.focus_transaction = report
        ? {
            id: report.transaction?.id,
            address: report.transaction?.address,
            stage: report.stage,
            health: report.health_status,
            next_action: report.next_action,
            waiting_on: report.waiting_on,
            missing_docs: report.missing_doc_count,
            blockers: report.blocker_count,
          }
        : null;
    }
    return ctx;
  }

  function coerceCouncilText(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
      return raw.response || raw.text || raw.content || raw.message || JSON.stringify(raw);
    }
    return String(raw);
  }

  async function answer({ message, transaction_id: transactionId = null, use_ai: useAi = true } = {}) {
    const text = String(message || '').trim();
    if (!text) {
      return {
        ok: true,
        reply:
          'Ask about **readiness**, **list files**, **workspace**, or a **transaction number** (e.g. file 12).',
        source: 'empty',
      };
    }

    const lower = text.toLowerCase();
    let tid =
      transactionId != null && transactionId !== ''
        ? parseInt(String(transactionId), 10)
        : null;
    if (Number.isNaN(tid)) tid = null;

    if (/^(hi|hello|hey)\b/.test(lower)) {
      return {
        ok: true,
        reply:
          'Hi. I read your TC workspace and files. Try **readiness**, **list files**, **workspace**, or **file 123**.',
        source: 'greeting',
      };
    }

    if (/help|what can you|\bcommands?\b/.test(lower)) {
      return {
        ok: true,
        reply: [
          '**TC assistant**',
          '- **Readiness** — IMAP, GLVAR, SkySlope',
          '- **List files** — active transactions',
          '- **Workspace** — intake summary',
          '- **File 42** — one-line status for ID 42',
          '',
          '**Mic:** dictation fills the box; **Dialog** speaks replies and can listen again after each answer (Chrome / Edge work best).',
        ].join('\n'),
        source: 'help',
      };
    }

    if (/readiness|credentials|imap|glvar|skyslope|setup|mailbox/.test(lower)) {
      const ws = await getWorkspace();
      const r = ws.readiness?.readiness || {};
      const lines = [
        `IMAP: ${r.imap_ready ? 'ready' : 'needs setup'}`,
        `GLVAR / TransactionDesk: ${r.glvar_ready ? 'ready' : 'needs setup'}`,
        `SkySlope (eXp Okta): ${r.skyslope_ready ? 'ready' : 'needs setup'}`,
      ];
      const nb = ws.readiness?.remaining_blockers || [];
      if (nb.length) lines.push(`Notes: ${nb.join(' · ')}`);
      return { ok: true, reply: lines.join('\n'), source: 'readiness' };
    }

    if (/\blist\b|\bactive\b|\btransactions?\b|\bfiles?\b|\bdeals?\b|\bpipeline\b/.test(lower)) {
      const ws = await getWorkspace();
      const txs = ws.active_transactions || [];
      if (!txs.length) {
        return { ok: true, reply: 'No active or pending TC files right now.', source: 'list' };
      }
      const lines = txs.slice(0, 25).map(
        (t) => `#${t.id} ${t.address || '—'} — ${t.stage || t.status} (${t.health_status || 'n/a'})`
      );
      return {
        ok: true,
        reply: `${txs.length} file(s):\n${lines.join('\n')}`,
        source: 'list',
      };
    }

    if (/workspace|intake|triage/.test(lower)) {
      const ws = await getWorkspace();
      const s = ws.summary || {};
      const na = ws.next_actions || [];
      return {
        ok: true,
        reply: [
          `Files: ${s.active_transactions ?? 0} active · Emails: ${s.actionable_emails ?? 0} actionable · Unmatched contracts: ${s.unmatched_contract_emails ?? 0}.`,
          na.length ? `Suggested next: ${na.join(' · ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        source: 'workspace',
      };
    }

    const idMatch = text.match(/\b(?:transaction|file|tx)?\s*#?(\d{1,9})\b/i);
    const resolvedId = tid || (idMatch ? parseInt(idMatch[1], 10) : null);
    if (resolvedId) {
      const report = await coordinator.generateStatusReport(resolvedId);
      if (!report) {
        return { ok: true, reply: `I do not find transaction ${resolvedId}.`, source: 'tx_missing' };
      }
      const t = report.transaction;
      return {
        ok: true,
        reply: [
          `File #${t.id} ${t.address || ''}`,
          `Stage ${report.stage}, health ${report.health_status}.`,
          `Next: ${report.next_action || '—'}`,
          `Waiting on: ${report.waiting_on || '—'}; missing docs: ${report.missing_doc_count ?? 0}; blockers: ${report.blocker_count ?? 0}.`,
        ].join(' '),
        source: 'transaction',
      };
    }

    const words = lower.split(/\s+/).filter((w) => w.length >= 4);
    if (words.length) {
      const ws = await getWorkspace();
      const txs = ws.active_transactions || [];
      const hits = txs.filter((t) => {
        const a = (t.address || '').toLowerCase();
        return words.some((w) => a.includes(w));
      });
      if (hits.length === 1) {
        return answer({ message: `file ${hits[0].id}`, transaction_id: hits[0].id, use_ai: useAi });
      }
      if (hits.length > 1) {
        return {
          ok: true,
          reply: `Several files match: ${hits.map((h) => `#${h.id} ${h.address}`).join('; ')}. Give me one ID.`,
          source: 'fuzzy',
        };
      }
    }

    if (useAi && typeof callCouncilMember === 'function') {
      try {
        const ctx = await buildContext(tid);
        const prompt = [
          'User question (real estate transaction coordinator):',
          text,
          '',
          'Data snapshot (JSON, authoritative):',
          JSON.stringify(ctx),
          '',
          'Answer in plain English, at most 8 sentences. Use only this JSON for facts. If data is missing, say what to check in the TC Agent Portal. No legal advice.',
        ].join('\n');
        const raw = await callCouncilMember('groq', prompt, { maxTokens: 400 });
        const reply = coerceCouncilText(raw).trim();
        if (reply) return { ok: true, reply, source: 'council' };
      } catch (err) {
        logger.warn?.({ err: err.message }, '[tc-assistant] council path failed');
      }
    }

    return {
      ok: true,
      reply:
        'Try **readiness**, **list files**, **workspace**, or **file** with a number. Open questions need the AI council (Groq) to be available.',
      source: 'fallback',
    };
  }

  return { answer, buildContext };
}

export default createTCAssistantService;
