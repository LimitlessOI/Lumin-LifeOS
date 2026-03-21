```markdown
# Deployment and Monitoring Instructions

## Setup

1. Ensure all dependencies are installed using `npm install`.
2. Set environment variables in a `.env` file at the root of the project.

## Running the Server

```bash
npm start
```

## Process supervision

- PM2 is configured to keep `server.js` alive with zero downtime. The ecosystem file is located at `ecosystem.config.js` and points at the same entry point used by `npm start`.
- Use the provided npm scripts:
  - `npm run pm2:start` to launch the lifeos app under PM2 supervision.
  - `npm run pm2:restart` to restart it if needed.
  - `npm run pm2:logs` to tail the latest PM2 output and ensure the watcher is healthy.
  - PM2 automatically restarts the process on exit/crash, adds a 1s restart delay, and writes logs to `logs/pm2-out.log` and `logs/pm2-error.log` for later audit.

## Testing

- Run unit and integration tests:
  ```bash
  npm test
  ```

- Load testing with Artillery:
  ```bash
  artillery run tests/load-test.yml
  ```

## Deployment

1. Deploy changes to the staging environment.
2. Monitor logs and metrics for any issues.
3. Once verified, deploy to production.

## Monitoring

Set up dashboards and alerts using logging and monitoring tools to observe real-time metrics and log any issues.
```
