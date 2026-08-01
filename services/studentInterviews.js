/**
 * SYNOPSIS: Records interviews with prospective students.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function recordStudentInterview(deps, payload) {
  const { pool, logger } = deps;
  const { studentId, interviewNotes } = payload || {};

  try {
    // Check if the students table exists and has the necessary columns.
    // The schema includes 'students' table with 'interview_date' and 'notes' columns.
    const { rows } = await pool.query(
      `INSERT INTO students (id, interview_date, notes)
       VALUES (gen_random_uuid(), NOW(), $1)
       ON CONFLICT (id) DO UPDATE SET
         interview_date = NOW(),
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id, interview_date, notes`,
      [interviewNotes]
    );

    // If studentId is provided, we assume it's an existing student and update their record.
    // Otherwise, we create a new student entry.
    // The current schema does not have a clear way to link a new interview to an existing* student
    // without an explicit studentId in the payload.
    // Given the prompt, if studentId is provided, we should probably update an existing student.
    // If not, we create a new student record for the interview.
    // The `ON CONFLICT (id) DO UPDATE` assumes we might be updating an existing student based on `id`
    // but the `INSERT` uses `gen_random_uuid()` for `id`.
    // This implies that if `studentId` is provided in the payload, we should update* the existing student.
    // If `studentId` is not* provided, we should insert a new* student record for the interview.
    // The current INSERT/ON CONFLICT structure is designed for a new student with a generated ID.
    // Let's adjust to handle both cases: update if studentId is present, insert if not.

    if (studentId) {
      const updateResult = await pool.query(
        `UPDATE students
         SET interview_date = NOW(),
             notes = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, interview_date, notes`,
        [interviewNotes, studentId]
      );
      return updateResult.rows[0] || null;
    } else {
      const insertResult = await pool.query(
        `INSERT INTO students (interview_date, notes)
         VALUES (NOW(), $1)
         RETURNING id, interview_date, notes`,
        [interviewNotes]
      );
      return insertResult.rows[0] || null;
    }
  } catch (error) {
    logger.error({ error }, 'Error recording student interview');
    throw new Error('Failed to record student interview');
  }
}