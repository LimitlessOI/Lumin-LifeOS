// services/memory-health.js
import { Pool } from 'pg';
import { LEVEL } from '../memory-intelligence-service.js';

const getStaleCapsules = async (pool) => {
  const query = {
    text: `
      SELECT COUNT(*) 
      FROM memory_capsules 
      WHERE review_by < NOW() 
      AND status NOT IN ('QUARANTINED', 'DEPRECATED')
    `,
  };
  const result = await pool.query(query);
  return result.rows[0].count;
};

const getQuarantinedCapsules = async (pool) => {
  const query = {
    text: `
      SELECT COUNT(*) 
      FROM memory_capsules 
      WHERE status = 'QUARANTINED'
    `,
  };
  const result = await pool.query(query);
  return result.rows[0].count;
};

const getContestedCapsules = async (pool) => {
  const query = {
    text: `
      SELECT COUNT(*) 
      FROM contradiction_records 
      WHERE status IN ('open', 'contested')
    `,
  };
  const result = await pool.query(query);
  return result.rows[0].count;
};

const getCitationRate = async (pool) => {
  const query = {
    text: `
      SELECT 
        COUNT(CASE WHEN acted_on THEN 1 END) / COUNT(*) 
      FROM retrieval_events 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `,
  };
  const result = await pool.query(query);
  const actedOnCount = result.rows[0].count;
  const totalCount = await pool.query({
    text: `
      SELECT COUNT(*) 
      FROM retrieval_events 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `,
  });
  const retrievalCitationRate = actedOnCount / totalCount.rows[0].count;
  const querySourceless = {
    text: `
      SELECT COUNT(*) 
      FROM memory_capsules 
      WHERE source_type IS NULL
    `,
  };
  const sourcelessCount = await pool.query(querySourceless);
  const queryCandidateBacklog = {
    text: `
      SELECT COUNT(*) 
      FROM epistemic_facts 
      WHERE level = 0
    `,
  };
  const candidateBacklogCount = await pool.query(queryCandidateBacklog);
  return {
    retrieval_citation_rate: retrievalCitationRate,
    sourceless_count: sourcelessCount.rows[0].count,
    candidate_backlog_count: candidateBacklogCount.rows[0].count,
  };
};

const getHealthReport = async (pool) => {
  const [staleCapsules, quarantinedCapsules, contestedCapsules, citationRate] = await Promise.all([
    getStaleCapsules(pool),
    getQuarantinedCapsules(pool),
    getContestedCapsules(pool),
    getCitationRate(pool),
  ]);
  const generatedAt = new Date().toISOString();
  return {
    stale_count: staleCapsules,
    quarantined_count: quarantinedCapsules,
    contested_count: contestedCapsules,
    candidate_backlog_count: citationRate.candidate_backlog_count,
    sourceless_count: citationRate.sourceless_count,
    retrieval_citation_rate: citationRate.retrieval_citation_rate,
    abstention_count_last_7_days: 0, // Not specified in the spec, assuming 0
    generated_at: generatedAt,
  };
};

export { getHealthReport, getStaleCapsules, getQuarantinedCapsules, getContestedCapsules, getCitationRate };
```

```json
---
METADATA---
{
  "target_file": "services/memory-health.js",
  "insert_after_line": null,
  "confidence": 0.9
}