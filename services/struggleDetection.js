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

