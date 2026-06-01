BuilderOS Remediation: Amendment 09 Life Coaching - Weekly Progress Email

This memo addresses the unspecified weekly progress email schema and scheduling for Amendment 09 Life Coaching. The goal is to define a buildable next slice to resolve these ambiguities.

---

1.  **Blocking Ambiguity or Founder Decision List**
    *   **Email Recipient:** Is the weekly progress email intended for the LifeOS user, their assigned coach, or both? If both, are the contents identical or tailored?
    *   **Email Content Details:** What specific data points should be included in the "progress summary"? (e.g., completed goals, pending tasks, upcoming coaching sessions, streak data, custom notes). Should it be configurable by the user/coach?
    *   **Scheduling Specificity:** "Weekly" is set, but what exact day of the week and time of day should the email be sent? Is this configurable per user/coach?
    *   **Opt-in/Opt-out:** Is this email mandatory for users with a coach, or is there an explicit opt-in/opt-out mechanism?

2.  **Already-Settled Constraints**
    *   **Frequency:** Weekly.
    *   **Scope:** BuilderOS-only execution; no direct modification of existing LifeOS user features or TSOS customer-facing surfaces.
    *   **Mechanism:** Email-based notification.
    *   **Purpose:** Summarize progress related to Life Coaching.

3.  **Smallest Buildable Next Slice**
    *   **Target:** Implement a basic weekly progress email sent *only to the LifeOS user*.
    *   **Content:** A minimal summary including:
        *   Subject: "Your Weekly LifeOS Progress Update"
        *   Body: A simple text-based summary of the number of completed tasks/goals in the past week, and a link back to the LifeOS dashboard. No complex data aggregation initially.
    *   **Scheduling:** A fixed weekly schedule (e.g., Monday 9 AM UTC) for all users, without individual configuration.
    *   **Data Source:** Leverage existing task/goal completion records from the past 7 days.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `services/email/templates/weeklyProgressEmail.hbs`: New Handlebars template for the email body.
    *   `services/email/senders/weeklyProgressEmailSender.js`: New module to encapsulate email sending logic for this specific email type.
    *   `jobs/weeklyProgressEmailJob.js`: New cron job definition to trigger the email generation and sending.
    *   `config/jobs.js`: Add configuration entry for `weeklyProgressEmailJob`.
    *   `schemas/email/weeklyProgressEmailDataSchema.js`: New Joi/Zod schema for the data payload passed to the email template.

5.  **Required Verifier/Runtime Checks**
    *   **Schema Validation:** Ensure the data payload for the email template conforms to `weeklyProgressEmailDataSchema`.
    *   **Email Delivery:** Verify that a test email is successfully sent to a designated test user's inbox.
    *   **Job Execution:** Confirm the `weeklyProgressEmailJob` executes at the scheduled time.
    *   **Content Integrity:** Basic check that the email subject and body contain expected placeholder text (e.g., "Weekly Progress Update", "completed X tasks").
    *   **Error Handling:** Verify that email sending failures are logged appropriately.

6.  **Stop Conditions**
    *   A new Handlebars email template (`weeklyProgressEmail.hbs`) exists and can render with sample data.
    *   A dedicated email sender service (`weeklyProgressEmailSender.js`) is implemented, capable of sending the templated email.
    *   A cron job (`weeklyProgressEmailJob.js`) is defined and configured to run weekly, triggering the sender service.
    *   The job successfully sends a basic progress email to the LifeOS user (containing a count of completed tasks/goals and a dashboard link) in a test environment.
    *   No new user-facing UI elements or configuration options are introduced.