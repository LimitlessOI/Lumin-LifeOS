/**
 * SYNOPSIS: Performs a security audit by querying various audit logs and security receipts.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
export async function performSecurityAudit(deps, payload) {
  const { pool, logger } = deps;
  const { auditId } = payload || {}; // Using a generic auditId for potential filtering

  try {
    const findings = [];

    // Query railway_env_sync_audit
    const { rows: railwayAuditRows } = await pool.query(
      'SELECT id, env_name, action, actor, status, details, created_at FROM railway_env_sync_audit WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    railwayAuditRows.forEach(row => findings.push({ type: 'railway_env_sync_audit', data: row }));

    // Query clientcare_audit_log
    const { rows: clientcareAuditRows } = await pool.query(
      'SELECT id, tenant_id, actor, action_type, entity_type, entity_id, details, created_at FROM clientcare_audit_log WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    clientcareAuditRows.forEach(row => findings.push({ type: 'clientcare_audit_log', data: row }));

    // Query conductor_builder_audit
    const { rows: conductorBuilderAuditRows } = await pool.query(
      'SELECT id, created_at, domain, task_preview, model_used, output_chars, cache_hit, placement_json FROM conductor_builder_audit WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    conductorBuilderAuditRows.forEach(row => findings.push({ type: 'conductor_builder_audit', data: row }));

    // Query kingsman_audit_log
    const { rows: kingsmanAuditRows } = await pool.query(
      'SELECT id, created_at, member, task_type, prompt_hash, risk_score, notes, timestamp, pattern, evidence, consensus FROM kingsman_audit_log WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    kingsmanAuditRows.forEach(row => findings.push({ type: 'kingsman_audit_log', data: row }));

    // Query builder_audit_receipts
    const { rows: builderAuditReceiptsRows } = await pool.query(
      'SELECT id, task_receipt_id, segment_id, project_slug, confidence_pct, findings, kill_test_scenario, or, written_by FROM builder_audit_receipts WHERE id = $1 OR $1 IS NULL ORDER BY id DESC LIMIT 100',
      [auditId]
    );
    builderAuditReceiptsRows.forEach(row => findings.push({ type: 'builder_audit_receipts', data: row }));

    // Query security_receipts
    const { rows: securityReceiptsRows } = await pool.query(
      'SELECT id, receipt_type, payload, created_at, owner_id, security_finding_receipt, severity, repro_steps, exact_fix_target, proof_limits FROM security_receipts WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    securityReceiptsRows.forEach(row => findings.push({ type: 'security_receipts', data: row }));

    // Query security_receipt_spine
    const { rows: securityReceiptSpineRows } = await pool.query(
      'SELECT id, created_at, updated_at, receipt_data FROM security_receipt_spine WHERE id = $1 OR $1 IS NULL ORDER BY created_at DESC LIMIT 100',
      [auditId]
    );
    securityReceiptSpineRows.forEach(row => findings.push({ type: 'security_receipt_spine', data: row }));

    // Query audit_logs
    const { rows: auditLogsRows } = await pool.query(
      'SELECT id, timestamp, prompt, response, actor, data_classification FROM audit_logs WHERE id = $1 OR $1 IS NULL ORDER BY timestamp DESC LIMIT 100',
      [auditId]
    );
    auditLogsRows.forEach(row => findings.push({ type: 'audit_logs', data: row }));

    // Return all collected findings
    return { auditId, findings, count: findings.length };
  } catch (error) {
    logger.error({ error, auditId }, 'Error in performSecurityAudit');
    throw new Error('Failed to perform security audit');
  }
}