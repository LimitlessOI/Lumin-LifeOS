/**
 * SYNOPSIS: Exports createCourseService — services/course-service.js.
 */
export function createCourseService({ pool }) {
  async function createCourse({ title, description = null, ownerId = null } = {}) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
      const err = new Error('title_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO courses (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [cleanTitle, description == null ? null : String(description)],
    );

    return rows[0];
  }

  async function getCourse(courseId) {
    const { rows } = await pool.query(
      `SELECT * FROM courses WHERE id = $1 LIMIT 1`,
      [courseId],
    );

    if (!rows[0]) {
      const err = new Error('course_not_found');
      err.status = 404;
      throw err;
    }

    return rows[0];
  }

  async function listCourses({ limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM courses
       ORDER BY created_at DESC
       LIMIT $1`,
      [lim],
    );
    return rows;
  }

  return {
    createCourse,
    getCourse,
    listCourses,
  };
}