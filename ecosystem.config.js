/** PM2 configuration to keep `server.js` running with zero downtime. */
export default {
  apps: [
    {
      name: "lifeos",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      restart_delay: 1000,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      name: "builder-daemon",
      script: "./scripts/lifeos-builder-daemon.mjs",
      autorestart: true,
      restart_delay: 5000,
      min_uptime: 8000,
      max_restarts: 100,
      watch: false,
      error_file: "./logs/pm2-builder-daemon-error.log",
      out_file: "./logs/pm2-builder-daemon-out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      env: {
        NODE_ENV: "production",
        BUILDER_DAEMON_INTERVAL_MIN: "30",
        BUILDER_DAEMON_FAIL_SLEEP_MIN: "5",
        /** Autonomous queue: max builder tasks per daemon cycle (alias of legacy OVERNIGHT_MAX). */
        BUILDER_QUEUE_MAX: "2",
        OVERNIGHT_MAX: "2",
        OVERNIGHT_USE_CURSOR: "1",
        // probe = no council /build in supervise (default); full = doc+JS smoke.
        BUILDER_DAEMON_SUPERVISE_MODE: "probe",
      },
    },
  ],
};
