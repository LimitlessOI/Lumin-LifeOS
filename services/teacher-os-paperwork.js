/**
 * services/teacher-os-paperwork.js
 *
 * Paperwork Eliminator for Teacher OS.
 * Generates all teacher documents via AI — lesson plans, progress reports,
 * parent emails, rubrics, IEP drafts, sub briefs, conference prep, and
 * end-of-day decompression briefs.
 *
 * Teacher is always the decision-maker: AI drafts, teacher approves.
 * Student display names (aliases) are used in all AI calls — never real names.
 *
 * @ssot docs/projects/AMENDMENT_31_TEACHER_OS.md
 */

const DOC_PROMPTS = {
  lesson_plan: `Generate a complete, standards-aligned lesson plan. Format: Objective, Materials, Opening Hook (5 min), Direct Instruction (15 min), Guided Practice (10 min), Independent Work (10 min), Closure (5 min), Differentiation Notes, Assessment. Make the opening hook genuinely engaging — something that makes students lean forward.`,

  progress_report: `Draft a progress report that is honest, specific, and focused on growth trajectory rather than just current performance. Highlight one specific win and one specific growth opportunity. Tone: warm, professional, evidence-based.`,

  parent_email: `Draft a parent email that is warm, clear, and actionable. Never vague. Lead with something positive. Be specific about the concern or update. End with a clear next step.`,

  rubric: `Generate a clear grading rubric with 4 performance levels (Exceeds/Meets/Approaching/Beginning). Each cell must describe specific observable behavior, not vague language like 'good understanding'.`,

  iep_draft: `Draft IEP goal language that is SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Include: present level of performance, annual goal, short-term objectives, measurement method. This is a draft for professional review — not a final clinical document.`,

  compliance_form: `Draft a compliance form response that is clear, factual, and professionally worded. Use only the information provided. Flag any fields that require information not available.`,

  sub_brief: `Generate a substitute teacher brief that gives a substitute everything they need to run the class effectively. Include: class dynamics, individual student flags (use display names only), where we are in the curriculum, a ready-to-run activity, and 3 things to watch for.`,

  conference_prep: `Generate a parent-teacher conference prep brief. Include: 3 most important things to communicate, supporting evidence for each, questions to ask the parent, what to listen for, and a concrete action plan to close with.`,

  decompression_brief: `Generate a 2-minute end-of-day decompression for a teacher. Three sections: (1) What went well today — 2-3 specific things. (2) What was hard — named honestly, not suppressed. (3) What to set down — specific things that can wait until tomorrow. Tone: warm, direct, human.`,
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createTeacherOSPaperwork({ pool, callAI }) {
  // ── Private helpers ────────────────────────────────────────────────────────

  async function getTeacher(teacherId) {
    const { rows } = await pool.query(
      `SELECT * FROM teacher_os_teachers WHERE id = $1`,
      [teacherId]
    );
    return rows[0] || null;
  }

  async function getStudentForTeacher(teacherId, studentId) {
    const { rows } = await pool.query(
      `SELECT * FROM teacher_os_students WHERE id = $1 AND teacher_id = $2`,
      [studentId, teacherId]
    );
    return rows[0] || null;
  }

  function buildContextBlock(teacher, student, additionalContext) {
    const parts = [];
    if (teacher) {
      const grades = (teacher.grade_levels || []).join(', ') || 'unspecified grade';
      const subjects = (teacher.subjects || []).join(', ') || 'unspecified subject';
      parts.push(`Teacher context: grades ${grades}, subjects ${subjects}.`);
      if (teacher.school_name) parts.push(`School: ${teacher.school_name}.`);
    }
    if (student) {
      parts.push(`Student alias: ${student.display_name}.`);
      if (student.grade_level) parts.push(`Grade: ${student.grade_level}.`);
      if (student.age) parts.push(`Age: ${student.age}.`);
      if (student.growth_edge) parts.push(`Current growth edge: ${student.growth_edge}.`);
      if (student.inspiration_trigger) parts.push(`Inspiration trigger: ${student.inspiration_trigger}.`);
      const interests = (student.interests || []);
      if (interests.length) parts.push(`Student interests: ${interests.join(', ')}.`);
      if (student.confidence_level != null) parts.push(`Confidence level: ${student.confidence_level}/10.`);
    }
    if (additionalContext) parts.push(`Additional context: ${additionalContext}`);
    return parts.join(' ');
  }

  async function callAIForDoc(docType, contextBlock, subject, gradeLevel) {
    if (!callAI) return `[AI unavailable — ${docType} draft placeholder]`;

    const systemInstruction = DOC_PROMPTS[docType] || DOC_PROMPTS.lesson_plan;
    const subjectLine = subject ? `Subject: ${subject}.` : '';
    const gradeLine = gradeLevel ? `Grade level: ${gradeLevel}.` : '';

    const prompt =
      `${systemInstruction}\n\n` +
      `${[subjectLine, gradeLine, contextBlock].filter(Boolean).join(' ')}`;

    try {
      const result = await callAI(prompt);
      return typeof result === 'string' ? result : result?.content || result?.text || String(result);
    } catch (err) {
      return `[AI error generating ${docType}: ${err.message}]`;
    }
  }

  async function saveDocument(teacherId, studentId, docType, subject, gradeLevel, content, metadata) {
    const { rows } = await pool.query(
      `INSERT INTO teacher_os_documents
         (teacher_id, student_id, doc_type, subject, grade_level, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [teacherId, studentId || null, docType, subject || null, gradeLevel || null, content, JSON.stringify(metadata || {})]
    );
    return rows[0];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a document for a teacher, optionally targeted at a specific student.
   */
  async function generateDocument(teacherId, { docType, subject, gradeLevel, studentId, additionalContext }) {
    if (!DOC_PROMPTS[docType]) {
      throw new Error(`Unknown doc_type: ${docType}. Valid types: ${Object.keys(DOC_PROMPTS).join(', ')}`);
    }

    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    const student = studentId ? await getStudentForTeacher(teacherId, studentId) : null;
    const contextBlock = buildContextBlock(teacher, student, additionalContext);
    const content = await callAIForDoc(docType, contextBlock, subject, gradeLevel);

    return saveDocument(teacherId, studentId, docType, subject, gradeLevel, content, {
      generated_at: new Date().toISOString(),
      has_student_context: !!student,
    });
  }

  /**
   * Teacher approves a document — marks it ready for use.
   */
  async function approveDocument(teacherId, docId) {
    const { rows } = await pool.query(
      `UPDATE teacher_os_documents
       SET approved = true, approved_at = now()
       WHERE id = $1 AND teacher_id = $2
       RETURNING *`,
      [docId, teacherId]
    );
    if (!rows[0]) throw new Error(`Document ${docId} not found for teacher ${teacherId}`);
    return rows[0];
  }

  /**
   * List documents for a teacher, with optional filters.
   */
  async function getDocuments(teacherId, { docType, studentId, limit = 20 } = {}) {
    const conditions = ['teacher_id = $1'];
    const params = [teacherId];
    let idx = 2;

    if (docType) {
      conditions.push(`doc_type = $${idx++}`);
      params.push(docType);
    }
    if (studentId != null) {
      conditions.push(`student_id = $${idx++}`);
      params.push(studentId);
    }

    params.push(Math.min(limit, 100));
    const { rows } = await pool.query(
      `SELECT * FROM teacher_os_documents
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx}`,
      params
    );
    return rows;
  }

  /**
   * Generate a substitute teacher brief for the entire class.
   */
  async function generateSubBrief(teacherId) {
    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    const { rows: students } = await pool.query(
      `SELECT display_name, grade_level, age, interests, engagement_profile, growth_edge
       FROM teacher_os_students WHERE teacher_id = $1 ORDER BY display_name`,
      [teacherId]
    );

    const studentSummaries = students.map(s => {
      const interests = (s.interests || []).join(', ');
      return `${s.display_name} (grade ${s.grade_level || '?'}${interests ? `, interests: ${interests}` : ''}${s.growth_edge ? `, growth edge: ${s.growth_edge}` : ''})`;
    }).join('\n');

    const contextBlock =
      `Class roster (${students.length} students):\n${studentSummaries || 'No students enrolled yet.'}\n` +
      buildContextBlock(teacher, null, null);

    const content = await callAIForDoc('sub_brief', contextBlock, null, null);
    return saveDocument(teacherId, null, 'sub_brief', null, null, content, {
      student_count: students.length,
      generated_at: new Date().toISOString(),
    });
  }

  /**
   * Generate a conference prep document for a specific student.
   */
  async function generateConferencePrep(teacherId, studentId) {
    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    const student = await getStudentForTeacher(teacherId, studentId);
    if (!student) throw new Error(`Student ${studentId} not found for teacher ${teacherId}`);

    // Pull recent wins
    const { rows: recentWins } = await pool.query(
      `SELECT win_description, domain, logged_at
       FROM teacher_os_win_log
       WHERE student_id = $1
       ORDER BY logged_at DESC
       LIMIT 5`,
      [studentId]
    );

    const winsSummary = recentWins.length
      ? `Recent wins: ${recentWins.map(w => `"${w.win_description}" (${w.domain || 'general'})`).join('; ')}`
      : 'No recent wins logged.';

    const additionalContext =
      `${winsSummary}. ` +
      `Days since last win: ${student.days_since_win}. ` +
      (student.growth_edge ? `Growth edge: ${student.growth_edge}. ` : '') +
      (student.inspiration_trigger ? `Inspiration trigger: ${student.inspiration_trigger}.` : '');

    const contextBlock = buildContextBlock(teacher, student, additionalContext);
    const content = await callAIForDoc('conference_prep', contextBlock, null, student.grade_level);
    return saveDocument(teacherId, studentId, 'conference_prep', null, student.grade_level, content, {
      days_since_win: student.days_since_win,
      generated_at: new Date().toISOString(),
    });
  }

  /**
   * Generate an end-of-day decompression brief for a teacher.
   * Marks decompression_done=true on today's wellbeing record if it exists.
   */
  async function generateDecompressionBrief(teacherId) {
    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    // Pull today's wellbeing + recent student wins attributed to this teacher
    const { rows: wellbeing } = await pool.query(
      `SELECT workload_score, emotional_load_score, notes
       FROM teacher_os_wellbeing
       WHERE teacher_id = $1 AND logged_at::date = CURRENT_DATE
       ORDER BY logged_at DESC
       LIMIT 1`,
      [teacherId]
    );

    const { rows: recentWins } = await pool.query(
      `SELECT s.display_name, w.win_description, w.domain
       FROM teacher_os_win_log w
       JOIN teacher_os_students s ON s.id = w.student_id
       WHERE w.teacher_id = $1 AND w.logged_at >= now() - interval '7 days'
       ORDER BY w.logged_at DESC
       LIMIT 10`,
      [teacherId]
    );

    const wb = wellbeing[0];
    const wellbeingContext = wb
      ? `Today's workload score: ${wb.workload_score}/10. Emotional load score: ${wb.emotional_load_score}/10.` +
        (wb.notes ? ` Teacher notes: ${wb.notes}.` : '')
      : 'No wellbeing data logged today.';

    const winsContext = recentWins.length
      ? `Student wins this week: ${recentWins.map(w => `${w.display_name}: "${w.win_description}"`).join('; ')}`
      : 'No student wins logged this week.';

    const contextBlock = buildContextBlock(teacher, null, `${wellbeingContext} ${winsContext}`);
    const content = await callAIForDoc('decompression_brief', contextBlock, null, null);

    // Mark decompression_done if we have a today record
    if (wb) {
      await pool.query(
        `UPDATE teacher_os_wellbeing
         SET decompression_done = true
         WHERE teacher_id = $1 AND logged_at::date = CURRENT_DATE`,
        [teacherId]
      ).catch(() => null); // non-fatal
    }

    return saveDocument(teacherId, null, 'decompression_brief', null, null, content, {
      wellbeing_score: wb?.workload_score || null,
      wins_referenced: recentWins.length,
      generated_at: new Date().toISOString(),
    });
  }

  return {
    generateDocument,
    approveDocument,
    getDocuments,
    generateSubBrief,
    generateConferencePrep,
    generateDecompressionBrief,
  };
}
