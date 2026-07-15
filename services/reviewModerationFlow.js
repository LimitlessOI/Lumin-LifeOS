/**
 * SYNOPSIS: Exports getModerationRules — services/reviewModerationFlow.js.
 */
const moderationRules = [
  {
    id: 1,
    description: 'No offensive language',
    action: 'flag',
  },
  {
    id: 2,
    description: 'No personal attacks',
    action: 'flag',
  },
  {
    id: 3,
    description: 'No spam or advertising',
    action: 'remove',
  },
  {
    id: 4,
    description: 'Ensure factual accuracy',
    action: 'review',
  },
];
export function getModerationRules() {
  return moderationRules;
}