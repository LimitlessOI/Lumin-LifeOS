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
      script: "./scripts/builder-daemon.js",
      cron_restart: "0 2 * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
