/**
 * SYNOPSIS: Provides a detailed scoring rubric for lead scoring.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
export async function getScoringRubric(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {}; // `id` is not used in the current rubric structure, but kept for pattern consistency.
  try {
    // The rubric is a static configuration, not stored in the DB.
    // We are extending the existing pattern, which currently returns a static object.
    const scoringRubric = {
      "segmentDescription": "Defines the scoring criteria for leads based on various attributes and actions. A higher score indicates a hotter lead. This rubric explicitly details the rules for calculating a lead's score.",
      "rubric": {
        "initialScore": 0,
        "scoringRules": [
          {
            "attribute": "companySize",
            "values": {
              "1-10 employees": 5,
              "11-50 employees": 10,
              "51-200 employees": 15,
              "201-500 employees": 20,
              "500+ employees": 25
            },
            "description": "Points awarded based on the number of employees in the lead's company. Larger companies typically indicate higher potential."
          },
          {
            "attribute": "industry",
            "values": {
              "Technology": 15,
              "Finance": 10,
              "Healthcare": 10,
              "Manufacturing": 5,
              "Retail": 5,
              "Other": 0
            },
            "description": "Points awarded based on the lead's industry. Higher points for strategic industries that align with Boldtrail's target market."
          },
          {
            "attribute": "jobTitleKeywords",
            "keywords": {
              "Director": 10,
              "VP": 15,
              "Manager": 5,
              "Head of": 10,
              "C-level": 20
            },
            "description": "Points awarded if the lead's job title contains specific keywords, indicating seniority and decision-making authority."
          },
          {
            "attribute": "websiteVisits",
            "thresholds": [
              {"min": 1, "max": 2, "score": 2},
              {"min": 3, "max": 5, "score": 5},
              {"min": 6, "score": 10}
            ],
            "description": "Points awarded based on the number of times the lead has visited the website. More visits suggest higher interest."
          },
          {
            "attribute": "formSubmissions",
            "thresholds": [
              {"min": 1, "max": 1, "score": 10},
              {"min": 2, "score": 20}
            ],
            "description": "Points awarded for submitting forms (e.g., contact us, demo request). This indicates active engagement and information seeking."
          },
          {
            "attribute": "emailOpens",
            "thresholds": [
              {"min": 1, "max": 2, "score": 1},
              {"min": 3, "max": 5, "score": 3},
              {"min": 6, "score": 5}
            ],
            "description": "Points awarded for opening marketing emails. Reflects engagement with email campaigns."
          },
          {
            "attribute": "emailClicks",
            "thresholds": [
              {"min": 1, "max": 1, "score": 5},
              {"min": 2, "score": 10}
            ],
            "description": "Points awarded for clicking links within marketing emails. Indicates deeper interest in content."
          },
          {
            "attribute": "contentDownloads",
            "thresholds": [
              {"min": 1, "max": 1, "score": 8},
              {"min": 2, "score": 15}
            ],
            "description": "Points awarded for downloading content like whitepapers or ebooks. Suggests a strong interest in learning more about solutions."
          },
          {
            "attribute": "demoRequest",
            "value": true,
            "score": 50,
            "description": "Significant points for requesting a product demo, indicating very high intent and readiness to evaluate."
          },
          {
            "attribute": "contactedSales",
            "value": true,
            "score": 40,
            "description": "Significant points for directly contacting sales. This is a clear indicator of immediate interest."
          },
          {
            "attribute": "timeSinceLastActivityDays",
            "thresholds": [
              {"max": 7, "scoreModifier": 0},
              {"min": 8, "max": 30, "scoreModifier": -5},
              {"min": 31, "max": 90, "scoreModifier": -10},
              {"min": 91, "scoreModifier": -20}
            ],
            "description": "Score decay based on inactivity. Deducts points if the lead has not engaged recently, reflecting diminishing interest over time."
          }
        ],
        "thresholds": {
          "hotLead": {
            "minScore": 70,
            "description": "Leads with a score of 70 or higher are classified as Hot Leads, indicating high readiness for sales engagement."
          },
          "warmLead": {
            "minScore": 40,
            "maxScore": 69,
            "description": "Leads with a score between 40 and 69 are classified as Warm Leads, suggesting they are engaged but may need further nurturing."
          },
          "coldLead": {
            "minScore": 0,
            "maxScore": 39,
            "description": "Leads with a score below 40 are classified as Cold Leads, requiring significant nurturing or re-engagement strategies."
          }
        },
        "description": "Defines the score ranges for classifying leads as Hot, Warm, or Cold, providing clear actionable categories for sales and marketing."
      }
    };
    return scoringRubric;
  } catch (error) {
    logger.error({ error }, 'Error in getScoringRubric');
    throw new Error('Failed to retrieve scoring rubric');
  }
}