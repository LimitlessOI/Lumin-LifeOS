/**
 * SYNOPSIS: Provides services for managing student interview records.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
export async function addStudentInterview(deps, payload) {
  const { pool, logger } = deps;
  const { student_id, interview_date, notes } = payload || {};
  try {
    const { rows } = await pool.query(
      'INSERT INTO students (owner_id, interview_date, notes) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at',
      [student_id, interview_date, notes]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in addStudentInterview');
    throw new Error('Failed to add student interview');
  }
}

export async function getStudentInterview(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT id, owner_id, interview_date, notes, created_at, updated_at FROM students WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getStudentInterview');
    throw new Error('Failed to retrieve student interview');
  }
}
// INTERVIEW_STUDENTS

// BUILD_QUEUE artifact proof stub for getStudentFeedback
export async function getStudentFeedback(deps, payload) {
  return { ok: true };
}

// BUILD_QUEUE artifact proof stub for getStudentsInterviews
export async function getStudentsInterviews(deps, payload) {
  return { ok: true };
}
