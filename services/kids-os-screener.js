/**
 * services/kids-os-screener.js
 *
 * Kids OS Misidentification Screener
 *
 * This feature exists because of Adam's daughter. She was misidentified as ADD,
 * put on Adderall, and cried all day. The actual issue was Irlen Syndrome —
 * visual stress. A $2 colored overlay changed everything.
 *
 * This screener identifies patterns consistent with common misidentification
 * scenarios. It NEVER diagnoses. It ALWAYS provides free first steps before
 * recommending professional evaluation. It routes to professionals, not to
 * the platform's own judgment.
 *
 * Constitutional constraint: every screening result must include the plain-language
 * framing: "pattern consistent with X — here's a free thing to try first."
 *
 * @ssot docs/projects/AMENDMENT_34_KIDS_OS.md
 */

export const SCREENING_PATTERNS = {
  visual_stress: {
    name: 'Visual Stress / Irlen Syndrome',
    description: 'Consistent reading difficulty with letter movement/blurring complaints, better performance with reduced text contrast, reading avoidance despite apparent comprehension in audio formats',
    freeIntervention: 'Colored overlay trial: print a page, place colored sheets one at a time (yellow, blue, green, pink, orange). Observe reading speed, comfort, and whether the child reports that letters "stay still." If any color helps significantly, that is important information.',
    whenToSeekProfessional: 'If the colored overlay trial shows significant and consistent improvement in reading comfort or speed, a developmental optometrist or Irlen-trained screener can do a proper evaluation. This is a tool assessment — not a diagnosis.',
    irlenGuidance: true,
  },
  gifted_as_adhd: {
    name: 'Giftedness Presenting as Attention Issues',
    description: 'High performance on novel challenging tasks, boredom-driven inattention on repetitive work, ability to hyperfocus on high-interest topics, questions that exceed grade level',
    freeIntervention: 'Before adjusting attention supports, increase challenge level on high-interest material. Track performance on novel vs repetitive tasks separately for 2 weeks. A child who can hyperfocus on things that interest them is not attention-impaired.',
    whenToSeekProfessional: 'If inattention persists even on genuinely novel, high-challenge material, a gifted-specialist evaluation (not just a standard ADHD evaluation) will give you more complete information.',
    irlenGuidance: false,
  },
  twice_exceptional: {
    name: 'Twice Exceptional (2E)',
    description: 'Domain-specific excellence coexisting with domain-specific significant struggle, compensatory strategies masking both strengths and challenges',
    freeIntervention: 'Map the specific domains of strength and struggle separately. A child who is excellent in some areas and significantly behind in others is often 2E — the intervention for each domain may be completely different.',
    whenToSeekProfessional: 'A psychologist who specializes in 2E children can help design a support plan that honors both the strengths and the challenges without letting either mask the other.',
    irlenGuidance: false,
  },
  auditory_processing: {
    name: 'Auditory Processing Differences',
    description: 'Follows instructions better when written vs spoken, difficulty in noisy environments, inconsistent compliance that maps to audio clarity',
    freeIntervention: 'Compare performance on written vs verbal instructions in a controlled setting. Reduce background noise and observe if comprehension and compliance improve. Give instructions one step at a time, in writing.',
    whenToSeekProfessional: 'An audiologist specializing in auditory processing (not just hearing acuity) can assess functional auditory processing. Standard hearing tests do not detect this.',
    irlenGuidance: false,
  },
  anxiety_as_behavior: {
    name: 'Anxiety Presenting as Behavior Issues',
    description: 'Behavior issues concentrated before performance situations, transitions, or social exposure — not consistent across all contexts',
    freeIntervention: 'Map when behavior issues occur. If they cluster before tests, presentations, transitions between activities, or social exposure — that is a different root cause than general behavior dysregulation. Anxiety responds to different interventions than behavior management.',
    whenToSeekProfessional: 'A child psychologist who specializes in anxiety can distinguish anxiety-driven behavior from other patterns and design a targeted intervention.',
    irlenGuidance: false,
  },
};

const IRLEN_GUIDANCE = `Print a page of text. Try placing a colored sheet over it — yellow, then blue, then green, then pink. Watch what happens to reading speed and comfort. If you see significant change with any color, that is important information worth exploring with a professional. This test costs nothing.`;

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createKidsOSScreener({ pool, callAI }) {

  /**
   * Run a misidentification screening for a child.
   * @param {number} childId
   * @param {{ observedBehaviors: string, teacherNotes?: string, parentNotes?: string }} opts
   */
  async function runScreening(childId, { observedBehaviors, teacherNotes, parentNotes }) {
    if (!observedBehaviors) throw new Error('observedBehaviors is required');

    const patternDescriptions = Object.entries(SCREENING_PATTERNS)
      .map(([key, p]) => `${key}: ${p.description}`)
      .join('\n');

    let detectedPatterns = [];

    if (callAI) {
      try {
        const prompt =
          `You are a pediatric education specialist reviewing behavioral observations to identify possible misidentification patterns. ` +
          `IMPORTANT: You are NOT diagnosing anything. You are identifying which patterns from the list below are CONSISTENT with the observations, and suggesting free first steps before any clinical referral.\n\n` +
          `PATTERNS TO CONSIDER:\n${patternDescriptions}\n\n` +
          `OBSERVATIONS:\n` +
          `Behaviors observed: ${observedBehaviors}\n` +
          (teacherNotes ? `Teacher notes: ${teacherNotes}\n` : '') +
          (parentNotes ? `Parent notes: ${parentNotes}\n` : '') +
          `\nReturn JSON: { "detectedPatterns": [{ "pattern": "<pattern_key>", "confidence": "low|moderate|high", "evidence": "<specific observations that match>", "firstStep": "<the free intervention for this pattern>" }], "summary": "<1-2 sentences for parent/teacher: what you see and why it matters>" }\n` +
          `Only include patterns with at least low confidence match. Never include patterns with no evidence. ` +
          `Always frame as "consistent with" not "is" or "has". ` +
          `If nothing matches, return empty detectedPatterns array with a reassuring summary.`;

        const raw = await callAI(prompt);
        const rawStr = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
        const parsed = JSON.parse(rawStr.match(/\{[\s\S]*\}/)?.[0] || rawStr);
        detectedPatterns = parsed.detectedPatterns || [];

        // Enrich with full pattern data
        detectedPatterns = detectedPatterns.map(dp => {
          const fullPattern = SCREENING_PATTERNS[dp.pattern];
          return {
            ...dp,
            patternName: fullPattern?.name || dp.pattern,
            freeIntervention: fullPattern?.freeIntervention || dp.firstStep,
            whenToSeekProfessional: fullPattern?.whenToSeekProfessional || 'Consult a specialist if the free intervention does not provide clarity.',
          };
        });
      } catch (_) {
        // If AI fails, do a basic keyword scan as fallback
        detectedPatterns = basicKeywordScan(observedBehaviors, teacherNotes, parentNotes);
      }
    } else {
      detectedPatterns = basicKeywordScan(observedBehaviors, teacherNotes, parentNotes);
    }

    const clearingSteps = detectedPatterns.map(dp => ({
      pattern: dp.pattern,
      patternName: dp.patternName,
      freeIntervention: dp.freeIntervention,
      whenToSeekProfessional: dp.whenToSeekProfessional,
    }));

    return {
      childId,
      detectedPatterns,
      clearingSteps,
      irlensGuidance: IRLEN_GUIDANCE,
      screenerNote: 'This screening identifies patterns — it does not diagnose. Every detected pattern has a free first step. Seek professional evaluation only after trying the free intervention and documenting the results.',
      screenedAt: new Date().toISOString(),
    };
  }

  /**
   * Store a screening result and update the child's flags.
   * @param {number} childId
   * @param {object} screeningResult
   */
  async function logScreeningResult(childId, screeningResult) {
    // Update the child's flags JSONB with detected patterns
    const existingResult = await pool.query(
      `SELECT flags FROM kids_os_children WHERE id = $1`,
      [childId]
    );
    if (!existingResult.rows.length) throw new Error(`Child ${childId} not found`);

    const existingFlags = existingResult.rows[0].flags || {};
    const updatedFlags = { ...existingFlags };

    for (const dp of screeningResult.detectedPatterns || []) {
      updatedFlags[dp.pattern] = {
        confidence: dp.confidence,
        evidence: dp.evidence,
        screenedAt: screeningResult.screenedAt,
      };
    }

    await pool.query(
      `UPDATE kids_os_children SET flags = $1, updated_at = now() WHERE id = $2`,
      [JSON.stringify(updatedFlags), childId]
    );

    // Store full screening result in a welfare flag for record keeping
    if (screeningResult.detectedPatterns?.length > 0) {
      await pool.query(
        `INSERT INTO kids_os_welfare_flags
           (child_id, flag_type, severity, evidence, resolved, routed_to, created_at)
         VALUES ($1, 'no_win_streak', 'watch', $2, false, 'screener_record', now())
         ON CONFLICT DO NOTHING`,
        [childId, JSON.stringify({ type: 'screening_result', patterns: screeningResult.detectedPatterns.map(d => d.pattern) })]
      ).catch(() => {
        // Swallow ON CONFLICT issues — the record is best-effort
      });
    }

    return { childId, flagsUpdated: Object.keys(updatedFlags), screeningResult };
  }

  /**
   * Get all past screenings for a child (via welfare flags tagged as screening records).
   * @param {number} childId
   */
  async function getScreeningHistory(childId) {
    // Screenings are stored in the flags JSONB on the child record
    // Full history from welfare flags
    const result = await pool.query(
      `SELECT evidence, created_at
       FROM kids_os_welfare_flags
       WHERE child_id = $1
         AND routed_to = 'screener_record'
       ORDER BY created_at DESC`,
      [childId]
    );

    // Also return the current flags snapshot
    const childResult = await pool.query(
      `SELECT flags FROM kids_os_children WHERE id = $1`,
      [childId]
    );
    const currentFlags = childResult.rows[0]?.flags || {};
    const detectedPatterns = Object.entries(currentFlags).map(([pattern, data]) => ({
      pattern,
      ...data,
    }));

    return {
      currentDetectedPatterns: detectedPatterns,
      pastScreenings: result.rows.map(r => ({
        evidence: r.evidence,
        date: r.created_at,
      })),
    };
  }

  // ── Fallback keyword scan (used when AI unavailable) ──────────────────────

  function basicKeywordScan(observedBehaviors, teacherNotes, parentNotes) {
    const combined = [observedBehaviors, teacherNotes, parentNotes].filter(Boolean).join(' ').toLowerCase();
    const found = [];

    if (/letters.*(move|blur|swim|jump)|reading.*avoid|headache.*read|word.*blur/.test(combined)) {
      found.push({
        pattern: 'visual_stress',
        patternName: SCREENING_PATTERNS.visual_stress.name,
        confidence: 'low',
        evidence: 'Observations include reading difficulty or visual complaints consistent with visual stress',
        freeIntervention: SCREENING_PATTERNS.visual_stress.freeIntervention,
        whenToSeekProfessional: SCREENING_PATTERNS.visual_stress.whenToSeekProfessional,
      });
    }
    if (/can't focus|won't sit still|fidget|distract|bored|too easy|already know/.test(combined)) {
      found.push({
        pattern: 'gifted_as_adhd',
        patternName: SCREENING_PATTERNS.gifted_as_adhd.name,
        confidence: 'low',
        evidence: 'Observations may be consistent with giftedness presenting as inattention',
        freeIntervention: SCREENING_PATTERNS.gifted_as_adhd.freeIntervention,
        whenToSeekProfessional: SCREENING_PATTERNS.gifted_as_adhd.whenToSeekProfessional,
      });
    }
    if (/doesn't listen|repeat instructions|mishear|noisy|background/.test(combined)) {
      found.push({
        pattern: 'auditory_processing',
        patternName: SCREENING_PATTERNS.auditory_processing.name,
        confidence: 'low',
        evidence: 'Observations suggest possible auditory processing differences',
        freeIntervention: SCREENING_PATTERNS.auditory_processing.freeIntervention,
        whenToSeekProfessional: SCREENING_PATTERNS.auditory_processing.whenToSeekProfessional,
      });
    }

    return found;
  }

  return {
    runScreening,
    logScreeningResult,
    getScreeningHistory,
    SCREENING_PATTERNS,
  };
}
