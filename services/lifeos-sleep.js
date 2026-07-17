/**
 * SYNOPSIS: Step 1: Capture Sleep Data
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
// Step 1: Capture Sleep Data
export async function captureSleepData(db, userId, sourceData) {
  const payload = {
    bedtime: sourceData.bedtime, // ISO 8601 string
    wakeTime: sourceData.wakeTime, // ISO 8601 string
    sleepQuality: sourceData.sleepQuality, // 1-10 scale
    hrv: sourceData.hrv, // Heart Rate Variability
    source: sourceData.source || 'device'
  };

  return await logSleep(db, userId, payload);
}

// Step 2: Calculate Sleep Score
export function calculateSleepScore(sleepData) {
  const { bedtime, wakeTime, sleepQuality, hrv } = sleepData;
  let score = 0;

  // Calculate sleep duration in hours
  const bedTimeMs = new Date(bedtime).getTime();
  const wakeTimeMs = new Date(wakeTime).getTime();
  const sleepDurationHours = (wakeTimeMs - bedTimeMs) / (1000 * 60 * 60);

  // Quality contribution (weighted more heavily)
  if (sleepQuality >= 8) {
    score += 4;
  } else if (sleepQuality >= 6) {
    score += 2;
  } else if (sleepQuality >= 4) {
    score += 1;
  }

  // Duration contribution
  if (sleepDurationHours >= 7.5) {
    score += 3;
  } else if (sleepDurationHours >= 6) {
    score += 2;
  } else if (sleepDurationHours >= 5) {
    score += 1;
  }

  // HRV contribution (assuming higher is generally better for recovery)
  if (hrv) {
    if (hrv >= 50) { // Example threshold, adjust based on typical ranges
      score += 2;
    } else if (hrv >= 30) {
      score += 1;
    }
  }

  return score;
}

// Step 3: Integrate with Daily Scorecard
export async function updateDailyScorecard(db, userId, date) {
  // Fetch sleep data for the specific date
  const sleepDataForDate = await getSleepDataForDate(db, userId, date); // Assuming a function to get sleep data for a given date
  if (!sleepDataForDate) return;

  const sleepScore = calculateSleepScore(sleepDataForDate);

  // Logic to update the daily scorecard with the calculated sleep score
  // This would involve updating a database table (e.g., 'daily_scorecard')
  // or calling another service, ensuring idempotency for updates.
  // Example: await db.collection('daily_scorecard').updateOne(
  //   { userId, date: date.toISOString().split('T')[0] },
  //   { $set: { sleepScore } },
  //   { upsert: true }
  // );
  console.log(`Updating daily scorecard for user ${userId} on ${date.toISOString().split('T')[0]} with sleep score: ${sleepScore}`);
  return sleepScore; // Return the score for confirmation/further use
}

// Example usage in a function
/**
 * Example usage for integrating sleep tracking.
 * @param {object} db - Database connection object.
 * @param {string} userId - The ID of the user.
 * @param {object} sourceData - Object containing sleep data (bedtime, wakeTime, sleepQuality, hrv).
 */
export async function integrateSleepTracking(db, userId, sourceData) {
  const sleepResult = await captureSleepData(db, userId, sourceData);
  const sleepDate = new Date(sourceData.wakeTime || sourceData.bedtime); // Use wakeTime or bedtime to determine the sleep session date
  await updateDailyScorecard(db, userId, sleepDate);
  return sleepResult;
}

// No specific changes needed for extendSleepModule, as integrateSleepTracking already fulfills the core requirement.
// Keeping it for explicit export if needed elsewhere, but its functionality is covered.
export { integrateSleepTracking as extendSleepModule };


// Placeholder for a function to log sleep data to the database
export async function logSleep(db, userId, payload) {
  console.log(`Logging sleep data for user ${userId}:`, payload);
  // Example: await db.collection('sleep_logs').insertOne({ userId, ...payload, loggedAt: new Date() });
  return { success: true, message: 'Sleep data logged' };
}

// Placeholder for a function to get sleep data for a specific date
export async function getSleepDataForDate(db, userId, date) {
  console.log(`Fetching sleep data for user ${userId} on ${date.toISOString().split('T')[0]}`);
  // Example: return await db.collection('sleep_logs').findOne({ userId, loggedAt: { $gte: startOfDay(date), $lt: endOfDay(date) } });
  // For demonstration, returning a mock object until actual DB integration
  return {
    bedtime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22, 0).toISOString(), // 10 PM
    wakeTime: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 0).toISOString(), // 6 AM next day
    sleepQuality: 7,
    hrv: 45,
    source: 'device'
  };
}
