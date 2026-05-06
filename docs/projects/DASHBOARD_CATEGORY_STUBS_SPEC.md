# LifeOS Dashboard Category Stubs: Health, Family, Purpose

## Purpose
This document specifies the initial placeholder layout and navigation hooks for the Health, Family, and Purpose categories within the LifeOS Dashboard. The goal is to establish a minimal, functional shell for these domains, clearly delineating what remains within Platform Core's responsibility versus what will be owned by future dedicated domains. This is a stub specification; no full domain implementation is included.

## Core Principles
1.  **Minimalism:** Only essential UI elements and routing are defined.
2.  **Clear Ownership:** Explicitly define boundaries between Platform Core (shell) and future domain implementations.
3.  **Extensibility:** Design for seamless integration of full domain features later.
4.  **Consistency:** Follow existing LifeOS dashboard UI/UX patterns for navigation and layout.

## General Category Stub Structure

Each category (Health, Family, Purpose) will follow a consistent pattern for its initial stub implementation:

### 1. Dashboard Integration (Platform Core Owned)
*   **Layout:** A dedicated card or section on the main LifeOS Dashboard, clearly labeled with the category name (e.g., "Health," "Family," "Purpose"). This card will serve as a visual placeholder and a primary navigation entry point.
*   **Content:** The card will contain a brief, static message indicating the domain is "Coming Soon" or "Under Development," along with a primary call-to-action (CTA) button or link to navigate to the category's dedicated stub page.
*   **Navigation Hook:** The CTA on the dashboard card will link to a specific route for the category's stub page (e.g., `/dashboard/health`, `/dashboard/family`, `/dashboard/purpose`).

### 2. Dedicated Category Stub Page (Platform Core Owned)
*   **Layout:** A simple, full-width page accessible via the dashboard navigation hook. This page will utilize the standard LifeOS application shell (header, sidebar, footer).
*   **Content:**
    *   A prominent header displaying the category name.
    *   A central message (e.g., "Welcome to the [Category Name] domain. Full features are currently under development and will be available soon.").
    *   Optionally, a placeholder for future sub-navigation or key metrics, clearly marked as "Future [Category Name] Features."
*   **Navigation Hooks:**
    *   The main application sidebar will include a top-level navigation item for each category, linking to its respective stub page.
    *   Breadcrumbs (if implemented) will reflect the path: `Dashboard > [Category Name]`.

### 3. Ownership Delineation

*   **Platform Core (Shell) Responsibilities:**
    *   Providing the main dashboard card/section for each category.
    *   Defining and serving the top-level routes for the category stub pages (e.g., `/dashboard/health`).
    *   Rendering the basic HTML structure and "Coming Soon" content for these stub pages.
    *   Integrating these categories into the main application navigation (sidebar, quick links).
    *   Ensuring consistent styling and layout within the overall LifeOS shell.
*   **Future Domain Responsibilities (Health, Family, Purpose Domains):**
    *   Taking over the content and functionality of the dedicated category pages.
    *   Implementing specific features, data models, services, and UI components for their respective domains.
    *   Extending or replacing the placeholder content on the stub pages with rich, interactive experiences.
    *   Defining sub-routes and internal navigation within their domain.

## Implementation Details (Builder Guidance)

*   **Dashboard Card/Section:**
    *   Modify an existing dashboard rendering component (e.g., `views/dashboard.ejs` or a React component if applicable) to include the new category cards.
    *   Each card will link to its respective stub route.
*   **Routing:**
    *   New route files will be created for each category stub:
        *   `routes/health-stub-routes.js`
        *   `routes/family-stub-routes.js`
        *   `routes/purpose-stub-routes.js`
    *   These route files will define a simple `GET` endpoint (e.g., `/dashboard/health`) that renders a minimal EJS/HTML template.
    *   These new route files must be imported and mounted in `startup/register-runtime-routes.js`.
*   **Templates:**
    *   New EJS/HTML template files for each stub page:
        *   `views/health-stub.ejs`
        *   `views/family-stub.ejs`
        *   `views/purpose-stub.ejs`
    *   These templates will include the basic "Coming Soon" message and adhere to the overall LifeOS UI structure.

## Example Route (Health Stub)

```javascript
// routes/health-stub-routes.js
import { Router } from 'express';

const router = Router();

router.get('/dashboard/health', (req, res) => {
  res.render('health-stub', { title: 'Health Domain' });
});

export default router;
```

```javascript
// startup/register-runtime-routes.js (excerpt)
import healthStubRoutes from '../routes/health-stub-routes.js';
// ... other imports

export default function registerRuntimeRoutes(app) {
  // ... existing routes
  app.use('/', healthStubRoutes);
  // ... other new stub routes
}
```

```html
<!-- views/health-stub.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %> - LifeOS</title>
    <!-- Link to shared CSS -->
</head>
<body>
    <%- include('partials/header') %>
    <%- include('partials/sidebar') %>
    <main>
        <h1><%= title %></h1>
        <p>Welcome to the Health domain. Full features are currently under development and will be available soon.</p>
        <div class="placeholder-content">
            <!-- Future Health Features will appear here -->
            <p>Future Health Metrics & Tools</p>
        </div>
    </main>
    <%- include('partials/footer') %>
</body>
</html>
```