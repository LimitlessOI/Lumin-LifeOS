/**
 * services/commitment-detector.js — Amendment 16 (Word Keeper)
 *
 * Scans 60-second transcript chunks for commitment language.
 * Uses Claude for nuanced intent classification + Grok for reality check.
 *
 * Exports: createCommitmentDetector(councilService) → { scan, extractDetails }
 */

// High-confidence commitment patterns — always flag
const HIGH_CONFIDENCE_PATTERNS = [
  /\bI(?:'ll| will| am going to| will make sure| will take care of| will handle)\b.{3,80}/i,
  /\bI(?:'ll| will) be there\b/i,
  /\bI(?:'ll| will) have it done\b/i,
  /\bI promise\b/i,
  /\bI give you my word\b/i,
  /\byou have my word\b/i,
  /\bcount on me\b/i,
  /\byou can count on me\b/i,
  /\bI swear\b/i,
  /\bI guarantee\b/i,
  /\bI['']ll make sure\b/i,
  /\bI['']ll take care of\b/i,
  /\bI['']ll handle\b/i,
];

// Medium-confidence patterns — flag with lower confidence score
const MEDIUM_CONFIDENCE_PATTERNS = [
  /\bI should\b.{3,60}(?:by|before|tomorrow|tonight|this week|next week)/i,
  /\bI need to\b.{3,60}(?:by|before|tomorrow|tonight|this week|next week)/i,
  /\bI have to\b.{3,60}(?:by|before|tomorrow|tonight|this week|next week)/i,
  /\blet me\b.{3,60}(?:get|take care|handle|do|check|send|call|write)/i,
  /\bI'll try to\b.{3,60}(?:by|before|tomorrow|tonight|this week|by \w+day)/i,
  /\bI was thinking I(?:'d| would)\b/i,
];

// Patterns that should NEVER be flagged
const NEVER_FLAG_PATTERNS = [
  /\bI wish\b/i,
  /\bI hope\b/i,
  /\bI think\b.{0,20}(?:will|going to)/i,       // predictions, not commitments
  /\bif I (?:were|was|could|would)\b/i,           // hypotheticals
  /\bprices will\b/i,
  /\bthe market will\b/i,
  /\bI did\b/i,                                   // past statements
  /\bI was\b/i,
  /\bI(?:'ve| have) (?:done|finished|completed|sent|called|written)\b/i,
];

// Time expression patterns for deadline extraction
const TIME_PATTERNS = [
  /\b(?:by|before|no later than)\s+((?:this |next |)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year))/i,
  /\b(?:by|before)\s+(tomorrow|tonight|end of day|eod|end of week|eow|noon|midnight)/i,
  /\b(?:by|before|in)\s+(\d+)\s+(hour|day|week|month)s?/i,
  /\b(tomorrow|tonight|this afternoon|this evening|this morning)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bby (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
  /\b(?:this|next) (week|month)\b/i,
];

// Relationship detection from context
const RELATIONSHIP_PATTERNS = {
  spouse: /\b(?:honey|babe|sweetheart|darling|wife|husband|my (?:love|dear))\b/i,
  colleague: /\b(?:team|colleague|coworker|the team|everyone|folks)\b/i,
  client: /\b(?:client|customer|account|stakeholder)\b/i,
  self: /\b(?:myself|my goal|my target|i want to)\b/i,
};

function hasNeverFlagPattern(text) {
  return NEVER_FLAG_PATTERNS.some(re => re.test(text));
}

function detectRawPatterns(transcript) {
  // Bug fix: never-flag check must be per-sentence, not on the whole transcript.
  // "I wish I could. I'll have the report by Friday." — the commitment must not be blocked
  // by the wish in the same transcript. Filter sentence-by-sentence below.

  const candidates = [];

  // Split into sentences for more precise detection
  const sentences = transcript.split(/(?<=[.!?])\s+|(?<=\n)/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) continue;
    if (hasNeverFlagPattern(trimmed)) continue;

    let confidence = null;
    let matchedText = null;

    for (const re of HIGH_CONFIDENCE_PATTERNS) {
      const match = trimmed.match(re);
      if (match) {
        confidence = 0.90;
        matchedText = match[0];
        break;
      }
    }

    if (!confidence) {
      for (const re of MEDIUM_CONFIDENCE_PATTERNS) {
        const match = trimmed.match(re);
        if (match) {
          confidence = 0.55;
          matchedText = match[0];
          break;
        }
      }
    }

    if (confidence) {
      // Extract time expression if present
      let deadlineRaw = null;
      for (const re of TIME_PATTERNS) {
        const m = trimmed.match(re);
        if (m) {
          deadlineRaw = m[0];
          break;
        }
      }

      // Detect relationship hint from sentence context
      let relationship = null;
      for (const [rel, re] of Object.entries(RELATIONSHIP_PATTERNS)) {
        if (re.test(trimmed)) {
          relationship = rel;
          break;
        }
      }

      // Bug fix: skip if this specific sentence matches a never-flag pattern
      // (moved from transcript-level check — allows commitments in same transcript as wishes)
      if (hasNeverFlagPattern(trimmed)) continue;

      candidates.push({
        rawText: trimmed,
        matchedPhrase: matchedText,
        confidence,
        deadlineRaw,
        relationship,
      });
    }
  }

  return candidates;
}

/**
 * Use Claude to deeply classify a commitment candidate.
 * Returns { isCommitment, confidence, what, toWhom, byWhen, category, normalized }
 */
async function claudeClassify(candidate, context, councilService) {
  const prompt = `You are a commitment language classifier. Your job is to determine if the following statement is a genuine commitment (a promise or obligation the speaker intends to keep), and if so, extract structured details.

Statement: "${candidate.rawText}"
Surrounding context (30s): "${context || 'none'}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "isCommitment": true|false,
  "confidence": 0.0-1.0,
  "what": "what was committed to (brief noun phrase)",
  "toWhom": "name or null if to self",
  "byWhen": "ISO date string or null if no deadline",
  "byWhenRaw": "original time expression or null",
  "category": "work|family|personal|financial|health|other",
  "normalized": "Clean commitment: 'I will [what] by [when]' format",
  "reasoning": "one sentence explaining your classification"
}

Important:
- If the statement is a prediction, wish, hypothetical, or past fact → isCommitment: false
- If deadline is relative (tomorrow, next Friday), resolve to an absolute date assuming today is ${new Date().toISOString().split('T')[0]}
- If no deadline is explicit, byWhen is null
- Be conservative — only flag clear commitments`;

  try {
    const response = await councilService.ask(prompt, {
      model: 'claude',
      taskType: 'classification',
      systemPrompt: 'You are a commitment language classifier. Respond only with valid JSON.',
      temperature: 0.1,
    });

    const text = (response?.content || response?.text || response || '').trim();
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    // Claude failed — use raw pattern result as fallback
    console.warn('[CommitmentDetector] Claude classify failed:', err.message);
    return {
      isCommitment: candidate.confidence >= 0.80,
      confidence: candidate.confidence,
      what: candidate.rawText,
      toWhom: null,
      byWhen: null,
      byWhenRaw: candidate.deadlineRaw,
      category: 'other',
      normalized: candidate.rawText,
      reasoning: 'Pattern match fallback (Claude unavailable)',
    };
  }
}

/**
 * Use Grok for reality check: "can he actually keep this?"
 * Returns { achievable: true|false, concern: string|null }
 */
async function grokRealityCheck(commitment, councilService) {
  const prompt = `Reality check: Is this commitment realistically achievable?

Commitment: "${commitment.normalized}"
Deadline: ${commitment.byWhen || commitment.byWhenRaw || 'none specified'}
Category: ${commitment.category}

Respond with ONLY valid JSON:
{
  "achievable": true|false,
  "concern": "brief concern if not achievable, null if achievable",
  "suggestion": "brief reframe if concern exists, null otherwise"
}`;

  try {
    const response = await councilService.ask(prompt, {
      model: 'grok',
      taskType: 'classification',
      temperature: 0.2,
    });

    const text = (response?.content || response?.text || response || '').trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { achievable: true, concern: null, suggestion: null };
  }
}

export function createCommitmentDetector(councilService) {
  /**
   * Scan a transcript chunk for commitments.
   * @param {string} transcript - The 60-second transcript text
   * @param {string} [context] - Optional surrounding context (±30s)
   * @returns {Promise<Array>} Array of commitment objects (may be empty)
   */
  async function scan(transcript, context = '') {
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 20) {
      return [];
    }

    // Fast regex pre-filter — skip Claude API call if no candidates
    const rawCandidates = detectRawPatterns(transcript);
    if (rawCandidates.length === 0) return [];

    // Bug fix: parallelize — run Claude + Grok in parallel across candidates
    // (was sequential: 6 serial API calls for 3 candidates → now 2 parallel rounds)
    const classifyResults = await Promise.all(
      rawCandidates.map(c => claudeClassify(c, context, councilService))
    );

    const confirmed = rawCandidates
      .map((candidate, i) => ({ candidate, classification: classifyResults[i] }))
      .filter(({ classification }) => classification.isCommitment && classification.confidence >= 0.50);

    const realityResults = await Promise.all(
      confirmed.map(({ classification }) => grokRealityCheck(classification, councilService))
    );

    const commitments = confirmed.map(({ candidate, classification }, i) => ({
      rawText: candidate.rawText,
      normalizedText: classification.normalized,
      confidence: classification.confidence,
      what: classification.what,
      toWhom: classification.toWhom,
      deadline: classification.byWhen,
      deadlineRaw: classification.byWhenRaw || candidate.deadlineRaw,
      category: classification.category,
      relationship: candidate.relationship,
      transcriptContext: context,
      detectedFrom: 'audio',
      classificationReason: classification.reasoning,
      realityCheck: {
        achievable: realityResults[i].achievable,
        concern: realityResults[i].concern,
        suggestion: realityResults[i].suggestion,
      },
    }));

    return commitments;
  }

  /**
   * Extract structured details from a manually entered commitment string.
   * (Used for the manual add flow — same Claude pipeline, no audio context)
   */
  async function extractDetails(text) {
    if (!text) return null;

    const candidate = {
      rawText: text,
      matchedPhrase: text,
      confidence: 0.95, // User manually entered = high intent
      deadlineRaw: null,
      relationship: null,
    };

    // Extract time from raw text
    for (const re of TIME_PATTERNS) {
      const m = text.match(re);
      if (m) {
        candidate.deadlineRaw = m[0];
        break;
      }
    }

    const classification = await claudeClassify(candidate, '', councilService);
    const reality = await grokRealityCheck(classification, councilService);

    return {
      normalizedText: classification.normalized,
      what: classification.what,
      toWhom: classification.toWhom,
      deadline: classification.byWhen,
      deadlineRaw: classification.byWhenRaw || candidate.deadlineRaw,
      category: classification.category,
      confidence: classification.confidence,
      realityCheck: reality,
    };
  }

  return { scan, extractDetails };
}
