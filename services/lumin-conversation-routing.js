/*
- SYNOPSIS: Conversation vs display routing — personal talk never hits queue display theater.
- @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { stripChairDoPrefix } from './lumin-chair-system-actions.js';
import { isBuildRequest } from './chair-intent-signals.js';
import { isRepairContinuationIntent } from './builder-instruction-target.js';

// CONVERSATION_MARKERS: Expanded to include more general knowledge question phrasing.
const CONVERSATION_MARKERS = /\b(should i|could i|would i|help me|how do i|what do you think|talk to me|worried|feel like|am i connected|quick check|tell me|can you tell me|any advice)\b/i;
const CONTINUE_TO_PASS_MARKERS = /\b(keep going|continue|advance|do the next