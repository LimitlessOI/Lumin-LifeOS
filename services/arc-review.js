/**
 * SYNOPSIS: Exports createArcReviewService — services/arc-review.js.
 */
import { createHash } from 'node:crypto';

const REVIEW_STATUSES = new Set(['pending', 'reviewed', 'fixed', 'failed']);
const FINDING_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function clampLimit(limit, fallback = 50, max = 200) {
  const n = parseInt(limit, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function safeParseJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function buildBlueprintFingerprint(blueprint) {
  const text = typeof blueprint === 'string' ? blueprint : toJson(blueprint);
  return createHash('sha256').update(text).digest('hex');
}

function extractBlueprintText(blueprintRecord) {
  if (!blueprintRecord) return '';
  return normalizeText(
    blueprintRecord.blueprint_text ??
      blueprintRecord.content ??
      blueprintRecord.body ??
      blueprintRecord.raw_text ??
      blueprintRecord.definition ??
      '',
  );
}

function extractFindings(reviewRecord) {
  const direct =
    reviewRecord?.findings ??
    reviewRecord?.arc_findings ??
    reviewRecord?.metadata?.findings ??
    reviewRecord?.detail?.findings ??
    [];
  if (Array.isArray(direct)) return direct;
  if (typeof direct === 'string') {
    const parsed = safeParseJson(direct, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function normalizeFinding(finding, index) {
  if (!finding) {
    return {
      index,
      severity: 'low',
      title: `finding_${index + 1}`,
      description: '',
      suggestion: '',
    };
  }

  const severity = String(finding.severity || finding.level || 'low').toLowerCase();
  return {
    index,
    severity: FINDING_SEVERITIES.has(severity) ? severity : 'low',
    title: normalizeText(finding.title || finding.name || `finding_${index + 1}`),
    description: normalizeText(finding.description || finding.detail || finding.summary || ''),
    suggestion: normalizeText(finding.suggestion || finding.fix || finding.recommendation || ''),
    code: normalizeText(finding.code || finding.rule || finding.id || ''),
  };
}

function buildPrompt({ blueprintText, findings, blueprintId, reviewId }) {
  const findingsBlock = findings
    .map(
      (finding) =>
        `- [${finding.severity}] ${finding.title}${finding.code ? ` (${finding.code})` : ''}\n  description: ${finding.description || 'n/a'}\n  suggestion: ${finding.suggestion || 'n/a'}`,
    )
    .join('\n');

  return [
    'Auto-fix this blueprint based on ARC findings.',
    `Blueprint ID: ${blueprintId || 'unknown'}`,
    `Review ID: ${reviewId || 'unknown'}`,
    'Return the improved blueprint content only, with a brief summary of changes.',
    '',
    'ARC findings:',
    findingsBlock || '- none',
    '',
    'Current blueprint:',
    blueprintText || '',
  ].join('\n');
}

function buildPatchSummary({ findings, beforeText, afterText }) {
  return {
    findings_count: findings.length,
    before_hash: createHash('sha256').update(beforeText || '').digest('hex'),
    after_hash: createHash('sha256').update(afterText || '').digest('hex'),
    fixed_finding_titles: findings.map((f) => f.title),
  };
}

async function loadBlueprintById(pool, blueprintId) {
  const { rows } = await pool.query(
    `SELECT * FROM blueprints WHERE id = $1 LIMIT 1`,
    [blueprintId],
  );
  return rows[0] || null;
}

async function loadLatestArcReview(pool, blueprintId) {
  const { rows } = await pool.query(
    `SELECT * FROM arc_reviews
      WHERE blueprint_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [blueprintId],
  );
  return rows[0] || null;
}

export function createArcReviewService({ callCouncilMember }) {
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  return {
    async runArcReview({ pool, logger }, { blueprintId, reviewId = null, ownerId = null, actorId = null } = {}) {
      if (!pool || typeof pool.query !== 'function') {
        throw new Error('pool_required');
      }

      const resolvedBlueprintId = normalizeText(blueprintId);
      if (!resolvedBlueprintId) {
        const err = new Error('blueprint_id_required');
        err.status = 400;
        throw err;
      }

      const blueprint = await loadBlueprintById(pool, resolvedBlueprintId);
      if (!blueprint) {
        const err = new Error('blueprint_not_found');
        err.status = 404;
        throw err;
      }

      const review = reviewId
        ? await (async () => {
            const { rows } = await pool.query(
              `SELECT * FROM arc_reviews WHERE id = $1 AND blueprint_id = $2 LIMIT 1`,
              [reviewId, resolvedBlueprintId],
            );
            return rows[0] || null;
          })()
        : await loadLatestArcReview(pool, resolvedBlueprintId);

      if (!review) {
        const err = new Error('arc_review_not_found');
        err.status = 404;
        throw err;
      }

      const findings = extractFindings(review).map(normalizeFinding).filter(Boolean);
      const blueprintText = extractBlueprintText(blueprint);

      const prompt = buildPrompt({
        blueprintText,
        findings,
        blueprintId: resolvedBlueprintId,
        reviewId: review?.id || reviewId || null,
      });

      const aiResult = await callCouncilMember('openai', prompt, { taskType: 'general' });

      const aiText =
        typeof aiResult === 'string'
          ? aiResult
          : normalizeText(
              aiResult?.content ??
                aiResult?.text ??
                aiResult?.message ??
                aiResult?.output ??
                '',
            );

      const fixedBlueprintText = aiText || blueprintText;
      const patchSummary = buildPatchSummary({
        findings,
        beforeText: blueprintText,
        afterText: fixedBlueprintText,
      });

      const reviewStatus = findings.length ? 'reviewed' : 'reviewed';
      const resultMetadata = {
        arc_review_id: review.id,
        blueprint_id: resolvedBlueprintId,
        owner_id: ownerId || null,
        actor_id: actorId || null,
        findings: findings.map((f) => ({
          severity: f.severity,
          title: f.title,
          description: f.description,
          suggestion: f.suggestion,
          code: f.code || null,
        })),
        ai_provider: 'openai',
        ai_task_type: 'general',
        patch_summary: patchSummary,
      };

      const { rows: updatedRows } = await pool.query(
        `UPDATE blueprints
            SET blueprint_text = $2,
                updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [resolvedBlueprintId, fixedBlueprintText],
      );

      const updatedBlueprint = updatedRows[0] || blueprint;

      await pool.query(
        `UPDATE arc_reviews
            SET status = $2,
                fix_result = $3::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [
          review.id,
          reviewStatus,
          toJson({
            fixed: true,
            ...resultMetadata,
          }),
        ],
      );

      if (logger?.info) {
        logger.info(
          {
            blueprintId: resolvedBlueprintId,
            reviewId: review.id,
            findingsCount: findings.length,
          },
          'arc_review_auto_fix_complete',
        );
      }

      return {
        blueprint: updatedBlueprint,
        review: {
          ...review,
          status: reviewStatus,
          fix_result: resultMetadata,
        },
        changes: {
          before: blueprintText,
          after: fixedBlueprintText,
        },
        summary: patchSummary,
      };
    },
  };
}

export async function runArcReview(ctx, input = {}) {
  const service = createArcReviewService({
    callCouncilMember: input.callCouncilMember,
  });
  return service.runArcReview(ctx, input);
}