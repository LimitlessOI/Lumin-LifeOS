# Automated Quality Checks for CRM Integrations

This project implements automated quality checks for CRM integrations, including checks for the BoldTrail API, lead sync timestamps, and Vapi call logs. Notifications are sent to Slack in case of check failures.

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set your Slack webhook URL in `slack_notifier.js`.
4. Run the cron job: `npm start`

## Endpoints
- GET `/api/v1/health/integrations`: Returns the status of all checks.