/**
 * SYNOPSIS: Morning briefing assembler — queries calendar, MITs, and habits for today's context.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Morning briefing assembler — queries calendar, MITs, and habits for today's context.
 */

export function createDailyBriefingService(pool, callCouncilMember) {
  function dedupeCalendarEvents(events) {
    const seen = new Set();
    return events.filter((event) => {
      const key = [
        event?.title || '',
        event?.starts_at || '',
        event?.ends_at || '',
        event?.location || '',
      ].join('::');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function queryRowsOrEmpty(sql, params) {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (err) {
      // Briefing should degrade instead of 500ing when an optional module table is absent.
      if (err?.code === '42P01') return [];
      throw err;
    }
  }

  async function assembleBriefing(userId) {
    const today = new Date().toISOString().slice(0, 10);

    const [calendarEventsRaw, mits, habitStreaks] = await Promise.all([
      queryRowsOrEmpty(
        `SELECT title, starts_at, ends_at, location FROM lifeos_calendar_events
         WHERE user_id = $1 AND date(starts_at AT TIME ZONE 'UTC') = $2 ORDER BY starts_at`,
        [userId, today]
      ),
      queryRowsOrEmpty(
        `SELECT title, status, notes, position FROM daily_mits
         WHERE user_id = $1 AND mit_date = $2
         ORDER BY position ASC`,
        [userId, today]
      ),
      queryRowsOrEmpty(
        `SELECT h.id, h.name,
           COUNT(c.id) FILTER (WHERE c.completed_date >= CURRENT_DATE - 6) AS recent_completions
         FROM lifeos_habits h
         LEFT JOIN lifeos_habit_completions c ON c.habit_id = h.id AND c.user_id = h.user_id
         WHERE h.user_id = $1 GROUP BY h.id, h.name ORDER BY h.name`,
        [userId]
      ),
    ]);

    const calendarEvents = dedupeCalendarEvents(calendarEventsRaw);

    return {
      date: new Date().toISOString(),
      calendarEvents,
      mits,
      habitStreaks,
      summary: `${calendarEvents.length} events, ${mits.filter((m) => m.status !== 'done').length} pending MITs, ${habitStreaks.length} tracked habits`,
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
