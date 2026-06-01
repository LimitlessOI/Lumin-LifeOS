// docs/projects/builderos-remediation/amendment-09-life-coaching-todo-3-g8.md
---
title: BuilderOS Remediation - Amendment 09 Life Coaching Todo 3
---

# BuilderOS Remediation - Amendment 09 Life Coaching Todo 3

## Blocking Ambiguity or Founder Decision List

* Extract AI coaching logic into a separate service module (`services/coaching-service.js`)

## Already-Settled Constraints

* Do not modify LifeOS user features or TSOS customer-facing surfaces
* Implement exactly what the instruction asks for inside approved builder safe scope

## Smallest Buildable Next Slice

* Create `services/coaching-service.js` with extracted AI coaching logic
* Update route handlers to use the new service module

## Exact Safe-Scope Files BuilderOS Should Touch First

* `services/coaching-service.js`
* `routes/coaching.js` (update route handlers to use the new service module)

## Required Verifier/Runtime Checks

* Verify that `services/coaching-service.js` is correctly implemented and exported
* Verify that route handlers are updated to use the new service module

## Stop Conditions

* Complete implementation of `services/coaching-service.js` and updated route handlers
* Verify that the new service module is correctly used in route handlers

---
---METADATA---
{
  "target_file": "docs/projects/builderos-remediation/amendment-09-life-coaching-todo-3-g8.md",
  "insert_after_line": null,
  "confidence": 0.8
}
```

```javascript
// services/coaching-service.js
const coachingLogic = {
  // extracted AI coaching logic
};

module.exports = coachingLogic;
```

```javascript
// routes/coaching.js
const coachingService = require('../services/coaching-service');

// update route handlers to use the new service module
app.get('/coaching', (req, res) => {
  const coachingResponse = coachingService.getCoachingResponse(req);
  res.json(coachingResponse);
});
```

```javascript
// docs/projects/builderos-remediation/amendment-09-life-coaching-todo-3-g8.md
---
title: BuilderOS Remediation - Amendment 09 Life Coaching Todo 3
---

# BuilderOS Remediation - Amendment 09 Life Coaching Todo 3

## Implementation

The implementation consists of two main parts:

1. Extracting AI coaching logic into a separate service module (`services/coaching-service.js`)
2. Updating route handlers to use the new service module

### services/coaching-service.js

```javascript
const coachingLogic = {
  // extracted AI coaching logic
};

module.exports = coachingLogic;
```

### routes/coaching.js

```javascript
const coachingService = require('../services/coaching-service');

// update route handlers to use the new service module
app.get('/coaching', (req, res) => {
  const coachingResponse = coachingService.getCoachingResponse(req);
  res.json(coachingResponse);
});
```

---