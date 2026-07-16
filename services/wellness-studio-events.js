/**
 * SYNOPSIS: services/wellness-studio-events.js
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
// services/wellness-studio-events.js

// Function to create a new wellness event
async function createEvent({ eventType, topic, scheduledAt, privacy }) {
  try {
    const result = await db.insert({
      table: 'wellness_events',
      data: { event_type: eventType, topic, scheduled_at: scheduledAt, privacy }
    });
    return result;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// Function to recommend events for a user based on personality type and life stage
async function recommendEventsForUser(userId) {
  try {
    const user = await db.selectOne({
      table: 'users',
      where: { id: userId }
    });

    const events = await db.select({
      table: 'wellness_events',
      where: {
        event_type: user.personality_type,
      }
    });

    return events;
  } catch (error) {
    console.error("Error recommending events:", error);
    throw error;
  }
}

// Function for a user to RSVP to an event
async function rsvpToEvent(userId, eventId) {
  try {
    const result = await db.insert({
      table: 'event_rsvps',
      data: { user_id: userId, event_id: eventId }
    });
    return result;
  } catch (error) {
    console.error("Error RSVPing to event:", error);
    throw error;
  }
}

// Export the async functions
export { createEvent, recommendEventsForUser, rsvpToEvent };
