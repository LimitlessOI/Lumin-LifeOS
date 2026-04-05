/**
 * services/teacher-os-students.js
 *
 * Student profile manager for Teacher OS.
 * Tracks student profiles, wins, engagement, and misidentification flags.
 *
 * The Belonging Guarantee: no child goes 5 days without a documented win.
 * The system surfaces who hasn't had one and generates a specific
 * actionable prompt for each flagged student, drawn from their
 * known interests and strengths.
 *
 * The Class Coherence Engine: same lesson, 30 personalized doors in.
 * generateIndividualizedEntryPoints produces a unique entry point into
 * a shared lesson topic for every student in the class.
 *
 * The misidentification screening exists because of Adam's daughter.
 * She was misdiagnosed with ADD, put on Adderall, cried all day.
 * The real issue was Irlen Syndrome — a $2 colored overlay fixed everything.
 * This system catches that before it becomes a clinical crisis.
 *
 * @ssot docs/projects/AMENDMENT_31_TEACHER_OS.md
 */

const MISIDENTIFICATION_FIRST_STEPS = {
  visual_stress: [
    "Try a colored overlay (yellow, blue, green, pink) before any referral. Watch what happens to reading speed and comfort.",
    "Adjust screen brightness and background color for digital work.",
    "Observe whether the student tracks better with a reading guide or finger under text.",
    "Note whether fluorescent lighting seems to worsen the pattern.",
  ],
  gifted_as_adhd: [
    "Assess whether the behavior disappears when the task is sufficiently challenging.",
    "Offer choice and autonomy in how the work is completed — not just what is completed.",
    "Check for 'asynchronous development': advanced cognition, typical social/emotional development.",
    "Document: does the student finish early and create disruption? That's boredom, not ADHD.",
  ],
  twice_exceptional: [
    "The strength and the difficulty are real simultaneously — do not let one cancel the other.",
    "Accommodations for the difficulty should not cap the ceiling on the strength.",
    "Consult with your school's gifted coordinator and special education team together — not separately.",
  ],
  auditory_processing: [
    "Seat the student away from ambient noise sources (HVAC, door, hallway).",
    "Provide written versions of verbal instructions.",
    "Check whether comprehension improves with direct eye contact and slower speech.",
    "Referral to an audiologist (not psychologist) is the appropriate first step if pattern persists.",
  ],
  anxiety_as_behavior: [
    "Document the trigger-behavior pattern: what precedes the behavior every time?",
    "Behavioral disruption that disappears on Fridays/before breaks is anxiety, not willful defiance.",
    "Predictability and advance notice reduce anxiety-driven behavior more than consequences do.",
    "Consult with school counselor before a behavioral intervention plan — the root is different.",
  ],
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createTeacherOSStudents({ pool, callAI }) {
  // ── Private helpers ────────────────────────────────────────────────────────

  async function callAIText(prompt) {
    if (!callAI) return null;
    try {
      const result = await callAI(prompt);
      return typeof result === 'string' ? result : result?.content || result?.text || String(result);
    } catch {
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a student to a teacher's roster.
   */
  async function enrollStudent(teacherId, { displayName, gradeLevel, age, interests }) {
    if (!displayName) throw new Error('displayName is required');

    const { rows } = await pool.query(
      `INSERT INTO teacher_os_students
         (teacher_id, display_name, grade_level, age, interests)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teacherId, displayName, gradeLevel || null, age || null, interests || []]
    );
    return rows[0];
  }

  /**
   * Get a single student record.
   */
  async function getStudent(studentId) {
    const { rows } = await pool.query(
      `SELECT * FROM teacher_os_students WHERE id = $1`,
      [studentId]
    );
    return rows[0] || null;
  }

  /**
   * Get all students for a teacher with their win status.
   */
  async function getClassRoster(teacherId) {
    const { rows } = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM teacher_os_win_log w WHERE w.student_id = s.id) AS total_wins,
              (SELECT logged_at FROM teacher_os_win_log w WHERE w.student_id = s.id ORDER BY logged_at DESC LIMIT 1) AS last_win_at
       FROM teacher_os_students s
       WHERE s.teacher_id = $1
       ORDER BY s.display_name`,
      [teacherId]
    );
    return rows;
  }

  /**
   * Update a student's profile fields.
   */
  async function updateStudentProfile(studentId, updates) {
    const allowed = ['grade_level', 'age', 'learning_style', 'engagement_profile',
                     'interests', 'inspiration_trigger', 'confidence_level', 'growth_edge'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        const val = typeof updates[key] === 'object' && !Array.isArray(updates[key])
          ? JSON.stringify(updates[key])
          : updates[key];
        values.push(val);
      }
    }

    if (!fields.length) throw new Error('No valid fields to update');

    fields.push(`updated_at = now()`);
    values.push(studentId);

    const { rows } = await pool.query(
      `UPDATE teacher_os_students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!rows[0]) throw new Error(`Student ${studentId} not found`);
    return rows[0];
  }

  /**
   * Log a win for a student.
   * Resets days_since_win to 0 for this student.
   * Checks other students in the class for 5+ day dry spells.
   */
  async function logWin(teacherId, studentId, { winDescription, domain }) {
    if (!winDescription) throw new Error('winDescription is required');

    // Insert win record
    const { rows: winRows } = await pool.query(
      `INSERT INTO teacher_os_win_log (teacher_id, student_id, win_description, domain)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teacherId, studentId, winDescription, domain || null]
    );

    // Reset days_since_win for this student
    await pool.query(
      `UPDATE teacher_os_students SET days_since_win = 0, updated_at = now() WHERE id = $1`,
      [studentId]
    );

    // Check other students for 5+ day dry spells
    const { rows: flagged } = await pool.query(
      `SELECT id, display_name, days_since_win
       FROM teacher_os_students
       WHERE teacher_id = $1 AND id != $2 AND days_since_win > 5`,
      [teacherId, studentId]
    );

    return {
      win: winRows[0],
      flaggedStudents: flagged,
    };
  }

  /**
   * Belonging guarantee report: who hasn't had a win in 5+ days?
   * Returns actionable prompts for each flagged student.
   */
  async function getBelongingReport(teacherId) {
    const { rows: students } = await pool.query(
      `SELECT * FROM teacher_os_students WHERE teacher_id = $1`,
      [teacherId]
    );

    const flagged = students.filter(s => s.days_since_win > 5);
    const safe = students.filter(s => s.days_since_win <= 5);

    const flaggedWithPrompts = await Promise.all(
      flagged.map(async (student) => {
        const interests = (student.interests || []).join(', ');
        const inspirationTrigger = student.inspiration_trigger || '';

        const aiPrompt =
          `A student named "${student.display_name}" (grade ${student.grade_level || 'unknown'}) ` +
          `hasn't had a documented win in ${student.days_since_win} days. ` +
          `Their interests include: ${interests || 'unknown'}. ` +
          (inspirationTrigger ? `Their inspiration trigger is: ${inspirationTrigger}. ` : '') +
          (student.growth_edge ? `Their current growth edge is: ${student.growth_edge}. ` : '') +
          `Generate ONE specific, actionable interaction for a teacher: a question to ask or observation to make ` +
          `that could create a genuine win moment for this student today. Be concrete and specific. ` +
          `Reference their interests or strengths. 2-3 sentences.`;

        const suggestion = await callAIText(aiPrompt) ||
          `Ask ${student.display_name} to share something they know well — lean into their interests.`;

        return {
          ...student,
          suggested_interaction: suggestion,
        };
      })
    );

    return {
      totalStudents: students.length,
      safe: safe.length,
      flagged: flaggedWithPrompts,
      message: flaggedWithPrompts.length > 0
        ? `${flaggedWithPrompts.length} student${flaggedWithPrompts.length > 1 ? 's haven\'t' : ' hasn\'t'} had a documented win in 5+ days. Here's a suggested interaction for each.`
        : 'All students have had a recent win moment.',
    };
  }

  /**
   * Class Coherence Engine: same lesson, 30 personalized doors in.
   * Generates an individualized entry point for every student in the class.
   */
  async function generateIndividualizedEntryPoints(teacherId, { subject, lessonTopic, gradeLevel }) {
    if (!lessonTopic) throw new Error('lessonTopic is required');

    const { rows: students } = await pool.query(
      `SELECT * FROM teacher_os_students WHERE teacher_id = $1 ORDER BY display_name`,
      [teacherId]
    );

    if (!students.length) return [];

    const entryPoints = await Promise.all(
      students.map(async (student) => {
        const interests = (student.interests || []).join(', ');
        const trigger = student.inspiration_trigger || '';

        const aiPrompt =
          `The class is learning: "${lessonTopic}"` +
          (subject ? ` (${subject})` : '') +
          (gradeLevel ? ` at grade ${gradeLevel}` : '') +
          `.\n\n` +
          `Student: ${student.display_name}` +
          (interests ? `, interests: ${interests}` : '') +
          (trigger ? `, what lights them up: ${trigger}` : '') +
          (student.growth_edge ? `, growth edge: ${student.growth_edge}` : '') +
          `.\n\n` +
          `Generate: (1) A personalized "entry point" — a framing of the lesson topic that connects to this student's world or interests. ` +
          `(2) One personalized discussion question or task that gets this specific student engaged with the same shared content. ` +
          `Be concrete and specific. 2-3 sentences each. ` +
          `Format as JSON: { "entry_point": "...", "personalized_question": "..." }`;

        let entryPoint = `Connect ${lessonTopic} to ${interests || 'something this student cares about'}.`;
        let personalizedQuestion = `How does ${lessonTopic} show up in something you already know and love?`;

        const raw = await callAIText(aiPrompt);
        if (raw) {
          try {
            const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
            if (parsed.entry_point) entryPoint = parsed.entry_point;
            if (parsed.personalized_question) personalizedQuestion = parsed.personalized_question;
          } catch {
            // keep defaults
          }
        }

        return {
          studentId: student.id,
          studentDisplayName: student.display_name,
          entryPoint,
          personalizedQuestion,
        };
      })
    );

    return entryPoints;
  }

  /**
   * Flag a misidentification pattern on a student's profile.
   */
  async function flagMisidentification(studentId, { pattern, evidence, notes }) {
    const validPatterns = Object.keys(MISIDENTIFICATION_FIRST_STEPS);
    if (!validPatterns.includes(pattern)) {
      throw new Error(`Unknown pattern: ${pattern}. Valid: ${validPatterns.join(', ')}`);
    }

    // Fetch existing flags
    const { rows: current } = await pool.query(
      `SELECT misidentification_flags FROM teacher_os_students WHERE id = $1`,
      [studentId]
    );
    if (!current[0]) throw new Error(`Student ${studentId} not found`);

    const existing = current[0].misidentification_flags || {};
    const updated = {
      ...existing,
      [pattern]: {
        flagged_at: new Date().toISOString(),
        evidence: evidence || null,
        notes: notes || null,
      },
    };

    const { rows } = await pool.query(
      `UPDATE teacher_os_students
       SET misidentification_flags = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(updated), studentId]
    );

    return rows[0];
  }

  /**
   * Get a report of all students with misidentification flags.
   * Always includes Irlen/visual_stress guidance.
   */
  async function getMisidentificationReport(teacherId) {
    const { rows: students } = await pool.query(
      `SELECT id, display_name, grade_level, misidentification_flags
       FROM teacher_os_students
       WHERE teacher_id = $1 AND misidentification_flags != '{}'::jsonb
       ORDER BY display_name`,
      [teacherId]
    );

    const report = students.map(student => {
      const flags = student.misidentification_flags || {};
      const patterns = Object.keys(flags);

      const firstSteps = patterns.flatMap(p =>
        (MISIDENTIFICATION_FIRST_STEPS[p] || []).map(step => ({ pattern: p, step }))
      );

      return {
        studentId: student.id,
        displayName: student.display_name,
        gradeLevel: student.grade_level,
        flags,
        recommendedFirstSteps: firstSteps,
      };
    });

    return {
      totalFlagged: report.length,
      students: report,
      irlensReminder: MISIDENTIFICATION_FIRST_STEPS.visual_stress[0],
    };
  }

  return {
    enrollStudent,
    getStudent,
    getClassRoster,
    updateStudentProfile,
    logWin,
    getBelongingReport,
    generateIndividualizedEntryPoints,
    flagMisidentification,
    getMisidentificationReport,
  };
}
