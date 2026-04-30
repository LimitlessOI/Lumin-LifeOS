// services/lifeos-ambient-intelligence.js
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { makeLifeOSCalendarEventsResolver } from '../services/lifeos-calendar-events-resolver.js';
import { makeLifeOSHabitCompletionsResolver } from '../services/lifeos-habit-completions-resolver.js';
import { makeLifeOSMitsResolver } from '../services/lifeos-mits-resolver.js';
import { ccm } from '../services/lifeos-council-member.js';

const resolveUserId = makeLifeOSUserResolver();
const resolveCalendarEvents = makeLifeOSCalendarEventsResolver();
const resolveHabitCompletions = makeLifeOSHabitCompletionsResolver();
const resolveMits = makeLifeOSMitsResolver();

async function createAmbientIntelligenceService(pool, ccm) {
  return {
    async getContextualNudge(userId) {
      const userIdNum = await resolveUserId(userId);
      if (!userIdNum) return { speak: null };

      const calendarEvents = await resolveCalendarEvents(pool, userIdNum, new Date(Date.now() + 3 * 60 * 60 * 1000));
      const overdueMits = await resolveMits(pool, userIdNum, { completed: false, due_date: { $lt: new Date() } });
      const habitCompletions = await resolveHabitCompletions(pool, userIdNum, { created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

      const sources = [];
      let urgency = 'low';
      let speak = null;

      if (calendarEvents.length > 0) {
        const nearestEvent = calendarEvents[0];
        const timeToEvent = nearestEvent.starts_at.getTime() - Date.now();
        if (timeToEvent < 15 * 60 * 1000) urgency = 'urgent';
        else if (timeToEvent < 30 * 60 * 1000) urgency = 'high';
        else if (timeToEvent < 90 * 60 * 1000) urgency = 'medium';

        sources.push(`Upcoming event: ${nearestEvent.name}`);
      }

      if (overdueMits.length > 0) {
        sources.push('Overdue tasks');
      }

      if (habitCompletions.length === 0 || habitCompletions[0].streak === 0) {
        sources.push('Low habit streak');
      }

      if (sources.length > 0) {
        const prompt = `Hey, just a heads up: ${sources.join(', ')}.`;
        speak = await ccm('gemini_flash', prompt);
      }

      return { speak, type: 'nudge', urgency, sources };
    },
  };
}

export default createAmbientIntelligenceService;