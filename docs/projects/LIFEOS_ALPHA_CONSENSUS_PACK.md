The required REPO FILE CONTENTS were not found, so the `queue_next_five` list cannot be populated from the authoritative source.
### NEEDS ASSESSMENT

Adam requires the following to effectively use the LifeOS prototype today:

*   **Shell Access**: A functional command-line interface for direct interaction and system control.
*   **Dashboard**: A web-based graphical user interface for monitoring system status, managing tasks, and visualizing data.
*   **Authentication**: A secure mechanism for Adam to log in and manage his session, ensuring system integrity.
*   **Chat/Lumin Paths**: Core conversational AI capabilities, including a primary chat interface and any specific pathways or features associated with the "Lumin" persona or functionality.

### Alpha Bar

The Alpha bar defines the minimum viable product for launch versus desirable enhancements.

**MUST (Launchable URLs, Single Happy Path Flow):**

*   **Accessible Dashboard URL**: The LifeOS dashboard must be reachable via a stable, public URL.
*   **User Authentication**: Adam must be able to successfully log in to the dashboard.
*   **Core Interaction Flow**: A single, end-to-end happy path must be fully functional. This includes initiating a query or command (e.g., via chat or shell), processing it through the AI, and receiving a coherent, relevant response.
*   **Basic Shell Command Execution**: The ability to issue fundamental shell commands and observe their output.

**NICE (Density, Stubs, Telemetry):**

*   **UI Density**: Richer user interface elements, additional data visualizations, and more interactive components beyond the core happy path.
*   **Feature Stubs**: Placeholder UI or API endpoints for planned future features, indicating direction without full implementation.
*   **Telemetry**: Comprehensive logging and monitoring for system performance, user interactions, and error reporting.

### TWO-AI Consensus Rule

LifeOS operates under a strict two-AI consensus rule for critical decisions and load-bearing disagreements. The Conductor supervisor orchestrates overall task execution, while the Railway multi-model council provides expert review and validation.

In instances of load-bearing disagreement (i.e., a conflict that blocks progress or requires a critical architectural decision), resolution is not achieved through informal IDE-only "council agrees" statements. Instead, a formal, auditable process is required: `POST /api/v1/lifeos/gate-change/run-preset` must be invoked, specifying either `preset maturity` (for advancing a component's readiness) or `program-start` (for initiating a major program phase). This action must be accompanied by a saved receipt, ensuring transparency and accountability for the decision.

### KNOWN Shipped Facts

To prevent redundant work and ensure efficient token usage, it is explicitly noted that the following artifacts are already shipped and integrated:

*   `lifeos-dashboard-tokens.css` exists.
*   `lifeos-dashboard-ai-rail.css` and `lifeos-dashboard-ai-rail.js` exist.
*   `lifeos-dashboard.html` already includes links to `lifeos-dashboard-tokens.css` and `lifeos-dashboard-ai-rail.css/js`.
*   `lifeos-dashboard.html` already contains the `#lifeos-ai-rail-root` element, serving as the mount point for the AI rail component.

### NEXT FIVE Queue Task IDs

The `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json` file was not found, therefore the next five queue task IDs cannot be provided from the authoritative source.