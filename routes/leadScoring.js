/**
 * SYNOPSIS: Exposes a route to apply and return the scored segment description.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
import { getScoringRubric } from '../services/leadScoring.js';

// The applyScoringRubric function needs to be updated to use the actual rubric
// and perform the scoring logic based on the provided segment data.
// This function is moved here from the previous routes/leadScoring.js to be a
// local helper function for the new route.
function applyScoringRubric(rubric, segmentPayload) {
  let score = rubric.rubric.initialScore;
  const { scoringRules, thresholds } = rubric.rubric;

  // Helper to safely get a value from segmentPayload, defaulting to 0 or empty string
  const getSegmentValue = (attribute) => segmentPayload[attribute] !== undefined ? segmentPayload[attribute] : null;

  for (const rule of scoringRules) {
    const segmentValue = getSegmentValue(rule.attribute);

    if (segmentValue === null) {
      continue; // Skip if the attribute is not present in the payload
    }

    if (rule.values) {
      // Rule based on exact value matching (e.g., companySize, industry)
      if (rule.values[segmentValue] !== undefined) {
        score += rule.values[segmentValue];
      }
    } else if (rule.keywords) {
      // Rule based on keyword matching in a string (e.g., jobTitleKeywords)
      if (typeof segmentValue === 'string') {
        for (const keyword in rule.keywords) {
          if (segmentValue.toLowerCase().includes(keyword.toLowerCase())) {
            score += rule.keywords[keyword];
            break; // Apply only the first matching keyword score
          }
        }
      }
    } else if (rule.thresholds) {
      // Rule based on numerical thresholds (e.g., websiteVisits, formSubmissions, timeSinceLastActivityDays)
      for (const threshold of rule.thresholds) {
        if (rule.attribute === 'timeSinceLastActivityDays') {
          // Special handling for scoreModifier
          if ((threshold.max === undefined || segmentValue <= threshold.max) &&
              (threshold.min === undefined || segmentValue >= threshold.min)) {
            score += threshold.scoreModifier;
            break;
          }
        } else {
          // Standard score application for thresholds
          if ((threshold.max === undefined || segmentValue <= threshold.max) &&
              (threshold.min === undefined || segmentValue >= threshold.min)) {
            score += threshold.score;
            break;
          }
        }
      }
    } else if (rule.value !== undefined && rule.score !== undefined) {
      // Rule based on a boolean value (e.g., demoRequest, contactedSales)
      if (segmentValue === rule.value) {
        score += rule.score;
      }
    }
  }

  let segmentClassification = 'unknown';
  if (score >= thresholds.hotLead.minScore) {
    segmentClassification = 'hotLead';
  } else if (score >= thresholds.warmLead.minScore && score <= thresholds.warmLead.maxScore) {
    segmentClassification = 'warmLead';
  } else if (score >= thresholds.coldLead.minScore && score <= thresholds.coldLead.maxScore) {
    segmentClassification = 'coldLead';
  }

  return {
    score,
    classification: segmentClassification,
    description: thresholds[segmentClassification]?.description || rubric.segmentDescription,
  };
}


export function registerLeadScoring(app, deps) {
  app.post('/api/v1/leadscoring/segment', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      if (!payload || Object.keys(payload).length === 0) {
        return res.status(400).json({ message: 'Request body cannot be empty.' });
      }

      // Fetch the latest scoring rubric
      const scoringRubric = await getScoringRubric(deps);

      // Apply the scoring rubric to the provided segment payload
      const result = applyScoringRubric(scoringRubric, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in leadScoring route');
      next(error);
    }
  });
}