// docs/projects/builderos-remediation/amendment-09-life-coaching-todo-3-g8.md
---
title: BuilderOS Remediation Amendment 09 Life Coaching Todo 3
---

# Blocking Ambiguity or Founder Decision List

* Extract AI coaching logic into a separate service

# Already-Settled Constraints

* Implement BuilderOS-only governed loop execution
* Do not modify LifeOS user features or TSOS customer-facing surfaces

# Smallest Buildable Next Slice

* Create `services/coaching-service.js` with inline AI coaching logic
* Update route handlers to use `coaching-service.js`

# Exact Safe-Scope Files BuilderOS Should Touch First

* `services/coaching-service.js`
* `routes/coaching.js` (update route handlers)

# Required Verifier/Runtime Checks

* Verify `coaching-service.js` exports a valid coaching service
* Verify route handlers use the `coaching-service.js` instance

# Stop Conditions

* Complete implementation of `coaching-service.js` and route handlers
* Verify BuilderOS-only governed loop execution

---