/**
 * services/teacher-os-selfcare.js
 *
 * Teacher self-care is a CORE FEATURE of Teacher OS, not a wellness add-on.
 *
 * A depleted teacher cannot protect the love of learning in their students.
 * The platform's core mission depends on teachers who are resourced, not
 * running on fumes. This service tracks workload signals, emotional load,
 * and delivers the one thing teachers almost never receive: concrete evidence
 * that their effort changed something.
 *
 * The most important feature here is celebrateImpact — teachers almost never
 * receive feedback that they specifically mattered. This system delivers that
 * in real time from data it already tracks.
 *
 * @ssot docs/projects/AMENDMENT_31_TEACHER_OS.md
 */

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createTeacherOSSelfCare({ pool, callAI }) {
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

  async function getTeacher(teacherId) {
    const { rows } = await pool.query(
      `SELECT * FROM teacher_os_teachers WHERE id = $1`,
      [teacherId]
    );
    return rows[0] || null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Log a teacher's wellbeing snapshot.
   * Triggers alerts if scores indicate overload.
   */
  async function logWellbeing(teacherId, { workloadScore, emotionalLoadScore, notes }) {
    const { rows } = await pool.query(
      `INSERT INTO teacher_os_wellbeing
         (teacher_id, workload_score, emotional_load_score, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teacherId, workloadScore || null, emotionalLoadScore || null, notes || null]
    );
    const record = rows[0];

    const alerts = [];

    if (workloadScore > 7) {
      const offerPrompt =
        `A teacher just reported a workload score of ${workloadScore}/10. ` +
        `Generate 3 specific, concrete things the Teacher OS system can take off their plate right now. ` +
        `Be specific — not "generate your lesson plans" but "I can generate this week's lesson plan for all 5 subjects in the next 60 seconds. Just say go." ` +
        `Format as a brief bulleted list.`;

      const workloadAlert = await callAIText(offerPrompt) ||
        `Your workload is high. Here are 3 things I can take off your plate:\n- Generate all this week's lesson plans\n- Draft your parent communication queue\n- Prep your sub brief so you have it ready`;

      alerts.push({ type: 'workload', message: workloadAlert });
    }

    if (emotionalLoadScore > 7) {
      const resetPrompt =
        `A teacher just reported an emotional load score of ${emotionalLoadScore}/10. ` +
        `Generate a 3-minute reset prompt. Not a therapy exercise — a practical, human, specific ` +
        `acknowledgment of the weight they're carrying and one concrete thing they can do in the next 3 minutes ` +
        `to metabolize some of that load before the next part of their day. Be warm and direct.`;

      const emotionalAlert = await callAIText(resetPrompt) ||
        `That emotional load is real and it's heavy. Before the next thing: take 3 minutes to write down what specifically is weighing on you. Not to solve it — just to name it. Named things lose some of their weight.`;

      alerts.push({ type: 'emotional_load', message: emotionalAlert });
    }

    return { record, alerts };
  }

  /**
   * Get wellbeing trend for the last N days.
   */
  async function getWellbeingTrend(teacherId, days = 14) {
    const { rows } = await pool.query(
      `SELECT workload_score, emotional_load_score, impact_moments, decompression_done, notes, logged_at
       FROM teacher_os_wellbeing
       WHERE teacher_id = $1 AND logged_at >= now() - interval '1 day' * $2
       ORDER BY logged_at ASC`,
      [teacherId, days]
    );

    if (!rows.length) {
      return { trend: [], analysis: 'No wellbeing data logged in this period.' };
    }

    const avgWorkload = rows.reduce((s, r) => s + (r.workload_score || 0), 0) / rows.length;
    const avgEmotional = rows.reduce((s, r) => s + (r.emotional_load_score || 0), 0) / rows.length;
    const decompressionRate = rows.filter(r => r.decompression_done).length / rows.length;

    const analysisPrompt =
      `A teacher's wellbeing data over the last ${days} days shows:\n` +
      `- Average workload score: ${avgWorkload.toFixed(1)}/10\n` +
      `- Average emotional load: ${avgEmotional.toFixed(1)}/10\n` +
      `- Decompression completion rate: ${(decompressionRate * 100).toFixed(0)}%\n` +
      `- Data points: ${rows.length}\n\n` +
      `Provide a brief, honest, practical analysis of what this pattern suggests and one specific recommendation. ` +
      `Not clinical language — just a direct read of the numbers from someone who cares about the teacher's wellbeing.`;

    const analysis = await callAIText(analysisPrompt) ||
      `${avgWorkload > 7 ? 'Workload is consistently high — sustainable intervention needed.' : 'Workload is in a manageable range.'} ` +
      `${decompressionRate < 0.5 ? 'Decompression is inconsistent — that matters more than you might think.' : 'Good decompression consistency.'}`;

    return { trend: rows, analysis };
  }

  /**
   * Celebrate the teacher's impact — delivers concrete evidence of what they changed.
   * This is the most important self-care feature. Teachers almost never receive
   * feedback that they specifically mattered.
   */
  async function celebrateImpact(teacherId) {
    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    const { rows: wins } = await pool.query(
      `SELECT s.display_name, w.win_description, w.domain, w.logged_at,
              s.days_since_win, s.inspiration_trigger
       FROM teacher_os_win_log w
       JOIN teacher_os_students s ON s.id = w.student_id
       WHERE w.teacher_id = $1 AND w.logged_at >= now() - interval '7 days'
       ORDER BY w.logged_at DESC`,
      [teacherId]
    );

    // Find students who had a dry spell broken recently (days_since_win was high before)
    const { rows: turnarounds } = await pool.query(
      `SELECT DISTINCT s.display_name, s.days_since_win,
              (SELECT COUNT(*) FROM teacher_os_win_log w2 WHERE w2.student_id = s.id AND w2.logged_at >= now() - interval '7 days') AS wins_this_week
       FROM teacher_os_students s
       WHERE s.teacher_id = $1 AND s.days_since_win = 0
         AND (SELECT COUNT(*) FROM teacher_os_win_log w3 WHERE w3.student_id = s.id AND w3.logged_at >= now() - interval '7 days') > 0`,
      [teacherId]
    );

    if (!wins.length) {
      return {
        impactMoments: 0,
        message: "No student wins logged this week yet. Start logging wins — they become the evidence of your impact.",
      };
    }

    const impactPrompt =
      `A teacher had ${wins.length} student win moments this week. ` +
      `Here are the specifics:\n` +
      wins.slice(0, 8).map(w => `- ${w.display_name}: "${w.win_description}" (${w.domain || 'general'})`).join('\n') +
      `\n\n` +
      (turnarounds.length
        ? `Students who broke out of a dry spell this week: ${turnarounds.map(t => `${t.display_name} (${t.wins_this_week} wins this week)`).join(', ')}.\n\n`
        : '') +
      `Write a 3-4 sentence impact statement for this teacher. Be specific — use the student names and win details. ` +
      `Not generic praise. Concrete evidence that their effort changed something real. ` +
      `Warm but not saccharine. Direct and specific.`;

    const message = await callAIText(impactPrompt) ||
      `This week, ${wins.length} students had breakthrough moments documented in your class. ` +
      `That doesn't happen without a teacher who notices, who creates the conditions, and who records it. ` +
      `${turnarounds.length > 0 ? `${turnarounds[0].display_name} broke a dry spell this week — that turnaround was because of something you did.` : ''}`;

    return {
      impactMoments: wins.length,
      studentsTouched: [...new Set(wins.map(w => w.display_name))].length,
      message,
      wins: wins.slice(0, 10),
    };
  }

  /**
   * Get veteran-level guidance for the specific situation a teacher is facing.
   * For new teachers facing the hardest parts of the job.
   */
  async function getNewTeacherGuidance(teacherId, { situation }) {
    if (!situation) throw new Error('situation is required');

    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    const grades = (teacher.grade_levels || []).join(', ') || 'unspecified grade';
    const subjects = (teacher.subjects || []).join(', ') || 'unspecified subject';

    const guidancePrompt =
      `A teacher (grades: ${grades}, subjects: ${subjects}) is facing this situation:\n` +
      `"${situation}"\n\n` +
      `Respond as a veteran teacher with 20+ years of experience who knows this grade level and subject deeply. ` +
      `Give practical, specific guidance drawn from what actually works in real classrooms. ` +
      `Not theory. Not "create a positive learning environment." ` +
      `What specifically do you do, what do you say, what have you seen work? ` +
      `Be direct. Be specific. Be the mentor this teacher needed on day one. ` +
      `If the situation involves a student crisis or safety concern, name that first.`;

    const guidance = await callAIText(guidancePrompt) ||
      `This situation is real and it's hard. Here's what I know works: ${situation.includes('shut down') ? 'Give them a way out that doesn\'t feel like defeat. A simple task, low stakes, that lets them re-enter at their own pace.' : 'Stay steady. Your calm is contagious.'}`;

    return { situation, guidance };
  }

  /**
   * Generate a morning briefing for a teacher.
   * Surfaces what matters today, who needs attention, and what's coming.
   */
  async function getDailyBriefing(teacherId) {
    const teacher = await getTeacher(teacherId);
    if (!teacher) throw new Error(`Teacher ${teacherId} not found`);

    // Students needing attention (5+ days without win)
    const { rows: attentionStudents } = await pool.query(
      `SELECT id, display_name, days_since_win, interests, inspiration_trigger
       FROM teacher_os_students
       WHERE teacher_id = $1 AND days_since_win > 5
       ORDER BY days_since_win DESC`,
      [teacherId]
    );

    // Recent wins (yesterday)
    const { rows: recentWins } = await pool.query(
      `SELECT s.display_name, w.win_description
       FROM teacher_os_win_log w
       JOIN teacher_os_students s ON s.id = w.student_id
       WHERE w.teacher_id = $1 AND w.logged_at >= CURRENT_DATE - interval '1 day'
       ORDER BY w.logged_at DESC
       LIMIT 5`,
      [teacherId]
    );

    // Today's workload alert
    const { rows: wellbeing } = await pool.query(
      `SELECT workload_score, emotional_load_score
       FROM teacher_os_wellbeing
       WHERE teacher_id = $1
       ORDER BY logged_at DESC
       LIMIT 1`,
      [teacherId]
    );

    const lastWb = wellbeing[0];
    const workloadAlert = lastWb?.workload_score > 7
      ? `Workload score was ${lastWb.workload_score}/10 last logged — high. Consider offloading documentation today.`
      : null;

    // Documents awaiting approval
    const { rows: pendingDocs } = await pool.query(
      `SELECT COUNT(*) AS count FROM teacher_os_documents
       WHERE teacher_id = $1 AND approved = false`,
      [teacherId]
    );

    const decompressionSuggestion = !lastWb?.workload_score
      ? null
      : lastWb.workload_score > 7
        ? 'End-of-day decompression is critical today — do not skip it.'
        : 'End-of-day decompression available when ready.';

    return {
      studentsNeedingAttention: attentionStudents,
      recentWins,
      workloadAlert,
      pendingDocuments: parseInt(pendingDocs[0]?.count || 0),
      impactMoments: recentWins.length,
      decompressionSuggestion,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    logWellbeing,
    getWellbeingTrend,
    celebrateImpact,
    getNewTeacherGuidance,
    getDailyBriefing,
  };
}
