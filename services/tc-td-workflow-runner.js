/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Named TransactionDesk browser workflows — credential session (GLVAR → SSO TD), not a public API.
 */

import runTransactionDeskPartySync from './tc-td-party-sync.js';

/** Operator-facing catalog (ids stable for API + portal). */
export const TD_WORKFLOW_CATALOG = [
  {
    id: 'sync_parties',
    summary: 'Open TD file → scrape mailto/participant rows → merge into tc_transactions.parties',
  },
  {
    id: 'ui_inspection_prep',
    summary: 'Open TD file → run UI click plan toward Documents / Forms / e-sign (screenshots every step)',
  },
  {
    id: 'full_inspection_file_sync',
    summary: 'sync_parties (persist) then same-session-style prep: second login runs ui_inspection_prep',
  },
  {
    id: 'scan_forms_catalog',
    summary: 'Open TD Forms library, scrape form inventory, and persist knowledge snapshot',
  },
];

export function createTDTDWorkflowRunner({ coordinator, logger = console, getAccountManager, formKnowledgeService = null }) {
  /**
   * @param {number} transactionId
   * @param {string} workflowId
   * @param {object} [options]
   * @param {(row: object) => void} [onStep]
   */
  async function runWorkflow(transactionId, workflowId, options = {}, onStep = () => {}) {
    const tx = await coordinator.getTransaction(transactionId);
    if (!tx) throw new Error('Transaction not found');

    const { createTCBrowserAgent } = await import('./tc-browser-agent.js');
    const accountManager = await getAccountManager();
    const tcBrowser = createTCBrowserAgent({ accountManager, logger });

    const step = (label, extra = {}) => {
      const row = { at: new Date().toISOString(), label, ...extra };
      onStep(row);
      return row;
    };

    if (workflowId === 'sync_parties') {
      step('workflow_sync_parties_start', { transaction_id: transactionId });
      const r = await runTransactionDeskPartySync({
        coordinator,
        tcBrowser,
        logger,
        transactionId,
        dryRun: options.dry_run === true,
        overwriteParties: options.overwrite_parties === true,
        addressSearch: options.address_search || null,
      });
      step('workflow_sync_parties_end', { ok: r.ok });
      await coordinator.logEvent(transactionId, 'td_workflow_run', {
        workflow: workflowId,
        ok: r.ok,
        persisted: r.persisted,
      });
      return { ok: r.ok, workflow: workflowId, result: r };
    }

    if (workflowId === 'ui_inspection_prep') {
      const { session } = await tcBrowser.loginToGLVAR(false);
      try {
        step('glvar_login_ok');
        await tcBrowser.ensureOnTransactionDesk(session);
        step('transaction_desk_ready', { url: session.page.url() });
        await tcBrowser.openTransactionDeskFile(session, {
          transactionDeskId: tx.transaction_desk_id,
          addressSearch: options.address_search || tx.address,
        });
        step('td_file_open', { url: session.page.url() });
        const planKey = options.plan || 'inspection_seller_signing_prep';
        const exec = await tcBrowser.applyTransactionDeskUiPlan(session, planKey);
        step('ui_plan_complete', { plan: planKey });
        await coordinator.logEvent(transactionId, 'td_workflow_run', {
          workflow: workflowId,
          ok: true,
          plan: planKey,
        });
        return { ok: true, workflow: workflowId, plan: planKey, exec };
      } finally {
        await session?.close?.();
      }
    }

    if (workflowId === 'full_inspection_file_sync') {
      step('full_chain_start');
      const sync = await runTransactionDeskPartySync({
        coordinator,
        tcBrowser,
        logger,
        transactionId,
        dryRun: options.parties_dry_run === true,
        overwriteParties: options.overwrite_parties === true,
        addressSearch: options.address_search || null,
      });
      step('party_sync_finished', { ok: sync.ok });
      if (!sync.ok) {
        await coordinator.logEvent(transactionId, 'td_workflow_run', {
          workflow: workflowId,
          ok: false,
          phase: 'party_sync',
          error: sync.error,
        });
        return { ok: false, workflow: workflowId, sync, ui: null };
      }

      const txFresh = await coordinator.getTransaction(transactionId);
      const { session } = await tcBrowser.loginToGLVAR(false);
      try {
        await tcBrowser.ensureOnTransactionDesk(session);
        step('td_second_session_ready');
        await tcBrowser.openTransactionDeskFile(session, {
          transactionDeskId: txFresh.transaction_desk_id,
          addressSearch: options.address_search || txFresh.address,
        });
        const planKey = options.plan || 'inspection_seller_signing_prep';
        const exec = await tcBrowser.applyTransactionDeskUiPlan(session, planKey);
        step('full_chain_ui_done', { plan: planKey });
        await coordinator.logEvent(transactionId, 'td_workflow_run', {
          workflow: workflowId,
          ok: true,
          plan: planKey,
        });
        return { ok: true, workflow: workflowId, sync, ui: exec };
      } finally {
        await session?.close?.();
      }
    }

    if (workflowId === 'scan_forms_catalog') {
      const { session } = await tcBrowser.loginToGLVAR(false);
      try {
        step('glvar_login_ok');
        await tcBrowser.ensureOnTransactionDesk(session);
        step('transaction_desk_ready', { url: session.page.url() });
        await tcBrowser.openTransactionDeskFile(session, {
          transactionDeskId: tx.transaction_desk_id,
          addressSearch: options.address_search || tx.address,
        });
        step('td_file_open', { url: session.page.url() });
        const scan = await tcBrowser.scrapeTransactionDeskFormsCatalog(session, {
          maxRows: options.max_rows || 800,
        });
        step('forms_catalog_scraped', { count: scan.count });

        const includeMachineFields = options.include_machine_fields === true;
        const maxSchemas = Math.max(1, Math.min(80, Number(options.max_schema_forms) || 25));
        const schemaRows = [];
        if (includeMachineFields && scan.forms?.length) {
          for (const form of scan.forms.slice(0, maxSchemas)) {
            try {
              const field = await tcBrowser.scrapeTransactionDeskFormFieldSchema(session, {
                formName: form.name,
                maxFields: options.max_fields_per_form || 300,
              });
              schemaRows.push({
                name: form.name,
                machine_schema: field.schema,
                field_count: field.schema?.field_count || 0,
                confidence: field.open?.ok ? 0.75 : 0.45,
              });
            } catch (err) {
              schemaRows.push({
                name: form.name,
                machine_schema: {
                  error: err.message,
                },
                field_count: 0,
                confidence: 0.2,
              });
            }
          }
          step('forms_machine_schema_scraped', { forms: schemaRows.length });
        }

        let persisted = null;
        let generatedPlaybooks = null;
        if (formKnowledgeService && options.persist !== false) {
          const mergedRows = scan.forms.map((f) => {
            const schema = schemaRows.find((s) => s.name === f.name);
            return {
              ...f,
              machine_schema: schema?.machine_schema || {},
              confidence: schema?.confidence ?? null,
            };
          });
          persisted = await formKnowledgeService.upsertSnapshot(transactionId, mergedRows, {
            source: 'td_form_catalog',
          });
          step('forms_catalog_persisted', { saved: persisted.length });
          if (options.infer_playbooks === true) {
            generatedPlaybooks = await formKnowledgeService.generatePlaybooks({
              transactionId,
              limit: options.playbook_limit || 500,
              overwrite: options.playbook_overwrite === true,
            });
            step('forms_playbooks_inferred', { updated: generatedPlaybooks.updated_count });
          }
        }

        await coordinator.logEvent(transactionId, 'td_workflow_run', {
          workflow: workflowId,
          ok: true,
          forms_found: scan.count,
          persisted: persisted?.length || 0,
        });
        return {
          ok: true,
          workflow: workflowId,
          scan,
          schema_rows: schemaRows.length,
          persisted_count: persisted?.length || 0,
          playbooks_generated: generatedPlaybooks?.updated_count || 0,
        };
      } finally {
        await session?.close?.();
      }
    }

    const known = TD_WORKFLOW_CATALOG.map((w) => w.id).join(', ');
    throw new Error(`Unknown workflow "${workflowId}". Use one of: ${known}`);
  }

  return { runWorkflow, TD_WORKFLOW_CATALOG };
}

export default createTDTDWorkflowRunner;
