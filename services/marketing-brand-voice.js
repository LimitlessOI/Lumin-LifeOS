// SYNOPSIS:
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { Pool } from 'pg'; // Explicitly import Pool from pg

// --- Utility Functions for Brand Voice Fingerprinting ---

// Simple tokenization: split by whitespace and common punctuation, convert to lowercase
const tokenize = (text) => text.toLowerCase().match(/\b\w+\b/g) || [];

// Basic stop words (extend as needed)
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'it', 'its', 'he', 'she', 'they',
  'we', 'you', 'your', 'my', 'our', 'i', 'me', 'us', 'him', 'her', 'them', 'this', 'that', 'these',
  'those', 'what', 'where', 'when', 'why', 'how', 'which', 'who', 'whom', 'can', 'will', 'would',
  'should', 'could', 'get', 'got', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'yes',
  'up', 'down', 'out', 'in', 'over', 'under', 'then', 'now', 'just', 'only', 'very', 'much', 'many',
  'also', 'about', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'don', 'nt', 'll', 'm', 're', 've',
  'd'
]);

// Function to calculate average word length
const calculateAvgWordLength = (text) => {
  const words = text.match(/\b\w+\b/g);
  if (!words || words.length === 0) return 0;
  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  return totalLength / words.length;
};

// Function to calculate average sentence length
const calculateAvgSentenceLength = (text) => {
  const sentences = text.split(/[.!?…]+(?=\s|$)/).filter(s => s.trim().length > 0);
  if (!sentences || sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, sentence) => {
    const words = sentence.match(/\b\w+\b/g);
    return sum + (words ? words.length : 0);
  }, 0);
  return totalWords / sentences.length;
};

// Function to find top N recurring non-stopword phrases/tokens (simple n-grams)
const getTopNRecurringPhrases = (text, n = 5, phraseLength = 2) => {
  const tokens = tokenize(text).filter(token => !stopWords.has(token));
  const phraseCounts = {};

  for (let i = 0; i <= tokens.length - phraseLength; i++) {
    const phrase = tokens.slice(i, i + phraseLength).join(' ');
    if (phrase.length > 0) {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    }
  }

  return Object.entries(phraseCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, n)
    .map(([phrase]) => phrase);
};

// Function to analyze punctuation and emoji cadence
const analyzePunctuationAndEmoji = (text) => {
  const punctuationRegex = /[.,!?;:'"-(){}[\]]/g;
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;

  const punctuationMatches = text.match(punctuationRegex);
  const emojiMatches = text.match(emojiRegex);

  return {
    punctuationCount: punctuationMatches ? punctuationMatches.length : 0,
    emojiCount: emojiMatches ? emojiMatches.length : 0,
    totalChars: text.length,
  };
};

// Function to detect simple hook patterns (e.g., questions, imperatives)
const detectHookPatterns = (text) => {
  let questionCount = (text.match(/\?/g) || []).length;
  let exclamationCount = (text.match(/!/g) || []).length;
  let imperativeCount = (text.match(/\b(buy|learn|discover|start|join|get|try|check out)\b/gi) || []).length; // Simple imperative verbs

  return {
    questionCount,
    exclamationCount,
    imperativeCount,
  };
};

/**
 * Builds a brand voice profile for a given owner from approved marketing content.
 * Requires at least 3 distinct approved sessions.
 *
 * @param {Pool} pool - node-postgres Pool instance.
 * @param {string} ownerId - The owner's ID.
 * @returns {Promise<{ok: boolean, profile?: object, sessionCount?: number, reason?: string}>}
 */
export async function buildBrandVoiceProfile(pool, ownerId) {
  try {
    const query = `
      SELECT
          mcp.content_text,
          mcp.session_id
      FROM
          marketing_content_pieces mcp
      JOIN
          marketing_sessions ms ON mcp.session_id = ms.id
      WHERE
          ms.owner_id = $1
          AND mcp.status = 'approved'
    `;
    const { rows } = await pool.query(query, [ownerId]);

    if (rows.length === 0) {
      return { ok: false, reason: 'no_approved_content', sessionCount: 0 };
    }

    const distinctSessionIds = new Set(rows.map(row => row.session_id));
    if (distinctSessionIds.size < 3) {
      return { ok: false, reason: 'insufficient_sessions', sessionCount: distinctSessionIds.size };
    }

    let allContentText = '';
    rows.forEach(row => {
      if (typeof row.content_text === 'string') {
        allContentText += row.content_text + ' ';
      }
    });

    if (allContentText.trim().length === 0) {
      return { ok: false, reason: 'no_processable_content_text', sessionCount: distinctSessionIds.size };
    }

    // Compute deterministic fingerprint
    const profile = {
      avgSentenceLength: calculateAvgSentenceLength(allContentText),
      avgWordLength: calculateAvgWordLength(allContentText),
      topPhrases: getTopNRecurringPhrases(allContentText),
      punctuationAndEmojiCadence: analyzePunctuationAndEmoji(allContentText),
      hookPatternCounts: detectHookPatterns(allContentText),
      // Add more metrics as needed
    };

    const upsertQuery = `
      INSERT INTO marketing_brand_voice_profiles (owner_id, profile_json, source_session_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (owner_id) DO UPDATE
      SET profile_json = EXCLUDED.profile_json,
          source_session_count = EXCLUDED.source_session_count,
          updated_at = NOW()
      RETURNING id, owner_id, profile_json, source_session_count, updated_at;
    `;
    const upsertResult = await pool.query(upsertQuery, [ownerId, JSON.stringify(profile), distinctSessionIds.size]);

    return {
      ok: true,
      profile: upsertResult.rows[0].profile_json,
      sessionCount: upsertResult.rows[0].source_session_count
    };

  } catch (error) {
    console.error('Error building brand voice profile:', error);
    return { ok: false, reason: 'internal_error', error: error.message };
  }
}

/**
 * Scores new content against an existing brand voice profile.
 * This is a pure function, no DB or AI access.
 *
 * @param {object} profile - The brand voice profile (profile_json from DB).
 * @param {string} text - The content text to score.
 * @returns {{score: number, notes: string[]}}
 */
export function scoreContentAgainstVoice(profile, text) {
  const notes = [];
  let score = 1.0; // Start with a perfect score and deduct points

  if (!profile || typeof text !== 'string' || text.trim().length === 0) {
    return { score: 0, notes: ['Invalid profile or empty text provided.'] };
  }

  // Calculate metrics for the new text
  const textMetrics = {
    avgSentenceLength: calculateAvgSentenceLength(text),
    avgWordLength: calculateAvgWordLength(text),
    topPhrases: getTopNRecurringPhrases(text),
    punctuationAndEmojiCadence: analyzePunctuationAndEmoji(text),
    hookPatternCounts: detectHookPatterns(text),
  };

  // Compare metrics and adjust score
  const toleranceFactor = 0.2; // 20% deviation is acceptable

  // Avg Sentence Length
  if (profile.avgSentenceLength > 0) {
    const diff = Math.abs(textMetrics.avgSentenceLength - profile.avgSentenceLength) / profile.avgSentenceLength;
    if (diff > toleranceFactor) {
      score -= Math.min(0.2, diff * 0.5); // Deduct up to 20%
      notes.push(`Avg sentence length deviation: ${diff.toFixed(2)} (profile: ${profile.avgSentenceLength.toFixed(1)}, content: ${textMetrics.avgSentenceLength.toFixed(1)})`);
    }
  }

  // Avg Word Length
  if (profile.avgWordLength > 0) {
    const diff = Math.abs(textMetrics.avgWordLength - profile.avgWordLength) / profile.avgWordLength;
    if (diff > toleranceFactor) {
      score -= Math.min(0.2, diff * 0.5);
      notes.push(`Avg word length deviation: ${diff.toFixed(2)} (profile: ${profile.avgWordLength.toFixed(1)}, content: ${textMetrics.avgWordLength.toFixed(1)})`);
    }
  }

  // Top Phrases (check for overlap)
  const profilePhrases = new Set(profile.topPhrases || []);
  const textPhrases = new Set(textMetrics.topPhrases || []);
  let matchedPhrases = 0;
  textPhrases.forEach(phrase => {
    if (profilePhrases.has(phrase)) {
      matchedPhrases++;
    }
  });
  if (profilePhrases.size > 0) {
    const matchRatio = matchedPhrases / profilePhrases.size;
    if (matchRatio < 0.5) { // If less than 50% of profile phrases are matched
      score -= (0.1 * (1 - matchRatio)); // Deduct up to 10%
      notes.push(`Low phrase overlap: ${matchedPhrases} of ${profilePhrases.size} profile phrases matched.`);
    }
  }


  // Punctuation and Emoji Cadence (simple comparison)
  const profilePunc = profile.punctuationAndEmojiCadence || {};
  const textPunc = textMetrics.punctuationAndEmojiCadence || {};

  if (profilePunc.totalChars > 0) {
    const profilePuncRatio = (profilePunc.punctuationCount || 0) / profilePunc.totalChars;
    const textPuncRatio = (textPunc.punctuationCount || 0) / textPunc.totalChars;
    const puncDiff = Math.abs(textPuncRatio - profilePuncRatio);
    if (puncDiff > 0.05) { // 5% difference in punctuation ratio
      score -= Math.min(0.1, puncDiff * 1.0); // Deduct up to 10%
      notes.push(`Punctuation ratio deviation: ${puncDiff.toFixed(2)} (profile: ${profilePuncRatio.toFixed(2)}, content: ${textPuncRatio.toFixed(2)})`);
    }

    const profileEmojiRatio = (profilePunc.emojiCount || 0) / profilePunc.totalChars;
    const textEmojiRatio = (textPunc.emojiCount || 0) / textPunc.totalChars;
    const emojiDiff = Math.abs(textEmojiRatio - profileEmojiRatio);
    if (emojiDiff > 0.02) { // 2% difference in emoji ratio
      score -= Math.min(0.05, emojiDiff * 2.0); // Deduct up to 5%
      notes.push(`Emoji ratio deviation: ${emojiDiff.toFixed(2)} (profile: ${profileEmojiRatio.toFixed(2)}, content: ${textEmojiRatio.toFixed(2)})`);
    }
  }


  // Hook Pattern Counts (simple comparison of ratios)
  const profileHooks = profile.hookPatternCounts || {};
  const textHooks = textMetrics.hookPatternCounts || {};
  const totalTextWords = text.match(/\b\w+\b/g)?.length || 1; // Avoid division by zero

  const compareHookMetric = (metricName, weight = 0.05) => {
    const profileRatio = (profileHooks[metricName] || 0) / totalTextWords;
    const textRatio = (textHooks[metricName] || 0) / totalTextWords;
    const diff = Math.abs(textRatio - profileRatio);
    if (diff > 0.01) { // 1% difference
      score -= Math.min(weight, diff * 5.0);
      notes.push(`${metricName} ratio deviation: ${diff.toFixed(2)} (profile: ${profileRatio.toFixed(2)}, content: ${textRatio.toFixed(2)})`);
    }
  };

  compareHookMetric('questionCount');
  compareHookMetric('exclamationCount');
  compareHookMetric('imperativeCount');


  // Ensure score is between 0 and 1
  score = Math.max(0, Math.min(1, score));

  return { score: parseFloat(score.toFixed(2)), notes };
}