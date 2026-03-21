#!/usr/bin/env bash
set -euo pipefail
mkdir -p logs
npx pm2 start ecosystem.config.js --only lifeos
npx pm2 save
echo "PM2 is watching server.js (lifeos). Logs: logs/pm2-*.log"
