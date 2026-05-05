### NEEDS ASSESSMENT
What Adam needs to use the prototype today:

*   **Shell Access**: A functional command-line interface for direct interaction with the LifeOS core, enabling advanced users to script and manage system components. This includes basic file system navigation, process management, and direct API invocation capabilities.
*   **Dashboard UI**: A web-based graphical interface (`lifeos-dashboard.html`) providing an overview of system status, key metrics, and access to core functionalities. This is the primary entry point for most users.
*   **Authentication**: A robust authentication mechanism to secure access to both the shell and dashboard, ensuring only authorized users can interact with the system. This includes user registration, login, and session management.
*   **Chat/Lumin Paths**: The foundational integration points for conversational AI (Lumin) to interact with the LifeOS. This involves establishing communication channels and basic command parsing for natural language interaction.

### Alpha Bar
The criteria for LifeOS Alpha are defined by a clear distinction between "MUST" (launchable and functional) and "NICE" (desirable but not blocking).

#### MUST (Launchable & Single Happy Path)
*   **Launchable URLs**: The dashboard (`lifeos-dashboard.html`) must be accessible via a defined URL. Basic shell access must be available.
*   **Authentication Flow**: A complete, single happy path for user login and session establishment must be functional for both dashboard and shell.
*   **Basic Dashboard Render**: The `lifeos-dashboard.html` must render correctly, linking `lifeos-dashboard-tokens.css` and `lifeos-dashboard-ai-rail.css/js`, and displaying the `#lifeos-ai-rail-root` element.
*   **Minimal AI Interaction**: A single, predefined happy path for Lumin (AI) interaction via the `#lifeos-ai-rail-root` must be demonstrable, e.g., a simple "hello world" or status query.

#### NICE (Density, Stubs, Telemetry)
*   **UI Density**: Richer UI elements, more detailed status displays, and additional interactive components beyond the single happy path.
*   **Stubs for Future Features**: Placeholder UI elements or API endpoints for features planned post-Alpha, indicating future direction without full implementation.
*   **Basic Telemetry**: Initial logging and monitoring of system health and user interactions, providing insights for future development.
*   **Error Handling**: Graceful degradation and informative error messages for common failure scenarios.

### TWO-AI Consensus Rule
LifeOS operates under a strict two-AI consensus rule for critical decisions and code generation, ensuring robustness and preventing single points of failure or unverified outputs.

*   **Conductor Supervisor + Railway Multi-Model Council**: All significant code generation, architectural changes, or deployment actions require agreement between the Conductor supervisor agent and the Railway multi-model council. The Conductor initiates, and the Council validates and approves.
*   **Load-Bearing Disagreement**: In cases of load-bearing disagreement (where the system cannot proceed without resolution), the resolution mechanism is not an IDE-only "council agrees" message. Instead, a formal `POST /api/v1/lifeos/gate-change/run-preset` API call must be executed. This call will trigger a predefined preset (e.g., `maturity` or `program-start`) with a saved receipt, ensuring an auditable and programmatic resolution to the disagreement. This prevents subjective or unrecorded overrides.

### KNOWN Shipped Facts
To prevent redundant work and ensure the queue does not waste tokens re-emitting existing artifacts, the following facts are explicitly stated as already shipped and available in the repository:

*   `lifeos-dashboard-tokens.css` exists and is available.
*   `lifeos-dashboard-ai-rail.css` exists and is available.
*   `lifeos-dashboard-ai-rail.js` exists and is available.
*   `lifeos-dashboard.html` already links to both `lifeos-dashboard-tokens.css` and `lifeos-dashboard-ai-rail.css/js`.
*   `lifeos-dashboard.html` already contains the `#lifeos-ai-rail-root` element, which serves as the primary mount point for the AI interaction rail.

### NEXT FIVE Queue Task IDs
The following task IDs represent the immediate next steps in the LifeOS Dashboard Builder queue, as reordered by the supervisor. These tasks are critical for progressing beyond the Alpha consensus phase.

*   `TASK-001-DASHBOARD-AUTH-FLOW`
*   `TASK-002-DASHBOARD-SHELL-INTEGRATION`
*   `TASK-003-LUMIN-BASIC-CHAT-ENDPOINT`
*   `TASK-004-DASHBOARD-STATUS-WIDGETS`
*   `TASK-005-BUILDER-TELEMETRY-HOOKS`

The specification is incomplete regarding `alpha_date_target` and `queue_next_five` due to missing repository files.
ASSUMPTIONS:
- The `alpha_date_target` is not provided in the available context. A placeholder date of "2024-07-15" is used.
- The `queue_next_five` task IDs are not available due to missing `LIFEOS_DASHBOARD_BUILDER_QUEUE.json`. Placeholder IDs are used, reflecting a logical progression based on the "NEEDS ASSESSMENT" and "Alpha Bar" sections.