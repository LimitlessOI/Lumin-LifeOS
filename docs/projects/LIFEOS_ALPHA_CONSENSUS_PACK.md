### (1) NEEDS ASSESSMENT

Adam needs the following core components to effectively use the LifeOS prototype today:

*   **Shell**: A stable, responsive application shell (`lifeos-app.html`) providing consistent navigation, user settings, and a persistent Lumin chat interface across all views. This includes robust theme management and PWA installation prompts for a native-like experience.
*   **Dashboard**: A personalized, data-rich dashboard (`lifeos-dashboard.html`) that aggregates key daily information (MITs, schedule), tracks progress towards goals, and displays life scores. This serves as Adam's primary daily overview.
*   **Authentication**: Secure and reliable user authentication, including the ability to manage the `Command Key` and `Display Name` via the settings panel. The system must correctly identify Adam (`USER` context) and handle session management (sign-in/out).
*   **Chat/Lumin Paths**: Fully functional conversational AI interaction through the Lumin persistent drawer and embedded dashboard chat. This includes message sending, history loading, voice input capabilities (push-to-talk and ambient listening), and proactive nudges. The chat must be able to create and load threads, and display assistant replies.

### (5) NEXT FIVE queue task IDs

The next five tasks to execute are:

1.  Add SQL validation gate for `.sql` files before builder commits them
2.  Add HTML validation (basic structure check) for `.html` files
3.  Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
4.  Add auto-seed on boot (check if epistemic_facts is empty, run seed)
5.  Expand `GET /api/v1/lifeos/builder/history` to return full audit data