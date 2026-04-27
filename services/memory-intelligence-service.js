/**
 * Memory Intelligence Service — Evidence Ladder + Institutional Knowledge
 *
 * Implements the epistemic fact store, lesson library, debate records,
 * agent performance/routing, protocol violations, task authority,
 * and intent drift logging.
 *
 * Design principle: not "what do we know?" but
 * "what has earned the right to influence action, at what weight, in this context?"
 *
 * Evidence Ladder (NEVER call level 6 "LAW" — that is the governance ladder):
 *   0=CLAIM, 1=HYPOTHESIS, 2=TESTED, 3=RECEIPT, 4=VERIFIED, 5=FACT, 6=INVARIANT
 *
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */

'use strict';

// ─── Level constants ──────────────────────────────────────────────────────────

export const LEVEL = Object.freeze({
  CLAIM:      0,
  HYPOTHESIS: 1,
  TESTED:     2,
  RECEIPT:    3,
  VERIFIED:   4,
  FACT:       5,
  INVARIANT:  6,
});

export const LEVEL_LABEL = Object.freeze({
  0: 'CLAIM',
  1: 'HYPOTHESIS',
  2: 'TESTED',
  3: 'RECEIPT',
  4: 'VERIFIED',
  5: 'FACT',
  6: 'INVARIANT',
});

export const AUTHORITY_STATUS = Object.freeze({
  ALLOWED: 'allowed',
  WATCH: 'watch',
  BLOCKED: 'blocked',
});

export const VIOLATION_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

// Minimum adversarial trials before a fact can be promoted to INVARIANT
const INVARIANT_MIN_ADVERSARIAL = 3;
// Minimum independent sources before VERIFIED
const VERIFIED_MIN_SOURCES = 2;
// Low-quality adversarial theater should not count toward invariants.
const MIN_SUBSTANTIVE_ADVERSARIAL_QUALITY = 3;
const DEFAULT_ROUTING_CONFIDENCE = 0.55;

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMemoryIntelligenceService(pool, logger) {
  if (!pool) throw new Error('memory-intelligence-service: pool is required');

  function normalizeAuthorityStatus(status) {
    const value = String(status || '').toLowerCase();
    if (Object.values(AUTHORITY_STATUS).includes(value)) return value;
    return AUTHORITY_STATUS.ALLOWED;
  }

  function normalizeSeverity(severity) {
    const value = String(severity || '').toLowerCase();
    if (Object.values(VIOLATION_SEVERITY).includes(value)) return value;
    return VIOLATION_SEVERITY.MEDIUM;
  }

  function normalizeAutoAction(action) {
    const value = String(action || '').toLowerCase();
    if (value === 'none') return 'none';
    if (value === 'watch') return AUTHORITY_STATUS.WATCH;
    if (value === 'block' || value === 'blocked') return AUTHORITY_STATUS.BLOCKED;
    if (value === 'allow' || value === 'allowed') return AUTHORITY_STATUS.ALLOWED;
    return 'none';
  }

  function defaultAutoActionForSeverity(severity) {
    const normalized = normalizeSeverity(severity);
    if (normalized === VIOLATION_SEVERITY.CRITICAL || normalized === VIOLATION_SEVERITY.HIGH) {
      return AUTHORITY_STATUS.BLOCKED;
    }
    if (normalized === VIOLATION_SEVERITY.MEDIUM) {
      return AUTHORITY_STATUS.WATCH;
    }
    return 'none';
  }

  // ─── Facts ───────────────────────────────────────────────────────────────

  /**
   * Record a new epistemic fact.
   * Level defaults to CLAIM (0); provide a higher level only with supporting evidence_text.
   */
  async function recordFact({
    text,
    domain = 'operational',
    level = LEVEL.CLAIM,
    contextRequired = null,
    falseWhen = null,
    disproofRecipe = null,
    visibilityClass = 'internal',
    residueRisk = null,
    reviewBy = null,
    createdBy = 'unknown',
  }) {
    const { rows } = await pool.query(
      `INSERT INTO epistemic_facts
         (text, domain, level, context_required, false_when, disproof_recipe,
          visibility_class, residue_risk, review_by, created_by, source_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0)
       RETURNING *`,
      [text, domain, level, contextRequired, falseWhen, disproofRecipe,
       visibilityClass, residueRisk ? JSON.stringify(residueRisk) : null,
       reviewBy, createdBy],
    );
    logger?.info({ factId: rows[0].id, level, domain }, 'epistemic_fact recorded');
    return rows[0];
  }

  /**
   * Retrieve a fact by id, including its current level label.
   */
  async function getFact(id) {
    const { rows } = await pool.query(
      `SELECT f.*,
              (SELECT COUNT(*) FROM fact_evidence WHERE fact_id = f.id) AS evidence_count
       FROM epistemic_facts f
       WHERE f.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return { ...rows[0], level_label: LEVEL_LABEL[rows[0].level] };
  }

  /**
   * Query facts with context-weighted relevance scoring.
   * Returns facts at or above minLevel, weighted by level × context_match × recency.
   */
  async function queryFacts({
    context = null,
    domain = null,
    minLevel = LEVEL.CLAIM,
    limit = 20,
    visibilityClass = 'internal',
  } = {}) {
    const conditions = ['f.level >= $1', 'f.visibility_class = $2'];
    const params = [minLevel, visibilityClass];
    let idx = 3;

    if (domain) {
      conditions.push(`f.domain = $${idx++}`);
      params.push(domain);
    }

    const { rows } = await pool.query(
      `SELECT f.*,
              -- Context match score: 1.0 if no context_required, else 0.5 (partial)
              CASE
                WHEN f.context_required IS NULL THEN 1.0
                WHEN $${idx}::text IS NOT NULL
                 AND f.context_required ILIKE '%' || $${idx}::text || '%' THEN 1.0
                ELSE 0.5
              END AS context_score,
              -- Recency score: decay toward 0.5 after 90 days
              GREATEST(0.5, 1.0 - EXTRACT(EPOCH FROM (NOW() - COALESCE(f.last_tested_at, f.created_at))) / (90*86400.0)) AS recency_score
       FROM epistemic_facts f
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         (
           f.level
           * CASE
               WHEN f.context_required IS NULL THEN 1.0
               WHEN $${idx}::text IS NOT NULL
                AND f.context_required ILIKE '%' || $${idx}::text || '%' THEN 1.0
               ELSE 0.5
             END
           * GREATEST(0.5, 1.0 - EXTRACT(EPOCH FROM (NOW() - COALESCE(f.last_tested_at, f.created_at))) / (90*86400.0))
         ) DESC,
         f.exception_count ASC,
         COALESCE(f.last_tested_at, f.created_at) DESC
       LIMIT $${idx + 1}`,
      [...params, context, limit],
    );
    return rows.map(r => ({ ...r, level_label: LEVEL_LABEL[r.level] }));
  }

  // ─── Evidence + promotions ────────────────────────────────────────────────

  /**
   * Add evidence to a fact. May trigger automatic promotion or demotion.
   * Returns { fact, evidence, levelChanged, newLevel }.
   */
  async function addEvidence(factId, {
    eventType,           // confirmation | exception | adversarial | operator_override | ci_pass | ci_fail | replay
    result,              // confirmed | failed | held | overridden | inconclusive
    evidenceText,
    source = 'unknown',
    sourceIsIndependent = false,
    adversarialQuality = null,
    overrideReason = null,
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert evidence row
      const evRes = await client.query(
        `INSERT INTO fact_evidence
           (fact_id, event_type, result, evidence_text, source, source_is_independent, adversarial_quality, override_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [factId, eventType, result, evidenceText, source, sourceIsIndependent, adversarialQuality, overrideReason],
      );
      const evidence = evRes.rows[0];

      // Recalculate counters from evidence so retries and repeated sources do not inflate confidence.
      const countsRes = await client.query(
        `SELECT
           COUNT(*)::INTEGER AS trial_count,
           COUNT(*) FILTER (
             WHERE event_type = 'adversarial'
               AND COALESCE(adversarial_quality, 0) >= $2
           )::INTEGER AS adversarial_count,
           COUNT(*) FILTER (WHERE result = 'failed')::INTEGER AS exception_count,
           COUNT(DISTINCT source) FILTER (
             WHERE source_is_independent
               AND NULLIF(BTRIM(COALESCE(source, '')), '') IS NOT NULL
           )::INTEGER AS source_count
         FROM fact_evidence
         WHERE fact_id = $1`,
        [factId, MIN_SUBSTANTIVE_ADVERSARIAL_QUALITY],
      );
      const counts = countsRes.rows[0];

      await client.query(
        `UPDATE epistemic_facts SET
           trial_count       = $1,
           adversarial_count = $2,
           exception_count   = $3,
           source_count      = $4,
           last_tested_at    = NOW(),
           updated_at        = NOW()
         WHERE id = $5`,
        [
          counts.trial_count,
          counts.adversarial_count,
          counts.exception_count,
          counts.source_count,
          factId,
        ],
      );

      // Read current fact state
      const factRes = await client.query('SELECT * FROM epistemic_facts WHERE id = $1', [factId]);
      const fact = factRes.rows[0];

      // Automatic demotion: any exception immediately triggers re-evaluation
      let newLevel = fact.level;
      if (result === 'failed' && fact.level > LEVEL.TESTED) {
        newLevel = LEVEL.TESTED; // step back; fact must re-earn
        await _recordLevelChange(client, factId, fact.level, newLevel,
          `exception recorded: ${evidenceText.slice(0, 120)}`, evidence.id, source);
      }
      // Automatic promotion checks (conservative — never auto-promote to INVARIANT without adversarial gate)
      else if (result === 'confirmed' && sourceIsIndependent && fact.level === LEVEL.TESTED) {
        if (fact.source_count >= VERIFIED_MIN_SOURCES) {
          newLevel = LEVEL.VERIFIED;
          await _recordLevelChange(client, factId, fact.level, newLevel,
            `${VERIFIED_MIN_SOURCES}+ independent sources confirmed`, evidence.id, source);
        }
      }

      await client.query('COMMIT');
      logger?.info({ factId, eventType, result, newLevel }, 'fact_evidence added');
      return { fact: { ...fact, level: newLevel }, evidence, levelChanged: newLevel !== fact.level, newLevel };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Manually promote a fact one level (requires evidence_id justifying it).
   * INVARIANT requires adversarial_count >= INVARIANT_MIN_ADVERSARIAL and exception_count === 0.
   */
  async function promoteFact(factId, { reason, evidenceId = null, promotedBy = 'unknown' }) {
    const fact = await getFact(factId);
    if (!fact) throw new Error(`Fact ${factId} not found`);
    if (fact.level >= LEVEL.INVARIANT) throw new Error('Fact is already INVARIANT — highest evidence level');

    const toLevel = fact.level + 1;

    // Gate: INVARIANT requires adversarial history and zero exceptions
    if (toLevel === LEVEL.INVARIANT) {
      if (fact.adversarial_count < INVARIANT_MIN_ADVERSARIAL) {
        throw new Error(`INVARIANT requires >= ${INVARIANT_MIN_ADVERSARIAL} adversarial trials; current: ${fact.adversarial_count}`);
      }
      if (fact.exception_count > 0) {
        throw new Error(`INVARIANT requires zero exceptions; current exception_count: ${fact.exception_count}`);
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await _recordLevelChange(client, factId, fact.level, toLevel, reason, evidenceId, promotedBy);
      await client.query('COMMIT');
      logger?.info({ factId, from: fact.level, to: toLevel }, 'fact promoted');
      return { factId, from: fact.level, to: toLevel, label: LEVEL_LABEL[toLevel] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Demote a fact (immediate; any exception should trigger this).
   */
  async function demoteFact(factId, { toLevel, reason, evidenceId = null, demotedBy = 'unknown' }) {
    const fact = await getFact(factId);
    if (!fact) throw new Error(`Fact ${factId} not found`);
    if (toLevel >= fact.level) throw new Error('toLevel must be lower than current level for demotion');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await _recordLevelChange(client, factId, fact.level, toLevel, reason, evidenceId, demotedBy);
      await client.query('COMMIT');
      logger?.info({ factId, from: fact.level, to: toLevel }, 'fact demoted');
      return { factId, from: fact.level, to: toLevel, label: LEVEL_LABEL[toLevel] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function _recordLevelChange(client, factId, fromLevel, toLevel, reason, evidenceId, changedBy) {
    await client.query(
      `INSERT INTO fact_level_history (fact_id, from_level, to_level, reason, evidence_id, changed_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [factId, fromLevel, toLevel, reason, evidenceId, changedBy],
    );
    await client.query(
      'UPDATE epistemic_facts SET level = $1, updated_at = NOW() WHERE id = $2',
      [toLevel, factId],
    );
  }

  // ─── Retrieval tracking ───────────────────────────────────────────────────

  async function recordRetrieval(factId, { retrievedBy = 'unknown', context = null, actedOn = null }) {
    await pool.query(
      `INSERT INTO retrieval_events (fact_id, retrieved_by, context, acted_on)
       VALUES ($1,$2,$3,$4)`,
      [factId, retrievedBy, context, actedOn],
    );
    // Increment retrieval count on the lesson if this was a lesson
    // (facts don't have retrieval_count; retrieval_events is the source)
  }

  // ─── Debates ─────────────────────────────────────────────────────────────

  /**
   * Record a full debate record — including positions, arguments, what moved minds,
   * consensus, lessons, and residue (minority view that survived).
   */
  async function recordDebate({
    subject,
    relatedFactId = null,
    initialPositions = [],   // [{ agent, position, confidence, evidence_citations }]
    arguments: args = [],    // [{ agent, argument, type, timestamp }]
    whatMovedMinds = null,
    consensus = null,
    consensusMethod = null,
    consensusReachedBy = null,
    lessonsLearned = null,
    problemClass = null,
    residueRisk = null,
    futureLookback = null,
    councilRunId = null,
    durationMinutes = null,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO debate_records
         (subject, related_fact_id, initial_positions, arguments, what_moved_minds,
          consensus, consensus_method, consensus_reached_by, lessons_learned,
          problem_class, residue_risk, future_lookback, council_run_id, duration_minutes, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               CASE WHEN $6 IS NOT NULL THEN NOW() ELSE NULL END)
       RETURNING *`,
      [subject, relatedFactId,
       JSON.stringify(initialPositions), JSON.stringify(args),
       whatMovedMinds, consensus, consensusMethod, consensusReachedBy,
       lessonsLearned, problemClass,
       residueRisk ? JSON.stringify(residueRisk) : null,
       futureLookback ? JSON.stringify(futureLookback) : null,
       councilRunId, durationMinutes],
    );
    logger?.info({ debateId: rows[0].id, subject }, 'debate recorded');
    return rows[0];
  }

  async function getDebatesByProblemClass(problemClass, limit = 10) {
    const { rows } = await pool.query(
      `SELECT * FROM debate_records
       WHERE ($1::text IS NULL OR problem_class = $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [problemClass, limit],
    );
    return rows;
  }

  // ─── Lessons ─────────────────────────────────────────────────────────────

  async function recordLesson({
    domain,
    impactClass = 'medium',  // small | medium | large | unknown
    problem,
    solution,
    howNovel = null,
    surfacedBy = 'unknown',
    tags = [],
    writeCostTokens = null,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO lessons_learned
         (domain, impact_class, problem, solution, how_novel, surfaced_by, tags, write_cost_tokens)
       VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8)
       RETURNING *`,
      [domain, impactClass, problem, solution, howNovel, surfacedBy,
       Array.isArray(tags) ? tags : [],
       writeCostTokens],
    );
    logger?.info({ lessonId: rows[0].id, domain, impactClass }, 'lesson recorded');
    return rows[0];
  }

  async function getLessonsByDomain(domain, limit = 20) {
    const { rows } = await pool.query(
      `SELECT * FROM lessons_learned
       WHERE domain = $1
       ORDER BY
         retrieval_count DESC,
         CASE impact_class
           WHEN 'large' THEN 3
           WHEN 'medium' THEN 2
           WHEN 'small' THEN 1
           ELSE 0
         END DESC,
         created_at DESC
       LIMIT $2`,
      [domain, limit],
    );
    // Increment retrieval counts
    if (rows.length) {
      await pool.query(
        `UPDATE lessons_learned SET retrieval_count = retrieval_count + 1, last_retrieved_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [rows.map(r => r.id)],
      );
    }
    return rows;
  }

  // ─── Agent performance ────────────────────────────────────────────────────

  async function recordAgentPerformance({
    agentId,        // "claude_code" | "cursor" | "adam" | etc.
    taskType,
    prediction = null,
    outcome,        // correct | incorrect | partial | overridden
    confidenceAtTime = null,
    notes = null,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO agent_performance (agent_id, task_type, prediction, outcome, confidence_at_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [agentId, taskType, prediction, outcome, confidenceAtTime, notes],
    );
    return rows[0];
  }

  async function getAgentAccuracy(agentId, taskType = null) {
    const params = [agentId];
    const filter = taskType ? 'AND task_type = $2' : '';
    if (taskType) params.push(taskType);

    const { rows } = await pool.query(
      `SELECT
         agent_id,
         task_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE outcome = 'correct') AS correct,
         COUNT(*) FILTER (WHERE outcome = 'incorrect') AS incorrect,
         ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'correct') / NULLIF(COUNT(*), 0), 1) AS accuracy_pct
       FROM agent_performance
       WHERE agent_id = $1 ${filter}
       GROUP BY agent_id, task_type
       ORDER BY accuracy_pct DESC`,
      params,
    );
    return rows;
  }

  async function listProtocolViolations({ agentId = null, taskType = null, limit = 50 } = {}) {
    const params = [agentId, taskType, Math.min(Math.max(Number(limit) || 50, 1), 200)];
    const { rows } = await pool.query(
      `SELECT *
       FROM agent_protocol_violations
       WHERE ($1::text IS NULL OR agent_id = $1)
         AND ($2::text IS NULL OR task_type = $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      params,
    );
    return rows;
  }

  async function setTaskAuthority({
    agentId,
    taskType,
    authorityStatus = AUTHORITY_STATUS.ALLOWED,
    reason,
    notes = null,
    metadata = null,
    setBy = 'system',
    expiresAt = null,
  }) {
    if (!agentId) throw new Error('agentId is required');
    if (!taskType) throw new Error('taskType is required');
    if (!reason) throw new Error('reason is required');

    const status = normalizeAuthorityStatus(authorityStatus);
    const { rows } = await pool.query(
      `INSERT INTO agent_task_authority
         (agent_id, task_type, authority_status, reason, notes, metadata, set_by, expires_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (agent_id, task_type) DO UPDATE SET
         authority_status = EXCLUDED.authority_status,
         reason = EXCLUDED.reason,
         notes = EXCLUDED.notes,
         metadata = EXCLUDED.metadata,
         set_by = EXCLUDED.set_by,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING *`,
      [
        agentId,
        taskType,
        status,
        reason,
        notes,
        metadata ? JSON.stringify(metadata) : null,
        setBy,
        expiresAt,
      ],
    );
    logger?.warn({ agentId, taskType, authorityStatus: status }, 'agent_task_authority updated');
    return rows[0];
  }

  async function getTaskAuthority(agentId, taskType) {
    if (!agentId || !taskType) return null;
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (agent_id)
         *
       FROM agent_task_authority
       WHERE agent_id = $1
         AND task_type IN ($2, '*')
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY agent_id,
         CASE WHEN task_type = $2 THEN 0 ELSE 1 END,
         updated_at DESC`,
      [agentId, taskType],
    );
    return rows[0] || null;
  }

  async function listTaskAuthorities({ agentId = null, taskType = null, limit = 100 } = {}) {
    const params = [agentId, taskType, Math.min(Math.max(Number(limit) || 100, 1), 200)];
    const { rows } = await pool.query(
      `SELECT *
       FROM agent_task_authority
       WHERE ($1::text IS NULL OR agent_id = $1)
         AND ($2::text IS NULL OR task_type = $2)
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY updated_at DESC
       LIMIT $3`,
      params,
    );
    return rows;
  }

  async function recordProtocolViolation({
    agentId,
    taskType,
    violationType,
    severity = VIOLATION_SEVERITY.MEDIUM,
    details = null,
    evidenceText = null,
    detectedBy = 'system',
    sourceRoute = null,
    relatedFactId = null,
    relatedDebateId = null,
    asked = null,
    delivered = null,
    autoAction = null,
    authorityNotes = null,
    expiresAt = null,
  }) {
    if (!agentId) throw new Error('agentId is required');
    if (!taskType) throw new Error('taskType is required');
    if (!violationType) throw new Error('violationType is required');

    const normalizedSeverity = normalizeSeverity(severity);
    const authorityAction = autoAction == null
      ? defaultAutoActionForSeverity(normalizedSeverity)
      : normalizeAutoAction(autoAction);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const violationRes = await client.query(
        `INSERT INTO agent_protocol_violations
           (agent_id, task_type, violation_type, severity, details, evidence_text,
            detected_by, source_route, related_fact_id, related_debate_id, auto_action)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          agentId,
          taskType,
          violationType,
          normalizedSeverity,
          details,
          evidenceText,
          detectedBy,
          sourceRoute,
          relatedFactId,
          relatedDebateId,
          authorityAction === 'none' ? 'none' : authorityAction,
        ],
      );
      const violation = violationRes.rows[0];

      let drift = null;
      if (asked && delivered) {
        const driftRes = await client.query(
          `INSERT INTO intent_drift_events (asked, delivered, drift_reason, agent_id, related_fact_id)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING *`,
          [asked, delivered, details || violationType, agentId, relatedFactId],
        );
        drift = driftRes.rows[0];
      }

      let authority = null;
      if (authorityAction !== 'none') {
        const status = authorityAction === AUTHORITY_STATUS.BLOCKED
          ? AUTHORITY_STATUS.BLOCKED
          : AUTHORITY_STATUS.WATCH;
        const authorityRes = await client.query(
          `INSERT INTO agent_task_authority
             (agent_id, task_type, authority_status, reason, notes, set_by, expires_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (agent_id, task_type) DO UPDATE SET
             authority_status = EXCLUDED.authority_status,
             reason = EXCLUDED.reason,
             notes = EXCLUDED.notes,
             set_by = EXCLUDED.set_by,
             expires_at = EXCLUDED.expires_at,
             updated_at = NOW()
           RETURNING *`,
          [
            agentId,
            taskType,
            status,
            `Auto-${status} after ${normalizedSeverity} ${violationType}`,
            authorityNotes || details,
            detectedBy,
            expiresAt,
          ],
        );
        authority = authorityRes.rows[0];
      }

      await client.query('COMMIT');
      logger?.warn({ agentId, taskType, violationType, severity: normalizedSeverity, authorityAction }, 'agent_protocol_violation recorded');
      return { violation, authority, drift };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function getAuthorizedModelsForTask({ taskType, candidateModels = [], preferredModel = null } = {}) {
    const uniqueCandidates = [...new Set((candidateModels || []).map((m) => String(m || '').trim()).filter(Boolean))];
    if (!taskType || !uniqueCandidates.length) {
      return {
        orderedCandidates: uniqueCandidates,
        blockedCandidates: [],
        authorityByAgent: {},
        performanceByAgent: {},
      };
    }

    const authorityRows = await pool.query(
      `SELECT DISTINCT ON (agent_id)
         agent_id, task_type, authority_status, reason, notes, expires_at, updated_at
       FROM agent_task_authority
       WHERE agent_id = ANY($1::text[])
         AND task_type IN ($2, '*')
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY agent_id,
         CASE WHEN task_type = $2 THEN 0 ELSE 1 END,
         updated_at DESC`,
      [uniqueCandidates, taskType],
    );

    const authorityByAgent = Object.fromEntries(
      authorityRows.rows.map((row) => [row.agent_id, row]),
    );

    const performanceRows = await pool.query(
      `SELECT
         agent_id,
         COUNT(*)::INTEGER AS total,
         COUNT(*) FILTER (WHERE outcome = 'correct')::INTEGER AS correct,
         ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'correct') / NULLIF(COUNT(*), 0), 1) AS accuracy_pct
       FROM agent_performance
       WHERE agent_id = ANY($1::text[])
         AND task_type = $2
       GROUP BY agent_id`,
      [uniqueCandidates, taskType],
    );

    const performanceByAgent = Object.fromEntries(
      performanceRows.rows.map((row) => [row.agent_id, row]),
    );

    const scored = uniqueCandidates.map((agentId, index) => {
      const authority = authorityByAgent[agentId];
      const performance = performanceByAgent[agentId];
      const status = normalizeAuthorityStatus(authority?.authority_status);
      const total = Number(performance?.total || 0);
      const accuracy = total > 0 ? Number(performance?.accuracy_pct || 0) / 100 : DEFAULT_ROUTING_CONFIDENCE;
      const preferredBonus = preferredModel && preferredModel === agentId ? 0.02 : 0;
      const fallbackPenalty = index * 0.01;
      const watchPenalty = status === AUTHORITY_STATUS.WATCH ? 0.15 : 0;
      const blocked = status === AUTHORITY_STATUS.BLOCKED;
      const score = blocked ? -Infinity : accuracy + preferredBonus - fallbackPenalty - watchPenalty;
      return {
        agentId,
        status,
        authority,
        performance,
        blocked,
        score,
      };
    });

    const orderedCandidates = scored
      .filter((row) => !row.blocked)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.agentId);

    return {
      orderedCandidates,
      blockedCandidates: scored.filter((row) => row.blocked).map((row) => row.agentId),
      authorityByAgent,
      performanceByAgent,
    };
  }

  async function getRoutingRecommendation({ taskType, proposedModel = null, candidateModels = [] } = {}) {
    const routing = await getAuthorizedModelsForTask({
      taskType,
      candidateModels,
      preferredModel: proposedModel,
    });
    const selectedModel = routing.orderedCandidates[0] || null;
    return {
      taskType,
      selectedModel,
      proposedModel,
      candidateModels,
      blockedCandidates: routing.blockedCandidates,
      authorityByAgent: routing.authorityByAgent,
      performanceByAgent: routing.performanceByAgent,
      reason: selectedModel
        ? `Selected ${selectedModel} based on task authority + historical reliability`
        : 'No authorized model is currently allowed for this task type',
    };
  }

  // ─── Intent drift ─────────────────────────────────────────────────────────

  async function recordIntentDrift({ asked, delivered, driftReason = null, agentId = null, relatedFactId = null }) {
    const { rows } = await pool.query(
      `INSERT INTO intent_drift_events (asked, delivered, drift_reason, agent_id, related_fact_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [asked, delivered, driftReason, agentId, relatedFactId],
    );
    logger?.warn({ driftId: rows[0].id }, '§2.11b INTENT DRIFT logged');
    return rows[0];
  }

  // ─── Stale hypothesis sweep ───────────────────────────────────────────────

  async function getStaleHypotheses() {
    const { rows } = await pool.query('SELECT * FROM stale_hypotheses');
    return rows;
  }

  // ─── Health / ROI ─────────────────────────────────────────────────────────

  async function getLessonROI(limit = 50) {
    const { rows } = await pool.query(`SELECT * FROM lesson_retrieval_roi LIMIT $1`, [limit]);
    return rows;
  }

  async function getSystemSummary() {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM epistemic_facts) AS total_facts,
        (SELECT COUNT(*) FROM epistemic_facts WHERE level = 6) AS invariants,
        (SELECT COUNT(*) FROM epistemic_facts WHERE level >= 4) AS verified_or_above,
        (SELECT COUNT(*) FROM epistemic_facts WHERE exception_count > 0) AS facts_with_exceptions,
        (SELECT COUNT(*) FROM debate_records) AS total_debates,
        (SELECT COUNT(*) FROM lessons_learned) AS total_lessons,
        (SELECT COUNT(*) FROM intent_drift_events WHERE NOT resolved) AS open_intent_drifts,
        (SELECT COUNT(*) FROM agent_protocol_violations) AS total_protocol_violations,
        (SELECT COUNT(*) FROM agent_task_authority WHERE authority_status = 'blocked' AND (expires_at IS NULL OR expires_at > NOW())) AS blocked_authorities,
        (SELECT COUNT(*) FROM stale_hypotheses) AS stale_hypotheses
    `);
    return rows[0];
  }

  return {
    // Facts
    recordFact,
    getFact,
    queryFacts,
    // Evidence + promotion/demotion
    addEvidence,
    promoteFact,
    demoteFact,
    recordRetrieval,
    // Debates
    recordDebate,
    getDebatesByProblemClass,
    // Lessons
    recordLesson,
    getLessonsByDomain,
    // Agent performance
    recordAgentPerformance,
    getAgentAccuracy,
    // Protocol violations + authority
    listProtocolViolations,
    recordProtocolViolation,
    setTaskAuthority,
    getTaskAuthority,
    listTaskAuthorities,
    getAuthorizedModelsForTask,
    getRoutingRecommendation,
    // Intent drift
    recordIntentDrift,
    // Maintenance
    getStaleHypotheses,
    getLessonROI,
    getSystemSummary,
    // Constants
    LEVEL,
    LEVEL_LABEL,
    AUTHORITY_STATUS,
    VIOLATION_SEVERITY,
  };
}
