<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LifeOS Dashboard Gap Audit</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #e8e8f0; background-color: #0a0a0f; padding: 20px; }
        h1, h2, h3 { color: #5b6af5; }
        section { margin-bottom: 30px; padding: 15px; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; background-color: #111118; }
        ul { list-style-type: disc; margin-left: 20px; }
        li { margin-bottom: 5px; }
        code { background-color: #1e1e28; padding: 2px 4px; border-radius: 4px; font-family: monospace; color: #e05555; }
        .warning { color: #f59e0b; font-weight: bold; }
    </style>
</head>
<body>
    <h1>LifeOS Dashboard Gap Audit</h1>

    <section>
        <h2>Summary</h2>
        <p class="warning">The requested gap audit against <code>LIFEOS_DASHBOARD_BUILDER_BRIEF.md</code> and <code>LIFEOS_DASHBOARD_BUILDER_QUEUE.md</code> cannot be performed.</p>
        <p>The injected file contents for both <code>docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md</code> and <code>docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md</code> indicate a <code>READ ERROR: ENOENT: no such file or directory</code>. Per the epistemic laws, this means the brief documents are not available for comparison, despite the task wording stating they exist.</p>
        <p>Without the authoritative brief, it is not possible to identify concrete gaps in <code>lifeos-dashboard.html</code> and <code>lifeos-app.html</code> against the specified design intent (sidebar, bottom tabs, AI rail direction, light/dark intent, mobile vs desktop).</p>
    </section>

    <section>
        <h2>Gaps vs brief</h2>
        <p>This section cannot be completed as the authoritative brief documents (<code>LIFEOS_DASHBOARD_BUILDER_BRIEF.md</code> and <code>LIFEOS_DASHBOARD_BUILDER_QUEUE.md</code>) are unavailable due to <code>ENOENT</code> errors in the injected file contents.</p>
    </section>

    <section>
        <h2>Recommended next queued builds</h2>
        <p>Based on the "Next approved tasks" from the prompt, the following builds are recommended:</p>
        <ul>
            <li>Add SQL validation gate for <code>.sql</code> files before builder commits them.</li>
            <li>Wire <code>npm run memory:ci-evidence</code> into <code>.github/workflows/smoke-test.yml</code>.</li>
        </ul>
    </section>

    <section>
        <h2>Open questions</h2>
        <ul>
            <li>What is the correct source of truth for <code>LIFEOS_DASHBOARD_BUILDER_BRIEF.md</code> and <code>LIFEOS_DASHBOARD_BUILDER_QUEUE.md</code>, given the <code>ENOENT</code> errors in the injected file contents?</li>
            <li>Should the audit proceed with assumptions about the brief's content, or is the brief's availability a hard blocker? (Assuming the latter, as per "trust injected bodies first").</li>
        </ul>
    </section>
</body>
</html>