/**
 * SYNOPSIS: Service module — StruggleDetection.
 */
let dwellTimes = new Map();
let clickRepeats = new Map();
let editCycles = new Map();

const DWELL_THRESHOLD = 5000; // milliseconds
const CLICK_REPEAT_THRESHOLD = 3;
const EDIT_CYCLE_THRESHOLD = 5;

function updateDwellTime(userId, timeSpent) {
  if (!dwellTimes.has(userId)) {
    dwellTimes.set(userId, 0);
  }
  dwellTimes.set(userId, dwellTimes.get(userId) + timeSpent);
}

function updateClickRepeats(userId) {
  if (!clickRepeats.has(userId)) {
    clickRepeats.set(userId, 0);
  }
  clickRepeats.set(userId, clickRepeats.get(userId) + 1);
}

function updateEditCycles(userId) {
  if (!editCycles.has(userId)) {
    editCycles.set(userId, 0);
  }
  editCycles.set(userId, editCycles.get(userId) + 1);
}

function detectStruggles(userId) {
  const isDwellStruggle = dwellTimes.get(userId) > DWELL_THRESHOLD;
  const isClickRepeatStruggle = clickRepeats.get(userId) > CLICK_REPEAT_THRESHOLD;
  const isEditCycleStruggle = editCycles.get(userId) > EDIT_CYCLE_THRESHOLD;

  return isDwellStruggle || isClickRepeatStruggle || isEditCycleStruggle;
}

export { detectStruggles, updateDwellTime, updateClickRepeats, updateEditCycles };
