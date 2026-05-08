# Shipped controls
- Connect/Disconnect Command Key
- Refresh Dashboard Stats
- Refresh Prospect List
- Analyze Existing Site (calls `POST /api/v1/sites/analyze`)
- Prefill Build Form with Analyzed URL
- Build Mock Site & Optionally Send Outreach Email (calls `POST /api/v1/sites/prospect` with `skipEmail` option)
- View Generated Preview Site (link to `/previews/*`)
- Update Prospect Status (calls `PATCH /api/v1/sites/prospects/:clientId/status` for `status` only)

# Missing operator actions
- Manually send follow-up email to a prospect
- View full details of a single prospect (including `metadata`, `qualityReport`, `opportunityScore` details, `outreach_log`)
- Edit prospect details beyond