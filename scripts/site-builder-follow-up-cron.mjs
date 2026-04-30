import pg from 'pg';
import { NotificationService } from '../core/notification-service.js';
import { runFollowUpCron } from '../services/prospect-pipeline.js';

const { Pool } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    let sendEmail;
    const notificationService = new NotificationService({ pool });
    if ((process.env.EMAIL_PROVIDER || 'postmark').toLowerCase() !== 'disabled' && process.env.EMAIL_FROM) {
      sendEmail = async (to, subject, html) =>
        notificationService.sendEmail({ to, subject, html, text: '' });
    }

    const result = await runFollowUpCron({ pool, sendEmail });
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
