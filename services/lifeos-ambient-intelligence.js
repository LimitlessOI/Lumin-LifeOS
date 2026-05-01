/**
 * services/lifeos-ambient-intelligence.js — contextual proactive nudge assembly (calendar, MITs, habits)
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { makeLifeOSCalendarEventsResolver } from '../services/lifeos-calendar-events-resolver.js';
import { makeLifeOSHabitCompletionsResolver } from '../services/lifeos-habit-completions-resolver.js';
import { makeLifeOSMitsResolver } from '../services/lifeos-mits-resolver.js';

/**
 * @param {import('pg').Pool} pool
 * @param {(member: string, prompt: string, ...rest: unknown[]) => Promise<unknown>} callCouncilMember
 */
function createAmbientIntelligenceService(pool, callCouncilMember) {
  const resolveUserId = makeLifeOSUserResolver(pool);
  const resolveCalendarEvents = makeLifeOSCalendarEventsResolver();
  const resolveHabitCompletions = makeLifeOSHabitCompletionsResolver();
  const resolveMits = makeLifeOSMitsResolver();

  return {
    async getContextualNudge(userIdHandle) {
      const userIdNum = await resolveUserId(userIdHandle);
      if (!userIdNum) return { speak: null, type: 'nudge', urgency: 'low', sources: [] };

      const horizon = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const calendarEvents = await resolveCalendarEvents(pool, userIdNum, horizon);
      const overdueMits = await resolveMits(pool, userIdNum, {});
      const habitCompletions = await resolveHabitCompletions(pool, userIdNum, {});

      const sources = [];
      let urgency = 'low';
      let speak = null;

      if (calendarEvents.length > 0) {
        const nearestEvent = calendarEvents[0];
        const startsAt =
          nearestEvent.starts_at instanceof Date
            ? nearestEvent.starts_at
            : nearestEvent.starts_at
              ? new Date(nearestEvent.starts_at)
              : new Date();
        const label = nearestEvent.name || nearestEvent.title || 'Event';
        const timeToEvent = startsAt.getTime() - Date.now();
        if (timeToEvent < 15 * 60 * 1000) urgency = 'urgent';
        else if (timeToEvent < 30 * 60 * 1000) urgency = 'high';
        else if (timeToEvent < 90 * 60 * 1000) urgency = 'medium';

        sources.push(`Upcoming event: ${label}`);
      }

      if (overdueMits.length > 0) {
        sources.push('Overdue tasks');
      }

      if (habitCompletions.length === 0 || habitCompletions[0].streak === 0) {
        sources.push('Low habit streak');
      }

      if (sources.length > 0 && typeof callCouncilMember === 'function') {
        const prompt = `Hey, just a heads up: ${sources.join(', ')}.`;
        const raw = await callCouncilMember('gemini_flash', prompt);
        speak =
          typeof raw === 'string'
            ? raw
            : raw && typeof raw === 'object' && raw !== null && 'response' in raw
              ? String(/** @type {{ response?: string }} */ (raw).response ?? '')
              : raw && typeof raw === 'object' && 'text' in raw
                ? String(/** @type {{ text?: string }} */ (raw).text ?? '')
                : raw != null
                  ? String(raw)
                  : '';
      }

      return { speak, type: 'nudge', urgency, sources };
    },
  };
}

export { createAmbientIntelligenceService };
export default createAmbientIntelligenceService;
