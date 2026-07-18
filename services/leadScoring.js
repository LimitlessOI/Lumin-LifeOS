/**
 * SYNOPSIS: Service module — LeadScoring.
 */
export const getScoringRubric = () => ({
  "segmentDescription": "Defines the scoring criteria for leads based on various attributes and actions. A higher score indicates a hotter lead.",
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
        "description": "Points awarded based on the number of employees in the lead's company."
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
        "description": "Points awarded based on the lead's industry. Higher points for strategic industries."
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
        "description": "Points awarded if the lead's job title contains specific keywords, indicating seniority."
      },
      {
        "attribute": "websiteVisits",
        "thresholds": [
          {"min": 1, "max": 2, "score": 2},
          {"min": 3, "max": 5, "score": 5},
          {"min": 6, "score": 10}
        ],
        "description": "Points awarded based on the number of times the lead has visited the website."
      },
      {
        "attribute": "formSubmissions",
        "thresholds": [
          {"min": 1, "max": 1, "score": 10},
          {"min": 2, "score": 20}
        ],
        "description": "Points awarded for submitting forms (e.g., contact us, demo request)."
      },
      {
        "attribute": "emailOpens",
        "thresholds": [
          {"min": 1, "max": 2, "score": 1},
          {"min": 3, "max": 5, "score": 3},
          {"min": 6, "score": 5}
        ],
        "description": "Points awarded for opening marketing emails."
      },
      {
        "attribute": "emailClicks",
        "thresholds": [
          {"min": 1, "max": 1, "score": 5},
          {"min": 2, "score": 10}
        ],
        "description": "Points awarded for clicking links within marketing emails."
      },
      {
        "attribute": "contentDownloads",
        "thresholds": [
          {"min": 1, "max": 1, "score": 8},
          {"min": 2, "score": 15}
        ],
        "description": "Points awarded for downloading content like whitepapers or ebooks."
      },
      {
        "attribute": "demoRequest",
        "value": true,
        "score": 50,
        "description": "Significant points for requesting a product demo, indicating high intent."
      },
      {
        "attribute": "contactedSales",
        "value": true,
        "score": 40,
        "description": "Significant points for directly contacting sales."
      },
      {
        "attribute": "timeSinceLastActivityDays",
        "thresholds": [
          {"max": 7, "scoreModifier": 0},
          {"min": 8, "max": 30, "scoreModifier": -5},
          {"min": 31, "max": 90, "scoreModifier": -10},
          {"min": 91, "scoreModifier": -20}
        ],
        "description": "Score decay based on inactivity. Deducts points if the lead has not engaged recently."
      }
    ],
    "thresholds": {
      "hotLead": 70,
      "warmLead": 40,
      "coldLead": 0
    },
    "description": "Defines the score ranges for classifying leads as Hot, Warm, or Cold."
  }
});