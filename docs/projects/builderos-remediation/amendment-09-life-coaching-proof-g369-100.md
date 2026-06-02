# Amendment 09: Life Coaching - Proof G369-100

This document outlines the next smallest build slice for proving out the core functionality of Amendment 09, focusing on the foundational data model and persistence for a Coaching Session.

## 1. Exact Missing Implementation or Proof Gap

The core data model for a `CoachingSession` and its basic persistence mechanism are not yet defined or implemented. This gap prevents the creation, storage, and retrieval of coaching session records, which are fundamental to any life coaching feature.

## 2. Smallest Safe Build Slice to Close It

Define the `CoachingSession` data structure and implement a basic `CoachingSessionRepository` with a `create` method. This establishes the foundational data layer for coaching sessions without introducing complex business logic or API endpoints.

## 3. Exact Safe-Scope Files to Touch First

*   `src/types/coaching.d.ts`: Define