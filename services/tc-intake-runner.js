/**
 * SYNOPSIS: Exports runIntake — services/tc-intake-runner.js.
 */
export async function runIntake(deps, { transactionId, emailMessageId }) {
  const {
    pool,
    db,
    logger,
    callCouncilMember,
    skySlopeAgent,
  } = deps || {};

  const sql = db || pool;
  if (!sql || typeof sql.query !== 'function') {
    throw new Error('runIntake requires deps.db or deps.pool with query()');
  }
  if (!transactionId || !emailMessageId) {
    throw new Error('runIntake requires transactionId and emailMessageId');
  }

  const runLog = [];
  const log = (level, message, data) => {
    runLog.push({ ts: new Date().toISOString(), level, message, data: data ?? null });
    if (logger && typeof logger[level] === 'function') {
      logger[level](message, data ?? {});
    }
  };

  const readTransaction = async () => {
    const res = await sql.query(
      `SELECT *
       FROM tc_transactions
       WHERE id = $1 OR mls_number = $1
       LIMIT 1`,
      [transactionId]
    );
    return res.rows[0] || null;
  };

  const readEmailEvent = async () => {
    const res = await sql.query(
      `SELECT *
       FROM email_events
       WHERE id = $1 OR message_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [emailMessageId]
    );
    return res.rows[0] || null;
  };

  const insertIntakeRun = async (status, skyslopeFileId = null) => {
    const res = await sql.query(
      `INSERT INTO intake_runs (transaction_id, email_message_id, skyslope_file_id, status, run_log)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [String(transactionId), String(emailMessageId), skyslopeFileId, status, JSON.stringify(runLog)]
    );
    return res.rows[0]?.id || null;
  };

  const updateIntakeRun = async (intakeRunId, status, skyslopeFileId = null) => {
    await sql.query(
      `UPDATE intake_runs
       SET status = $2,
           skyslope_file_id = COALESCE($3, skyslope_file_id),
           run_log = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [intakeRunId, status, skyslopeFileId, JSON.stringify(runLog)]
    );
  };

  const saveQaResults = async (intakeRunId, qaResults) => {
    const rows = Array.isArray(qaResults) ? qaResults : [];
    for (const result of rows) {
      await sql.query(
        `INSERT INTO document_qa_results (intake_run_id, document_name, issues, passed)
         VALUES ($1, $2, $3, $4)`,
        [
          intakeRunId,
          result.documentName || result.document_name || 'unknown',
          JSON.stringify(result.issues || []),
          !!result.passed,
        ]
      );
    }
  };

  const transaction = await readTransaction();
  const emailEvent = await readEmailEvent();

  if (!transaction) {
    const intakeRunId = await insertIntakeRun('failed');
    log('error', 'Transaction not found for intake', { transactionId, emailMessageId });
    return {
      intakeRunId,
      status: 'failed',
      qaResults: [],
      skySlopeFileId: null,
    };
  }

  if (!emailEvent) {
    const intakeRunId = await insertIntakeRun('failed');
    log('error', 'Email event not found for intake', { transactionId, emailMessageId });
    return {
      intakeRunId,
      status: 'failed',
      qaResults: [],
      skySlopeFileId: null,
    };
  }

  const intakeRunId = await insertIntakeRun('processing');
  log('info', 'Intake run started', { intakeRunId, transactionId, emailMessageId });

  let qaResults = [];
  let skySlopeFileId = null;

  try {
    const prompt = [
      'You are performing document QA for a transaction intake.',
      'Check for missing signatures and missing fields.',
      'Return only JSON with shape: {"passed": boolean, "results":[{"documentName": string, "passed": boolean, "issues": string[]}] }',
      `Transaction: ${JSON.stringify(transaction)}`,
      `Email event: ${JSON.stringify(emailEvent)}`,
    ].join('\n\n');

    const qaRaw = await callCouncilMember('document-qa', prompt);
    let qaParsed;
    try {
      qaParsed = JSON.parse(qaRaw);
    } catch {
      qaParsed = { passed: false, results: [{ documentName: 'unknown', passed: false, issues: ['QA response was not valid JSON'] }] };
    }

    qaResults = Array.isArray(qaParsed.results) ? qaParsed.results : [];
    await saveQaResults(intakeRunId, qaResults);

    const qaPassed = !!qaParsed.passed && qaResults.every((r) => r.passed);
    log('info', 'Document QA completed', { intakeRunId, qaPassed, qaResults });

    if (!qaPassed) {
      await updateIntakeRun(intakeRunId, 'failed', null);
      return {
        intakeRunId,
        status: 'failed',
        qaResults,
        skySlopeFileId: null,
      };
    }

    if (!skySlopeAgent || typeof skySlopeAgent.uploadDocs !== 'function') {
      throw new Error('deps.skySlopeAgent.uploadDocs() is required when QA passes');
    }

    const uploadResult = await skySlopeAgent.uploadDocs({
      transaction,
      emailEvent,
      transactionId,
      emailMessageId,
      qaResults,
    });

    skySlopeFileId =
      uploadResult?.skySlopeFileId ??
      uploadResult?.fileId ??
      uploadResult?.id ??
      null;

    await updateIntakeRun(intakeRunId, 'completed', skySlopeFileId);
    log('info', 'SkySlope upload completed', { intakeRunId, skySlopeFileId });

    return {
      intakeRunId,
      status: 'completed',
      qaResults,
      skySlopeFileId,
    };
  } catch (error) {
    log('error', 'Intake run failed', { intakeRunId, error: error?.message || String(error) });
    try {
      await updateIntakeRun(intakeRunId, 'failed', skySlopeFileId);
    } catch (updateError) {
      log('error', 'Failed to persist failed intake run', { intakeRunId, error: updateError?.message || String(updateError) });
    }
    return {
      intakeRunId,
      status: 'failed',
      qaResults,
      skySlopeFileId,
    };
  }
}