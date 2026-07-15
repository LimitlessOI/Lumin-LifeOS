/**
 * SYNOPSIS: Existing code and exports
 */
// Existing code and exports
// Assuming we have some utility functions and imports here

// Function to calculate sleep debt
export function calculateSleepDebt(sleepData) {
  // Calculate the total sleep debt based on the user's sleep data
  // sleepData: array of sleep durations in hours
  const idealSleepHours = 8; // Ideal sleep duration per night in hours
  let sleepDebt = 0;

  sleepData.forEach(nightSleep => {
    const debt = idealSleepHours - nightSleep;
    if (debt > 0) {
      sleepDebt += debt;
    }
  });

  return sleepDebt; // Return the total sleep debt
}

// Function to classify chronotype based on Apple Watch timing data
export function classifyChronotype(timingData) {
  // timingData: array of sleep and wake times
  // Example: [{ sleep: '22:00', wake: '06:00' }, ...]

  const chronotypeCategories = {
    'early': 'Early Bird',
    'intermediate': 'Intermediate',
    'late': 'Night Owl'
  };

  let totalSleepStart = 0;
  let totalSleepEnd = 0;

  timingData.forEach(session => {
    const sleepTime = parseInt(session.sleep.split(':')[0], 10);
    const wakeTime = parseInt(session.wake.split(':')[0], 10);

    totalSleepStart += sleepTime;
    totalSleepEnd += wakeTime;
  });

  const averageSleepStart = totalSleepStart / timingData.length;
  const averageSleepEnd = totalSleepEnd / timingData.length;

  if (averageSleepStart < 22 && averageSleepEnd < 6) {
    return chronotypeCategories['early'];
  } else if (averageSleepStart >= 22 && averageSleepEnd >= 6 && averageSleepEnd <= 8) {
    return chronotypeCategories['late'];
  } else {
    return chronotypeCategories['intermediate'];
  }
}

// Exporting functions
// Ensure not to duplicate exports as per the instructions
