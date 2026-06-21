<!-- SYNOPSIS: BuilderOS Remediation: Amendment 09 Life Coaching - Weekly Progress Email (G8) -->

# BuilderOS Remediation: Amendment 09 Life Coaching - Weekly Progress Email (G8)

This memo addresses the missing specification for "Weekly progress email schema and scheduling" from `docs/projects/AMENDMENT_09_LIFE_COACHING.md`. The goal is to produce a builder-ready enhancement memo for the smallest buildable next slice.

---

## 1. Blocking Ambiguity or Founder Decision List

*   **Email Content Schema:** Define the exact data points required for the weekly progress email. This includes user-specific progress metrics, goal summaries, and any coach-specific input.
    *   *Example questions:* Should it include a summary of completed tasks, upcoming tasks, or a free-form progress note? Is there a specific call to action?
*   **Email Recipient(s):** Confirm if the email is sent only to the user, or also to their assigned life coach.
*   **Scheduling Logic:** Specify the exact day and time for email dispatch (e.g., Sunday 5 PM local time, configurable per user/coach, or a fixed global time).
*   **Opt-in/Opt-out Mechanism:** Determine if users or coaches have the ability to opt-in/out of these emails, and if so, how this preference is stored and managed.
*   **Data Source for Progress:** Identify the specific LifeOS modules or database tables from which weekly progress data will be aggregated.

## 2. Already-Settled Constraints

*   **Platform:** LifeOS, Node/ESM environment.
*   **Code Quality:** Adhere to existing clean, production-quality Node/ESM patterns.
*   **Scope:** Backend/internal service implementation only. No direct modification of LifeOS user features or TSOS customer-facing surfaces.
*   **Existing Services:** Leverage existing email sending infrastructure (e.g., `src/services/emailService.js`) and job scheduling mechanisms (e.g., `src/jobs/`).
*   **Purpose:** Deliver a weekly progress summary related to life coaching.

## 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on establishing the scheduling mechanism and a placeholder email generation flow without actual external email dispatch.

1.  **Define a minimal `WeeklyProgressEmailData` interface/type:** This will include placeholder fields like `userId`, `weekStartDate`, `weekEndDate`, `summaryText`.
2.  **Create a placeholder email template:** A basic EJS (or existing templating engine) template for the weekly progress email, using the minimal data schema.
3.  **Implement a scheduled job:** A `node-cron` or similar job that runs weekly.
4.  **Job Logic (placeholder):**
    *   On execution, the job will iterate through a hardcoded list of `userId`s (or a single placeholder `userId`).
    *   For each `userId`, it will generate mock `WeeklyProgressEmailData`.
    *   It will then call an internal function (e.g., `emailService.renderWeeklyProgressEmail`) to render the template with the mock data.
    *   Crucially, it will *log* the rendered email content instead of sending it.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/types/email.d.ts`: Add `WeeklyProgressEmailData` interface.
*   `src/services/email/templates/weekly-progress.ejs`: New email template file.
*   `src/services/email/emailService.js`: Add `renderWeeklyProgressEmail(data: WeeklyProgressEmailData)` function.
*   `src/jobs/weeklyProgressEmailJob.js`: New file for the scheduled job.
*   `src/config/jobs.js`: Add configuration entry for `weeklyProgressEmailJob`.

## 5. Required Verifier/Runtime Checks

*   **Job Execution Log:**