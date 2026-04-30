/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Morning briefing assembler — queries calendar, MITs, and habits for today's context.
 */

export function createDailyBriefingService(pool, callCouncilMember) {
  async function assembleBriefing(userId) {
    const today = new Date().toISOString().slice(0, 10);

    const [eventsRes, mitsRes, habitsRes] = await Promise.all([
      pool.query(
        `SELECT title, starts_at, ends_at, location FROM lifeos_calendar_events
         WHERE user_id = $1 AND date(starts_at AT TIME ZONE 'UTC') = $2 ORDER BY starts_at`,
        [userId, today]
      ),
      pool.query(
        `SELECT text, completed FROM lifeos_mits
         WHERE user_id = $1 AND date(created_at AT TIME ZONE 'UTC') = $2`,
        [userId, today]
      ),
      pool.query(
        `SELECT h.id, h.name,
           COUNT(c.id) FILTER (WHERE c.completed_date >= CURRENT_DATE - 6) AS recent_completions
         FROM lifeos_habits h
         LEFT JOIN lifeos_habit_completions c ON c.habit_id = h.id AND c.user_id = h.user_id
         WHERE h.user_id = $1 GROUP BY h.id, h.name ORDER BY h.name`,
        [userId]
      ),
    ]);

    return {
      date: new Date().toISOString(),
      calendarEvents: eventsRes.rows,
      mits: mitsRes.rows,
      habitStreaks: habitsRes.rows,
      summary: `${eventsRes.rows.length} events, ${mitsRes.rows.filter(m => !m.completed).length} pending MITs, ${habitsRes.rows.length} tracked habits`,
    };
  }

  async function generateSpokenBriefing(userId) {
    const data = await assembleBriefing(userId);
    if (!callCouncilMember) return { text: data.summary, data };

    const prompt = `You are a personal assistant. Write a concise 2-3 sentence spoken morning briefing for Adam based on this data: ${JSON.stringify(data)}. Be warm, specific, and actionable. No markdown.`;
    const text = await callCouncilMember('gemini_flash', prompt, { taskType: 'general', maxOutputTokens: 200 });
    return { text: typeof text === 'string' ? text : text?.content || data.summary, data };
  }

  return { assembleBriefing, generateSpokenBriefing };
}
