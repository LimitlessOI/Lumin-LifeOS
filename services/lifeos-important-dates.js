/**
 * SYNOPSIS: Exports addDate — services/lifeos-important-dates.js.
 */
export async function addDate(db, userId, payload) {
  const { person_name, date, type, notes } = payload || {};
  if (!userId) throw new Error('userId is required');
  if (!person_name || !date || !type) throw new Error('person_name, date, and type are required');

  const result = await db.query(
    `INSERT INTO important_dates (user_id, person_name, date, type, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, person_name, date, type, notes ?? null]
  );

  return result.rows[0] || null;
}

export async function listDates(db, userId) {
  if (!userId) throw new Error('userId is required');

  const result = await db.query(
    `SELECT *
     FROM important_dates
     WHERE user_id = $1
     ORDER BY date ASC, created_at ASC`,
    [userId]
  );

  return result.rows;
}

export async function scanUpcomingDates(db, notifyFn) {
  if (typeof notifyFn !== 'function') throw new Error('notifyFn must be a function');

  const result = await db.query(
    `SELECT *
     FROM important_dates
     WHERE (
       CASE
         WHEN extract(month FROM date) = extract(month FROM CURRENT_DATE)
          AND extract(day FROM date) = extract(day FROM CURRENT_DATE)
         THEN 0
         WHEN extract(month FROM date_part('year', CURRENT_DATE)::int::text || '-' || to_char(date, 'MM-DD')::date) IS NOT NULL THEN 0
         ELSE (
           (
             date_part('year', CURRENT_DATE)::int::text || '-' || to_char(date, 'MM-DD')
           )::date - CURRENT_DATE
         )
       END
     ) IN (0, 7)
     ORDER BY user_id ASC, person_name ASC, id ASC`
  );

  const rows = result.rows || [];
  for (const row of rows) {
    await notifyFn(row.user_id, row);
  }

  return rows;
}