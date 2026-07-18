/**
 * SYNOPSIS: services/struggleDetection.js
 */
// services/struggleDetection.js

// Existing code and exports
export function detectStruggle(userActions) {
  // Some logic to detect struggle
}

export const struggleThreshold = 5;

// New implementation for dwell timer
export function dwellTimer(element, callback) {
  let timer;
  
  element.addEventListener('mouseenter', () => {
    timer = setTimeout(() => {
      callback();
    }, 2000); // 2 seconds as an example dwell time 
  });

  element.addEventListener('mouseleave', () => {
    clearTimeout(timer);
  });
}

// Function to detect repeated clicks within a short period
export function detectClickRepeat(clickEvents, timeInterval = 1000) {
  let clickCount = 0;
  let lastClickTime = 0;

  clickEvents.forEach(event => {
    const currentTime = event.timeStamp;
    if (currentTime - lastClickTime < timeInterval) {
      clickCount++;
    } else {
      clickCount = 1;
    }
    lastClickTime = currentTime;
  });

  return clickCount;
}

// Function to track the number of times a user edits an input before submitting
export function editCycleCounter(editEvents) {
  return editEvents.length;
}