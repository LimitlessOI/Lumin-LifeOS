/**
 * SYNOPSIS: services/lifeos-sleep-debt.js
 */
// services/lifeos-sleep-debt.js

export function calculateSleepDebt(sleepData) {
  // Mock implementation for sleep debt calculation
  // In a real scenario, this would involve more complex logic
  // comparing actual sleep to ideal sleep, considering a rolling window.
  if (!sleepData || sleepData.length === 0) {
    return 0;
  }

  const idealSleepHours = 8; // Example ideal sleep
  let totalDebt = 0;

  for (const day of sleepData) {
    const actualSleepHours = day.duration / (1000 * 60 * 60); // Convert ms to hours
    totalDebt += (idealSleepHours - actualSleepHours);
  }

  return totalDebt;
}

export function classifyChronotype(sleepTimingData) {
  // Mock implementation for chronotype classification
  // In a real scenario, this would analyze bedtimes, wake times,
  // and midpoint of sleep over a period to determine chronotype
  // (e.g., "early bird", "night owl", "intermediate").
  if (!sleepTimingData || sleepTimingData.length === 0) {
    return "intermediate";
  }

  let totalSleepMidpointHour = 0;
  for (const day of sleepTimingData) {
    const bedtime = new Date(day.bedtime);
    const waketime = new Date(day.waketime);
    const sleepDurationMs = waketime.getTime() - bedtime.getTime();
    const midpointMs = bedtime.getTime() + (sleepDurationMs / 2);
    const midpointDate = new Date(midpointMs);
    totalSleepMidpointHour += midpointDate.getHours() + (midpointDate.getMinutes() / 60);
  }

  const averageMidpointHour = totalSleepMidpointHour / sleepTimingData.length;

  // Example classification based on average sleep midpoint
  if (averageMidpointHour < 3) { // e.g., midnight to 3 AM midpoint
    return "early bird";
  } else if (averageMidpointHour > 5) { // e.g., 5 AM to 8 AM midpoint
    return "night owl";
  } else {
    return "intermediate";
  }
}