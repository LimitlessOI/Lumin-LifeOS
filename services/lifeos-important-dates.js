/**
 * SYNOPSIS: Exports addDate — services/lifeos-important-dates.js.
 */
export async function addDate(db, userId, payload) {
  const { person_name, date, type, notes } = payload ?? {};
  const result = await db.query(
    `INSERT INTO important_dates (user_id, person_name, date, type, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, person_name ?? null, date, type ?? null, notes ?? null]
  );
  return result.rows[0];
}

export async function listDates(db, userId) {
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
  const result = await db.query(
    `SELECT *
     FROM important_dates
     WHERE (
       (
         EXTRACT(MONTH FROM date) - EXTRACT(MONTH FROM CURRENT_DATE)
       ) * 12
       + (
         EXTRACT(DAY FROM date) - EXTRACT(DAY FROM CURRENT_DATE)
       )
     ) IN (0, 7)
     ORDER BY user_id ASC, date ASC, created_at ASC`
  );

  const rows = result.rows ?? [];
  for (const row of rows) {
    await notifyFn(row.user_id, row);
  }
  return rows;
}