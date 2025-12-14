# Configuration

This document provides information on setting up and securing environment variables for the application.

## Environment Variables

- `NODE_ENV`: Set the environment (`development`, `production`, `test`).
- `PORT`: Port number for the server.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database configuration.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: Stripe API keys.
- `LOG_LEVEL`: Logging level.

## Security

Ensure that environment variables are not exposed in logs or error messages. Use the provided middleware to prevent sensitive data from being logged.