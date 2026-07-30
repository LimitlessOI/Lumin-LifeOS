/**
 * SYNOPSIS: Exports summarizeInterviews — services/userInterviews.js.
 */
export function summarizeInterviews(interviews) {
  if (!interviews || interviews.length === 0) {
    return "No teacher interviews provided for summarization.";
  }

  const feedbackSummary = {
    commonThemes: {},
    keySuggestions: [],
    overallSentiment: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    individualHighlights: [],
  };

  const themeKeywords = {
    "curriculum": ["curriculum", "content", "lessons", "materials"],
    "student engagement": ["engagement", "motivation", "interest", "participation"],
    "technology": ["tech", "software", "tools", "platform"],
    "support": ["support", "help", "resources", "training"],
    "workload": ["workload", "time", "burden", "stress"],
  };

  interviews.forEach((interview, index) => {
    const text = interview.feedback.toLowerCase();

    // Sentiment analysis (simple keyword count)
    if (text.includes("great") || text.includes("positive") || text.includes("effective") || text.includes("enjoy")) {
      feedbackSummary.overallSentiment.positive++;
    } else if (text.includes("concern") || text.includes("challenge") || text.includes("difficult") || text.includes("struggle")) {
      feedbackSummary.overallSentiment.negative++;
    } else {
      feedbackSummary.overallSentiment.neutral++;
    }

    // Theme identification
    for (const theme in themeKeywords) {
      themeKeywords[theme].forEach(keyword => {
        if (text.includes(keyword)) {
          feedbackSummary.commonThemes[theme] = (feedbackSummary.commonThemes[theme] || 0) + 1;
        }
      });
    }

    // Key suggestions (example: looking for phrases like "suggest", "recommend", "improve")
    const suggestionMatches = text.match(/(suggest|recommend|improve|could be better|needs to be) [^.!?]*[.!?]/g);
    if (suggestionMatches) {
      suggestionMatches.forEach(match => {
        feedbackSummary.keySuggestions.push(`From Teacher ${index + 1}: ${match.trim()}`);
      });
    }

    // Individual highlights
    feedbackSummary.individualHighlights.push(`Teacher ${index + 1}: "${interview.feedback.substring(0, 100)}..."`);
  });

  // Convert theme counts to a more readable format
  const sortedThemes = Object.entries(feedbackSummary.commonThemes)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([theme, count]) => `${theme} (mentioned ${count} times)`);

  const sentimentSummary = [];
  if (feedbackSummary.overallSentiment.positive > 0) sentimentSummary.push(`${feedbackSummary.overallSentiment.positive} positive`);
  if (feedbackSummary.overallSentiment.neutral > 0) sentimentSummary.push(`${feedbackSummary.overallSentiment.neutral} neutral`);
  if (feedbackSummary.overallSentiment.negative > 0) sentimentSummary.push(`${feedbackSummary.overallSentiment.negative} negative`);

  return {
    summary: `Based on interviews with ${interviews.length} teachers:`,
    overallSentiment: `Overall sentiment: ${sentimentSummary.join(', ') || 'undetermined'}.`,
    commonThemes: `Common themes identified: ${sortedThemes.join(', ') || 'No distinct themes identified.'}`,
    keySuggestions: feedbackSummary.keySuggestions.length > 0
      ? `Key suggestions: ${feedbackSummary.keySuggestions.join('; ')}`
      : 'No explicit suggestions were found.',
    individualHighlights: `Individual feedback highlights: ${feedbackSummary.individualHighlights.join('; ')}`,
    rawAnalysis: feedbackSummary, // Keep raw data for deeper inspection if needed
  };
}