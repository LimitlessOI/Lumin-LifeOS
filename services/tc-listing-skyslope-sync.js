/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-listing-skyslope-sync.js
 *
 * Orchestrates: GLVAR → TransactionDesk → find file → download executed
 * listing agreement → eXp Okta → SkySlope upload.
 *
 * Each step is logged via onStep and optionally coordinator.logEvent for portal visibility.
 */

import path from 'path';
import fs from 'fs/promises';

import { createTCBrowserAgent } from './tc-browser-agent.js';
import { createTCDocIntake } from './tc-doc-intake.js';

export function createTCListingSkyslopeSync({ pool, coordinator, accountManager, logger = console }) {
  const tcBrowser = createTCBrowserAgent({ accountManager, logger });
  const docIntake = createTCDocIntake({ pool, tcBrowser, accountManager, logger });

  async function run({
    transactionId,
    addressSearch,
    filenameHints,
    dryRun = true,
    forceUpload = false,
    onStep,
  }) {
    const tx = await coordinator.getTransaction(transactionId);
    if (!tx) throw new Error(`Transaction ${transactionId} not found`);

    const search =
      String(addressSearch || '')
        .trim()
      || String(tx.address || '')
        .split(',')[0]
        .trim()
      || '';

    const push = (label, meta = {}) => {
      const row = { at: new Date().toISOString(), label, transaction_id: transactionId, ...meta };
      onStep?.(row);
      coordinator.logEvent(transactionId, 'listing_td_skyslope_sync', row).catch(() => {});
    };

    push('job_started', { dry_run: dryRun, address_search: search });

    let tdSession = null;
    let downloadedPath = null;

    try {
      push('glvar_login');
      const gl = await tcBrowser.loginToGLVAR(false);
      tdSession = gl.session;

      push('transactiondesk_nav', { screenshots: gl.screenshots?.slice(-1) });
      const ensure = await tcBrowser.ensureOnTransactionDesk(tdSession);
      push('transactiondesk_ready', { via: ensure.via, url: ensure.url });

      push('transactiondesk_search', { token: search });
      await tcBrowser.transactionDeskSearchAndOpenTransaction(tdSession, search);
      push('transactiondesk_file_open');

      if (dryRun) {
        const sp = path.join(
          '/tmp/tc-screenshots',
          `listing-sync-dry-run-${transactionId}-${Date.now()}.png`
        );
        await fs.mkdir('/tmp/tc-screenshots', { recursive: true });
        await tdSession.page.screenshot({ path: sp, fullPage: true }).catch(() => {});
        push('dry_run_complete', {
          screenshot: sp,
          message:
            'Dry run stopped after opening matched file. Set dry_run:false on the API to download and upload to SkySlope.',
        });
        return { ok: true, dryRun: true, search };
      }

      const downloadDir = `/tmp/td-listing-ag-${transactionId}-${Date.now()}`;
      const dl = await tcBrowser.downloadExecutedListingAgreementFromTD(tdSession, {
        downloadDir,
        filenameHints: filenameHints?.length ? filenameHints : ['listing', 'agreement', 'executed'],
      });
      downloadedPath = dl.filePath;
      push('document_downloaded', { path: downloadedPath });
    } finally {
      if (tdSession) await tdSession.close?.().catch(() => {});
    }

    push('skyslope_upload_start', { file: downloadedPath });
    const upload = await docIntake.uploadToSkySlope(
      [
        {
          filePath: downloadedPath,
          filename: path.basename(downloadedPath),
          docType: 'Executed Listing Agreement',
        },
      ],
      {
        address: tx.address,
        transactionName: tx.address,
        validateBeforeUpload: !forceUpload,
        forceUpload,
      }
    );

    if (upload.blocked && !forceUpload) {
      push('skyslope_upload_blocked', { validation: upload.validation });
    } else {
      push('skyslope_upload_finished', {
        uploaded: upload.uploaded,
        failed: upload.failed,
        ok: upload.ok,
      });
    }

    await coordinator.logEvent(transactionId, 'doc_uploaded', {
      source: 'listing_td_skyslope_sync',
      file: downloadedPath,
      skyslope: { uploaded: upload.uploaded, failed: upload.failed, blocked: upload.blocked },
    });

    if (downloadedPath) await fs.unlink(downloadedPath).catch(() => {});

    push('job_complete', { success: upload.ok && !upload.blocked });
    return { ok: upload.ok && !upload.blocked, dryRun: false, search, upload };
  }

  return { run };
}

export default createTCListingSkyslopeSync;
