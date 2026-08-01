/**
 * SYNOPSIS: HTTP route module — LeadScoring.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
import { getScoringRubric } from '../services/leadScoring.js';

function applyScoringRubric(rubric, segmentPayload) {
  if (!rubric?.rubric) return { score: 0, segmentClassification: 'unknown' };

  let score = rubric.rubric.initialScore || 0;
  const { scoringRules, thresholds } = rubric.rubric;

  const getSegmentValue = (attribute) =>
    segmentPayload[attribute] !== undefined ? segmentPayload[attribute] : null;

  if (Array.isArray(scoringRules)) {
    for (const rule of scoringRules) {
      const segmentValue = getSegmentValue(rule.attribute);
      if (segmentValue === null) continue;

      if (rule.values && rule.values[segmentValue] !== undefined) {
        score += rule.values[segmentValue];
      } else if (rule.keywords && typeof segmentValue === 'string') {
        for (const keyword in rule.keywords) {
          if (segmentValue.toLowerCase().includes(keyword.toLowerCase())) {
            score += rule.keywords[keyword];
            break;
          }
        }
      } else if (rule.thresholds) {
        for (const threshold of rule.thresholds) {
          const inRange =
            (threshold.max === undefined || segmentValue <= threshold.max) &&
            (threshold.min === undefined || segmentValue >= threshold.min);
          if (inRange) {
            score += threshold.score !== undefined ? threshold.score : threshold.scoreModifier || 0;
            break;
          }
        }
      } else if (rule.value !== undefined && rule.score !== undefined) {
        if (segmentValue === rule.value) {
          score += rule.score;
        }
      }
    }
  }

  let segmentClassification = 'unknown';
  if (thresholds) {
    if (score >= (thresholds.hotLead?.minScore ?? 60)) {
      segmentClassification = 'hotLead';
    } else if (
      score >= (thresholds.warmLead?.minScore ?? 40) &&
      score <= (thresholds.warmLead?.maxScore ?? 59)
    ) {
      segmentClassification = 'warmLead';
    } else if (
      score >= (thresholds.coldLead?.minScore ?? 0) &&
      score <= (thresholds.coldLead?.maxScore ?? 39)
    ) {
      segmentClassification = 'coldLead';
    }
  }

  return {
    score,
    segmentClassification,
    segment: segmentPayload.segment || null,
    description: rubric.segmentDescription || null,
  };
}

export function registerLeadScoringRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;
  const { pool } = deps;

  async function scoreSegment(req, res) {
    try {
      const segmentPayload = req.body || {};
      if (!segmentPayload.segment) {
        return res.status(400).json({ ok: false, error: 'segment is required' });
      }

      const rubric = await getScoringRubric({ pool, logger }, segmentPayload);
      const result = applyScoringRubric(rubric, segmentPayload);
      res.json({ ok: true, result });
    } catch (error) {
      logger?.error?.({ error }, 'Lead scoring segment request failed');
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  // POST /api/v1/leadscoring/segment — score a lead segment using applyScoringRubric
  app.post('/api/v1/leadscoring/segment', requireKey, scoreSegment);

  logger?.info?.('Lead scoring routes registered at /api/v1/leadscoring/segment');
}
