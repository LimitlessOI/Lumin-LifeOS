<!-- SYNOPSIS: Amendment 09 Life Coaching - Proof G5.1.1 (Admin UI Coach Profile Creation) -->

# Amendment 09 Life Coaching - Proof G5.1.1 (Admin UI Coach Profile Creation)

This document outlines the next smallest build slice for the Life Coaching feature, specifically addressing the initial implementation of the Admin UI for creating coach profiles, as derived from blueprint G5.1.1.

---

## Blueprint Note: G5.1.1 - Admin UI Coach Profile Creation

### 1. Exact missing implementation or proof gap

The primary gap is the foundational implementation of the Admin UI component and its corresponding API integration for enabling the creation of new coach profiles. This encompasses:
*   Definition of the Admin UI route, e.g., `/admin/coaches/new`.
*   A basic frontend component (e.g., React, Vue, Svelte) to render the coach profile creation form.
*   Essential form fields such as `name`, `email`, `bio`, and `status`.
*   Client-side validation for these fields.
*   A dedicated API endpoint (`POST /api/admin/coaches`) to handle the submission of new coach data.
*   Server-side validation and initial persistence logic for the coach data.

### 2. Smallest safe build slice to close it

Implement the skeletal Admin UI route and a placeholder component for coach profile creation. Concurrently, establish a corresponding stub API endpoint. This slice prioritizes setting up the necessary architectural plumbing to demonstrate connectivity and basic rendering, deferring full feature richness to subsequent iterations.

### 3. Exact safe-scope files to touch first

Based on established Node/ESM patterns for an Admin UI and API service:

*   **Frontend (Admin UI):**
    *   `apps/admin-ui/src/routes/coaches.js`: Define the new route `/admin/coaches/new` and link it to the creation component.
    *   `apps/admin-ui/src/components/CoachProfileForm.jsx`: Create a minimal React (or equivalent) component with placeholder form elements and a submit button.

*   **Backend (API Service):**
    *   `services/api/src/routes/admin/coaches.js`: Add a `POST /api