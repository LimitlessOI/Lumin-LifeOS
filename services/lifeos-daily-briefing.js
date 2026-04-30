// services/lifeos-daily-briefing.js
import { Pool } from 'pg';
import { callCouncilMember } from './lifeos-ccm.js';

export default function createDailyBriefingService(pool, *ccm) {
  return {
    async assembleBriefing(userId) {
      const query = {
        text: `
          SELECT 
            starts_at, 
            title 
          FROM 
            lifeos_calendar_events 
          WHERE 
            date(starts_at) = CURRENT_DATE;
        `,
        rowMode: 'array',
      };

      const calendarEvents = await pool.query(query);

      query.text = `
        SELECT 
          text, 
          completed 
        FROM 
          lifeos_mits 
        WHERE 
          date = CURRENT_DATE;
      `;

      const mits = await pool.query(query);

      query.text = `
        SELECT 
          name, 
          id 
        FROM 
          lifeos_habits 
        WHERE 
          id IN (
            SELECT 
              habit_id 
            FROM 
              lifeos_habit_streaks 
            WHERE 
              streak_date = CURRENT_DATE
          );
      `;

      const habitStreaks = await pool.query(query);

      const summary = `Today's calendar events: ${calendarEvents.length}, MITs: ${mits.length}, Habit streaks: ${habitStreaks.length}`;

      return {
        date: new Date().toISOString(),
        calendarEvents,
        mits,
        habitStreaks,
        summary,
      };
    },

    async generateSpokenBriefing(userId) {
      const briefing = await this.assembleBriefing(userId);
      const prompt = `Write a 3-sentence morning briefing for ${userId} based on the following data: ${JSON.stringify(briefing)}`;
      const { text, data } = await callCouncilMember('gemini_flash', prompt);
      return { text, data: briefing };
    },
  };
}