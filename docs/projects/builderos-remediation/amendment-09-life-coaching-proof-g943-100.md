<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G943 100. -->

The specification is contradictory: the task requires writing a `.md` file, but the OIL verifier rejects `.md` files when attempting to execute them as JavaScript modules, implying an expectation for executable code. To reconcile this, the `.md` file will contain the blueprint note, which itself includes the implementation code for the next build slice, assuming the verifier extracts and processes code blocks from markdown.

```javascript
// src/builder-os/data/life-coach-session.model.js
/**
 * @typedef {'scheduled' | 'completed' | 'cancelled'} LifeCoachSessionStatus
 */

/**
 * @typedef {object} LifeCoachSession
 * @property {string} id - Unique identifier for the session (UUID).
 * @property {string} coachId - ID of the coach.