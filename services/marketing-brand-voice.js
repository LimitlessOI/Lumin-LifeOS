// SYNOPSIS:
// @ssot docs/products/marketingos/PRODUCT_HOME.md
import { Pool } from 'pg'; // Explicitly import Pool for type hinting, though deps.pool is passed.

/**
 * Calculates basic linguistic metrics for text.
 * @param {string} text
 * @returns {{avgSentenceLength: number, avgWordLength: number, wordCount: number, sentenceCount: number, punctuationCount: number, emojiCount: number}}
 */
function calculateTextMetrics(text) {
  const sentences = text.split(/[.!?…]+/).filter(s => s.trim().length > 0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const punctuation = (text.match(/[.,!?;:'"(){}[\]\-—–—…—]/g) || []).length;
  const emojis = (text.match(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}]/gu) || []).length;

  const wordCount = words.length;
  const sentenceCount = sentences.length;

  const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
  const avgWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  return {
    avgSentenceLength,
    avgWordLength,
    wordCount,
    sentenceCount,
    punctuationCount: punctuation,
    emojiCount: emojis
  };
}

/**
 * Extracts top N non-stopword phrases/tokens.
 * A very basic implementation for deterministic local processing.
 * @param {string} text
 * @param {number} n
 * @returns {string[]}
 */
function extractTopPhrases(text, n = 10) {
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'so', 'yet',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'of', 'in', 'on', 'at', 'by', 'with', 'from', 'to', 'into', 'onto',
    'this', 'that', 'these', 'those', 'it', 'its', 'he', 'him', 'his', 'she', 'her', 'hers', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'they', 'them', 'their', 'theirs',
    'i', 'me', 'my', 'mine', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
    'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
    'about', 'above', 'after', 'again', 'against', 'all', 'any', 'as', 'away', 'back', 'before', 'below', 'between', 'both', 'down', 'during', 'each', 'few', 'for', 'further', 'here', 'how', 'if', 'just', 'more', 'most', 'no', 'not', 'now', 'only', 'other', 'out', 'over', 'same', 'some', 'such', 'than', 'then', 'there', 'through', 'up', 'very', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'without'
  ]);

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const filteredWords = words.filter(word => !stopwords.has(word));

  const wordFrequencies = {};
  for (const word of filteredWords) {
    wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
  }

  const sortedWords = Object.entries(wordFrequencies).sort(([, countA], [, countB]) => countB - countA);
  return sortedWords.slice(0, n).map(([word]) => word);
}

/**
 * Deterministically computes a brand voice fingerprint from text.
 * @param {string} text
 * @returns {object}
 */
function computeVoiceFingerprint(text) {
  const metrics = calculateTextMetrics(text);
  const topPhrases = extractTopPhrases(text);

  // A very basic 'hook pattern' detection. This would be highly domain-specific in a real system.
  // For now, let's just count common question marks or exclamation points at sentence start/end.
  const hookPatterns = {
    questionStart: (text.match(/^[Ww]hat|How|Why|When|Where|Who|Is|Are|Do|Does|Did|Can|Could|Should|Would/g) || []).length,
    exclamationEnd: (text.match(/!$/gm) || []).length, // end of line/paragraph
    questionEnd: (text.match(/\?$/gm) || []).length, // end of line/paragraph
  };

  return {
    ...metrics,
    topPhrases,
    hookPatterns
  };
}

/**
 * Builds a brand voice profile for a given owner from approved marketing content.
 * Requires at least 3 distinct approved sessions.
 * @param {Pool} pool - node-postgres Pool
 * @param {string} ownerId
 * @returns {Promise<{ok: boolean, profile?: object, sessionCount?: number, reason?: string}>}
 */
export async function buildBrandVoiceProfile(pool, ownerId) {
  try {
    const query = `
      SELECT
        mcp.content_text,
        ms.id AS session_id
      FROM
        marketing_content_pieces mcp
      JOIN
        marketing_sessions ms ON mcp.session_id = ms.id
      WHERE
        ms.owner_id = $1
        AND mcp.status = 'approved' -- Assuming 'approved' is the status for approved content
        AND mcp.content_text IS NOT NULL
        AND mcp.content_text != ''
      GROUP BY
        mcp.content_text, ms.id; -- Group by content_text and session_id to ensure distinct content from distinct sessions
    `;

    const { rows } = await pool.query(query, [ownerId]);

    if (rows.length === 0) {
      return { ok: false, reason: 'no_approved_content', sessionCount: 0 };
    }

    const uniqueSessionIds = new Set(rows.map(row => row.session_id));
    if (uniqueSessionIds.size < 3) {
      return { ok: false, reason: 'insufficient_sessions', sessionCount: uniqueSessionIds.size };
    }

    const allFingerprints = rows.map(row => computeVoiceFingerprint(row.content_text));

    // Aggregate fingerprints to create a single profile
    const aggregatedProfile = {
      avgSentenceLength: allFingerprints.reduce((sum, fp) => sum + fp.avgSentenceLength, 0) / allFingerprints.length,
      avgWordLength: allFingerprints.reduce((sum, fp) => sum + fp.avgWordLength, 0) / allFingerprints.length,
      wordCount: allFingerprints.reduce((sum, fp) => sum + fp.wordCount, 0), // Total word count
      sentenceCount: allFingerprints.reduce((sum, fp) => sum + fp.sentenceCount, 0), // Total sentence count
      punctuationCount: allFingerprints.reduce((sum, fp) => sum + fp.punctuationCount, 0),
      emojiCount: allFingerprints.reduce((sum, fp) => sum + fp.emojiCount, 0),
      // For top phrases, aggregate all and then pick top N from the combined set
      topPhrases: extractTopPhrases(rows.map(row => row.content_text).join(' '), 10),
      // Aggregate hook patterns (sum counts)
      hookPatterns: {
        questionStart: allFingerprints.reduce((sum, fp) => sum + fp.hookPatterns.questionStart, 0),
        exclamationEnd: allFingerprints.reduce((sum, fp) => sum + fp.hookPatterns.exclamationEnd, 0),
        questionEnd: allFingerprints.reduce((sum, fp) => sum + fp.hookPatterns.questionEnd, 0),
      }
    };

    const profileJson = JSON.stringify(aggregatedProfile);
    const sourceSessionCount = uniqueSessionIds.size;

    const upsertQuery = `
      INSERT INTO marketing_brand_voice_profiles (owner_id, profile_json, source_session_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (owner_id) DO UPDATE
      SET profile_json = EXCLUDED.profile_json,
          source_session_count = EXCLUDED.source_session_count,
          updated_at = NOW()
      RETURNING *;
    `;

    const upsertResult = await pool.query(upsertQuery, [ownerId, profileJson, sourceSessionCount]);
    const storedProfile = upsertResult.rows[0];

    return { ok: true, profile: storedProfile.profile_json, sessionCount: storedProfile.source_session_count };

  } catch (error) {
    // deps.logger.error({ error, ownerId }, 'Failed to build brand voice profile');
    return { ok: false, reason: 'internal_error', details: error.message };
  }
}

/**
 * Scores new content against a stored brand voice profile.
 * Pure function, no DB or AI calls.
 * @param {object} profile - The brand voice profile (parsed JSON)
 * @param {string} text - The content to score
 * @returns {{score: number, notes: string[]}}
 */
export function scoreContentAgainstVoice(profile, text) {
  const notes = [];
  let score = 1.0; // Start with a perfect score and deduct points

  const contentFingerprint = computeVoiceFingerprint(text);

  // Compare linguistic metrics
  const metricComparisons = [
    { name: 'avgSentenceLength', weight: 0.2, threshold: 0.3 }, // 30% deviation allowed
    { name: 'avgWordLength', weight: 0.2, threshold: 0.2 },
    // Punctuation and emoji cadence could be ratios rather than absolute counts for better comparison
    // For simplicity, we'll compare counts relative to word count
    { name: 'punctuationRatio', weight: 0.1, threshold: 0.5,
      getValue: (fp) => fp.wordCount > 0 ? fp.punctuationCount / fp.wordCount : 0,
      getProfileValue: (p) => p.wordCount > 0 ? p.punctuationCount / p.wordCount : 0
    },
    { name: 'emojiRatio', weight: 0.1, threshold: 1.0, // More lenient for emojis
      getValue: (fp) => fp.wordCount > 0 ? fp.emojiCount / fp.wordCount : 0,
      getProfileValue: (p) => p.wordCount > 0 ? p.emojiCount / p.wordCount : 0
    },
  ];

  for (const { name, weight, threshold, getValue, getProfileValue } of metricComparisons) {
    const profileValue = getProfileValue ? getProfileValue(profile) : profile[name];
    const contentValue = getValue ? getValue(contentFingerprint) : contentFingerprint[name];

    if (profileValue === 0 && contentValue === 0) continue; // Both are zero, perfect match

    const deviation = Math.abs(contentValue - profileValue) / (profileValue === 0 ? 1 : profileValue); // Avoid division by zero
    if (deviation > threshold) {
      score -= weight * Math.min(1, deviation / threshold); // Deduct proportionally, cap at full weight
      notes.push(`${name} deviates significantly (profile: ${profileValue.toFixed(2)}, content: ${contentValue.toFixed(2)})`);
    }
  }

  // Compare top phrases (overlap)
  const profilePhrases = new Set(profile.topPhrases || []);
  const contentPhrases = new Set(contentFingerprint.topPhrases || []);
  let commonPhrases = 0;
  for (const phrase of contentPhrases) {
    if (profilePhrases.has(phrase)) {
      commonPhrases++;
    }
  }
  const phraseOverlapRatio = profilePhrases.size > 0 ? commonPhrases / profilePhrases.size : 1;
  if (phraseOverlapRatio < 0.5) { // If less than 50% overlap
    score -= 0.2;
    notes.push(`Low overlap in key phrases (overlap: ${commonPhrases}/${profilePhrases.size})`);
  }

  // Compare hook patterns (simple deviation for now)
  const hookPatternComparisons = [
    { name: 'questionStart', weight: 0.05, threshold: 0.5 },
    { name: 'exclamationEnd', weight: 0.05, threshold: 0.5 },
    { name: 'questionEnd', weight: 0.05, threshold: 0.5 },
  ];

  for (const { name, weight, threshold } of hookPatternComparisons) {
    const profileValue = profile.hookPatterns[name] || 0;
    const contentValue = contentFingerprint.hookPatterns[name] || 0;

    if (profileValue === 0 && contentValue === 0) continue;

    const deviation = Math.abs(contentValue - profileValue) / (profileValue === 0 ? 1 : profileValue);
    if (deviation > threshold) {
      score -= weight * Math.min(1, deviation / threshold);
      notes.push(`Hook pattern '${name}' deviates (profile: ${profileValue}, content: ${contentValue})`);
    }
  }

  // Ensure score is within 0-1 range
  score = Math.max(0, Math.min(1, score));

  return { score: parseFloat(score.toFixed(2)), notes };
}