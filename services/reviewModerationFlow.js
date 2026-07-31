/**
 * SYNOPSIS: Exports getModerationRules — services/reviewModerationFlow.js.
 */
export function getModerationRules() {
  return {
    "sacredContent": {
      "rules": [
        {
          "id": "hateSpeech",
          "description": "Content promoting hatred, discrimination, or violence against any group.",
          "severity": "critical",
          "action": "reject"
        },
        {
          "id": "explicitMaterial",
          "description": "Sexually explicit content, nudity, or pornography.",
          "severity": "critical",
          "action": "reject"
        },
        {
          "id": "graphicViolence",
          "description": "Content depicting gratuitous violence, gore, or brutality.",
          "severity": "critical",
          "action": "reject"
        },
        {
          "id": "harassmentBullying",
          "description": "Content that harasses, bullies, or threatens individuals.",
          "severity": "high",
          "action": "reject"
        },
        {
          "id": "illegalActivities",
          "description": "Content promoting or depicting illegal activities.",
          "severity": "critical",
          "action": "reject"
        },
        {
          "id": "misinformationDisinformation",
          "description": "False or misleading information intended to deceive or harm.",
          "severity": "high",
          "action": "flag_for_human_review"
        },
        {
          "id": "spamScams",
          "description": "Unsolicited commercial content, phishing, or scam attempts.",
          "severity": "medium",
          "action": "reject"
        },
        {
          "id": "impersonation",
          "description": "Content falsely representing an individual or entity.",
          "severity": "high",
          "action": "flag_for_human_review"
        },
        {
          "id": "intellectualPropertyInfringement",
          "description": "Content violating copyrights, trademarks, or other intellectual property.",
          "severity": "medium",
          "action": "flag_for_human_review"
        },
        {
          "id": "privacyViolation",
          "description": "Content revealing personal identifiable information without consent.",
          "severity": "high",
          "action": "reject"
        }
      ],
      "workflow": [
        "automated_scan",
        "keyword_detection",
        "ai_moderation_score",
        "human_review_threshold"
      ],
      "escalationMatrix": {
        "critical": ["legal_team", "senior_moderator"],
        "high": ["senior_moderator"],
        "medium": ["moderator_lead"]
      }
    }
  };
}