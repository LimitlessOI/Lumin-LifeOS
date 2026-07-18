/**
 * SYNOPSIS: Exports runIntakePipeline — services/tcIntakePipeline.mjs.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export async function runIntakePipeline(deps) {
  const processed = [];
  const errors = [];

  const log = deps?.logger ?? console;
  const db = deps?.db ?? deps?.pool;

  if (!db || typeof db.query !== 'function') {
    throw new Error('runIntakePipeline requires deps.db or deps.pool with query()');
  }
  if (typeof deps?.imapScan !== 'function') {
    throw new Error('runIntakePipeline requires deps.imapScan()');
  }
  if (typeof deps?.callCouncilMember !== 'function') {
    throw new Error('runIntakePipeline requires deps.callCouncilMember()');
  }
  if (typeof deps?.skySlopeAgent !== 'function') {
    throw new Error('runIntakePipeline requires deps.skySlopeAgent()');
  }

  const nowSql = 'NOW()';

  const safeJson = (value) => {
    try {
      return JSON.parse(JSON.stringify(value ?? null));
    } catch {
      return null;
    }
  };

  const buildPrompt = (email) => {
    const subject = email?.subject ?? '';
    const from = email?.from ?? '';
    const body = email?.text ?? email?.body ?? email?.snippet ?? '';
    const sentAt = email?.date ?? email?.sentAt ?? '';
    return [
      'You are tc-triage for transaction intake.',
      'Extract transaction intake details from this email.',
      'Return concise JSON only with keys:',
      'address, parties, dates, mls_number, purchase_price, transaction_status, confidence, notes, doc_names',
      'If unknown, use null or empty arrays.',
      `from: ${from}`,
      `subject: ${subject}`,
      `sent_at: ${sentAt}`,
      `body: ${body}`,
    ].join('\n');
  };

  const normalizeTxPayload = (email, triageText) => {
    let parsed = {};
    try {
      parsed = triageText ? JSON.parse(triageText) : {};
    } catch {
      parsed = {};
    }

    const address = parsed.address ?? email?.address ?? null;
    const mlsNumber = parsed.mls_number ?? email?.mls_number ?? null;
    const purchasePrice = parsed.purchase_price ?? email?.purchase_price ?? null;
    const status = parsed.transaction_status ?? 'intake';
    const agentRole = parsed.agent_role ?? null;

    return {
      mls_number: mlsNumber,
      address,
      purchase_price: purchasePrice,
      status,
      agent_role: agentRole,
      inspection_contingency: parsed.inspection_contingency ?? null,
      loan_contingency: parsed.loan_contingency ?? null,
      appraisal_contingency: parsed.appraisal_contingency ?? null,
      coe: parsed.coe ?? null,
      seller: parsed.seller ?? null,
      buyer_agent: parsed.buyer_agent ?? null,
      listing_agent: parsed.listing_agent ?? null,
      escrow: parsed.escrow ?? null,
      lender: parsed.lender ?? null,
      title: parsed.title ?? null,
      source_email_id: email?.id ?? null,
      updated_at: null,
    };
  };

  const insertOrUpdateTransaction = async (payload) => {
    const insertSql = `
      INSERT INTO tc_transactions (
        mls_number,
        address,
        purchase_price,
        status,
        agent_role,
        inspection_contingency,
        loan_contingency,
        appraisal_contingency,
        coe,
        seller,
        buyer_agent,
        listing_agent,
        escrow,
        lender,
        title,
        source_email_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING id
    `;
    const values = [
      payload.mls_number,
      payload.address,
      payload.purchase_price,
      payload.status,
      payload.agent_role,
      payload.inspection_contingency,
      payload.loan_contingency,
      payload.appraisal_contingency,
      payload.coe,
      payload.seller,
      payload.buyer_agent,
      payload.listing_agent,
      payload.escrow,
      payload.lender,
      payload.title,
      payload.source_email_id,
    ];
    try {
      const result = await db.query(insertSql, values);
      return result?.rows?.[0]?.id ?? null;
    } catch (err) {
      if (!payload.address && !payload.mls_number) throw err;
      const updateSql = `
        UPDATE tc_transactions
        SET
          purchase_price = COALESCE($3, purchase_price),
          status = COALESCE($4, status),
          agent_role = COALESCE($5, agent_role),
          inspection_contingency = COALESCE($6, inspection_contingency),
          loan_contingency = COALESCE($7, loan_contingency),
          appraisal_contingency = COALESCE($8, appraisal_contingency),
          coe = COALESCE($9, coe),
          seller = COALESCE($10, seller),
          buyer_agent = COALESCE($11, buyer_agent),
          listing_agent = COALESCE($12, listing_agent),
          escrow = COALESCE($13, escrow),
          lender = COALESCE($14, lender),
          title = COALESCE($15, title),
          source_email_id = COALESCE($16, source_email_id),
          updated_at = NOW()
        WHERE (mls_number IS NOT DISTINCT FROM $1)
           OR (address IS NOT DISTINCT FROM $2)
        RETURNING id
      `;
      const updateResult = await db.query(updateSql, values);
      return updateResult?.rows?.[0]?.id ?? null;
    }
  };

  const insertRunRecord = async (transactionId, emailMessageId, status, runLog) => {
    const tableCheck = await db.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'tc_intake_runs' LIMIT 1`
    );
    if (tableCheck.rowCount > 0) {
      await db.query(
        `INSERT INTO tc_intake_runs (transaction_id, email_message_id, status, run_log)
         VALUES ($1, $2, $3, $4)`,
        [transactionId, emailMessageId, status, safeJson(runLog)]
      );
      return;
    }
    await db.query(
      `INSERT INTO intake_runs (transaction_id, email_message_id, status, run_log)
       VALUES ($1, $2, $3, $4)`,
      [transactionId, emailMessageId, status, safeJson(runLog)]
    );
  };

  let emails = [];
  try {
    emails = await deps.imapScan();
  } catch (err) {
    log.error?.({ err }, 'imap scan failed');
    throw err;
  }

  for (const email of Array.isArray(emails) ? emails : []) {
    try {
      const prompt = buildPrompt(email);
      const triageText = await deps.callCouncilMember('tc-triage', prompt, { email });
      const txPayload = normalizeTxPayload(email, triageText);
      const transactionId = await insertOrUpdateTransaction(txPayload);

      let skySlopeResult = null;
      try {
        const docs = Array.isArray(email?.docs) ? email.docs : [];
        skySlopeResult = await deps.skySlopeAgent(transactionId, docs);
      } catch (err) {
        log.warn?.({ err, transactionId }, 'skyslope upload stub failed');
      }

      await insertRunRecord(transactionId, email?.id ?? null, 'completed', {
        email,
        triage: triageText,
        transactionId,
        skySlopeResult,
      });

      processed.push({
        email_id: email?.id ?? null,
        transaction_id: transactionId,
        status: 'completed',
      });
    } catch (err) {
      errors.push({
        email_id: email?.id ?? null,
        error: err?.message ?? String(err),
      });
      try {
        await insertRunRecord(null, email?.id ?? null, 'failed', {
          email,
          error: err?.message ?? String(err),
        });
      } catch (recordErr) {
        log.error?.({ err: recordErr, email_id: email?.id ?? null }, 'failed to record intake run');
      }
    }
  }

  return { processed, errors };
}

export default {
  runIntakePipeline,
};
