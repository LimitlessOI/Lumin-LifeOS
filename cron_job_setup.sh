#!/bin/bash
# Cron job setup script for automatic task cleanup

# Add the cron job to run the cleanup script every 5 minutes
(crontab -l; echo '*/5 * * * * /usr/bin/python3 /path/to/cleanup_tasks.py') | crontab -