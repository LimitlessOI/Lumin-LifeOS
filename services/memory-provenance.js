// services/memory-provenance.js

import { pool } from '../services/memory-intelligence-service.js';

const buildProvenanceChain = async (capsuleId, retrievalLane, whyRetrieved, allowedUse, pool) => {
  if (!whyRetrieved || !allowedUse) {
    throw { halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED' };
  }

  const capsule = await pool.query('SELECT * FROM memory_capsules WHERE id = $1', [capsuleId]);
  if (!capsule.rows[0]) {
    throw { halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED', missing: 'capsule_id' };
  }

  const fact = await pool.query('SELECT * FROM epistemic_facts WHERE id = $1', [capsuleId]);
  if (!fact.rows[0]) {
    throw { halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED', missing: 'fact_id' };
  }

  const retrievalEvent = await pool.query('INSERT INTO retrieval_events (capsule_id, retrieval_lane, why_retrieved, allowed_use) VALUES ($1, $2, $3, $4) RETURNING *', [capsuleId, retrievalLane, whyRetrieved, allowedUse]);
  const retrievalEventId = retrievalEvent.rows[0].id;

  const provenance = {
    capsule_id: capsuleId,
    fact_id: capsuleId,
    title: capsule.rows[0].title,
    source_type: capsule.rows[0].source_type,
    source_ref: capsule.rows[0].source_ref,
    truth_class: capsule.rows[0].truth_class,
    trust_level: capsule.rows[0].trust_level,
    evidence_level: getEvidenceLevel(fact.rows[0].level),
    retrieval_lane: retrievalLane,
    retrieval_permission: capsule.rows[0].retrieval_permission,
    why_retrieved: whyRetrieved,
    allowed_use: allowedUse,
    is_legacy_import: capsule.rows[0].source_type === 'legacy_import',
    is_quarantined: capsule.rows[0].status === 'QUARANTINED',
    is_relationship_memory: capsule.rows[0].truth_class === 'relationship',
    requires_founder_confirmation: capsule.rows[0].truth_class === 'relationship' || capsule.rows[0].truth_class === 'emotional',
    retrieved_at: new Date(),
    retrieval_event_id: retrievalEventId,
  };

  return provenance;
};

const getEvidenceLevel = (level) => {
  switch (level) {
    case 0:
      return 'CLAIM';
    case 1:
      return 'HYPOTHESIS';
    case 2:
      return 'TESTED';
    case 3:
      return 'RECEIPT';
    case 4:
      return 'VERIFIED';
    case 5:
      return 'FACT';
    case 6:
      return 'INVARIANT';
    default:
      throw new Error(`Invalid evidence level: ${level}`);
  }
};

const validateProvenance = (chain) => {
  if (!chain.capsule_id || !chain.retrieval_lane || !chain.why_retrieved || !chain.allowed_use || !chain.retrieval_event_id) {
    throw { halt_code: 'MEMORY_RETRIEVAL_UNJUSTIFIED', missing: 'field' };
  }
};

export { buildProvenanceChain, validateProvenance };
```

```json
---
METADATA---
{
  "target_file": "services/memory-provenance.js",
  "insert_after_line": null,
  "confidence": 0.9
}