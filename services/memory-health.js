/**
 * SYNOPSIS: services/memory-health.js
 */
// services/memory-health.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */

const getStaleCapsules = async (pool) => {
  const result = await pool.query(`
    SELECT COUNT(*)
    FROM memory_capsules
    WHERE review_by < NOW()
    AND status NOT IN ('QUARANTINED', 'DEPRECATED')
  `);
  return result.rows[0].count;
};

const getQuarantinedCapsules = async (pool) => {
  const result = await pool.query(`
    SELECT COUNT(*)
    FROM memory_capsules
    WHERE status = 'QUARANTINED'
  `);
  return result.rows[0].count;
};

const getContestedCapsules = async (pool) => {
  const result = await pool.query(`
    SELECT COUNT(*)
    FROM contradiction_records
    WHERE status IN ('open', 'contested', 'CONTESTED')
  `);
  return result.rows[0].count;
};

const getCitationRate = async (pool) => {
  const actedOnResult = await pool.query(`
    SELECT COUNT(CASE WHEN acted_on THEN 1 END) AS acted_on_count, COUNT(*) AS total_count
    FROM retrieval_events
    WHERE created_at > NOW() - INTERVAL '7 days'
  `);
  const { acted_on_count, total_count } = actedOnResult.rows[0];
  const retrievalCitationRate = total_count > 0 ? acted_on_count / total_count : 0;

  const sourcelessResult = await pool.query(`
    SELECT COUNT(*) FROM memory_capsules WHERE source_type IS NULL
  `);
  const candidateBacklogResult = await pool.query(`
    SELECT COUNT(*) FROM epistemic_facts WHERE level = 0
  `);

  return {
    retrieval_citation_rate: retrievalCitationRate,
    sourceless_count: sourcelessResult.rows[0].count,
    candidate_backlog_count: candidateBacklogResult.rows[0].count,
  };
};

const getHealthReport = async (pool) => {
  const [staleCapsules, quarantinedCapsules, contestedCapsules, citationRate] = await Promise.all([
    getStaleCapsules(pool),
    getQuarantinedCapsules(pool),
    getContestedCapsules(pool),
    getCitationRate(pool),
  ]);
  return {
    stale_count: staleCapsules,
    quarantined_count: quarantinedCapsules,
    contested_count: contestedCapsules,
    candidate_backlog_count: citationRate.candidate_backlog_count,
    sourceless_count: citationRate.sourceless_count,
    retrieval_citation_rate: citationRate.retrieval_citation_rate,
    abstention_count_last_7_days: 0,
    generated_at: new Date().toISOString(),
  };
};

export { getHealthReport, getStaleCapsules, getQuarantinedCapsules, getContestedCapsules, getCitationRate };
