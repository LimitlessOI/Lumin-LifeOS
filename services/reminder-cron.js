/**
 * services/reminder-cron.js — Amendment 16 (Word Keeper)
 *
 * Runs every 60 seconds. Checks commitment_reminders for anything due.
 * Sends SMS via Twilio. Marks sent. Handles audible reminders via ElevenLabs TTS.
 *
 * Also schedules the Monday morning weekly coaching SMS.
 *
 * Exports: startReminderCron(pool, twilioSendSMS, opts) → stopFn
 * @ssot docs/projects/AMENDMENT_16_WORD_KEEPER.md
 */

const WEEKLY_COACHING_HOUR   = 8;   // 8am local (server time — configure TZ on Railway)
const WEEKLY_COACHING_DAY    = 1;   // Monday (0=Sun, 1=Mon)
const CRON_INTERVAL_MS       = 60 * 1000; // check every 60s

// ElevenLabs TTS (audible reminders — optional)
async function generateAudioReminder(text, apiKey) {
  if (!apiKey || !text) return null;
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer; // caller decides what to do (stream to device, save, etc.)
  } catch {
    return null;
  }
}

export function startReminderCron(pool, twilioSendSMS, opts = {}) {
  if (!pool) {
    console.warn('[REMINDER-CRON] No DB pool — cron disabled');
    return () => {};
  }

  const userPhone       = opts.userPhone       || process.env.ALERT_PHONE || process.env.ADMIN_PHONE;
  const twilioFrom      = opts.twilioFrom      || process.env.TWILIO_PHONE_NUMBER;
  const elevenLabsKey   = opts.elevenLabsKey   || process.env.ELEVENLABS_API_KEY;
  const integrityEngine = opts.integrityEngine || null;

  let lastWeeklyCoachingDate = null;

  async function processDueReminders() {
    try {
      // Fetch all pending reminders that are now due
      const { rows: due } = await pool.query(`
        SELECT cr.*, c.to_person, c.normalized_text, c.raw_text, c.deadline,
               c.remind_audible, c.user_id
        FROM commitment_reminders cr
        JOIN commitments c ON c.id = cr.commitment_id
        WHERE cr.status = 'pending'
          AND cr.remind_at <= NOW()
        ORDER BY cr.remind_at ASC
        LIMIT 20
      `);

      if (!due.length) return;

      console.log(`[REMINDER-CRON] ${due.length} reminder(s) due`);

      for (const reminder of due) {
        try {
          const message = reminder.message_text ||
            `Commitment reminder: "${reminder.normalized_text || reminder.raw_text}"`;

          let sent = false;

          // SMS via Twilio
          if (reminder.channel === 'sms' || reminder.channel === 'overlay') {
            if (twilioSendSMS && userPhone) {
              const result = await twilioSendSMS(userPhone, message);
              sent = result?.success !== false;
              if (!sent) {
                console.warn(`[REMINDER-CRON] SMS failed for reminder ${reminder.id}:`, result?.error);
              }
            } else {
              // No Twilio configured — log and mark sent anyway so we don't retry forever
              console.log(`[REMINDER-CRON] (no Twilio) ${message}`);
              sent = true;
            }
          }

          // Audible reminder via ElevenLabs (only if commitment has remind_audible = true)
          if (reminder.remind_audible && elevenLabsKey) {
            const audio = await generateAudioReminder(message, elevenLabsKey);
            if (audio) {
              // Store audio as base64 in a notification for the overlay to play
              await pool.query(`
                INSERT INTO overlay_notifications (user_id, type, payload, created_at)
                VALUES ($1, 'audible_reminder', $2, NOW())
              `, [
                reminder.user_id || 'adam',
                JSON.stringify({ audio: audio.toString('base64'), message }),
              ]).catch(() => {}); // table may not exist yet — non-blocking
            }
          }

          // Mark reminder as sent
          await pool.query(`
            UPDATE commitment_reminders
            SET status = $1, sent_at = NOW()
            WHERE id = $2
          `, [sent ? 'sent' : 'failed', reminder.id]);

          // If this is the deadline reminder, update commitment to prompt user
          if (reminder.type === 'deadline') {
            await pool.query(`
              UPDATE commitments
              SET status = CASE WHEN status = 'confirmed' THEN 'deadline_reached' ELSE status END,
                  updated_at = NOW()
              WHERE id = $1
            `, [reminder.commitment_id]).catch(() => {});
          }

        } catch (err) {
          console.error(`[REMINDER-CRON] Error processing reminder ${reminder.id}:`, err.message);
          await pool.query(`
            UPDATE commitment_reminders SET status = 'failed', sent_at = NOW()
            WHERE id = $1
          `, [reminder.id]).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[REMINDER-CRON] processDueReminders error:', err.message);
    }
  }

  async function processWeeklyCoaching() {
    const now = new Date();
    if (now.getDay() !== WEEKLY_COACHING_DAY) return;
    if (now.getHours() !== WEEKLY_COACHING_HOUR) return;

    // Only run once per Monday
    const todayKey = now.toISOString().slice(0, 10);
    if (lastWeeklyCoachingDate === todayKey) return;
    lastWeeklyCoachingDate = todayKey;

    try {
      if (!integrityEngine || !twilioSendSMS || !userPhone) return;

      const coaching = await integrityEngine.weeklyCoaching('adam');
      if (!coaching) return;

      const smsLines = [
        coaching.scoreLine,
        coaching.bestKept,
        coaching.lesson,
        coaching.focus,
      ].filter(Boolean);

      // Send as separate SMS (SMS has 160-char limit per section)
      for (const line of smsLines) {
        await twilioSendSMS(userPhone, line);
        await new Promise(r => setTimeout(r, 500)); // small gap between messages
      }

      console.log('[REMINDER-CRON] Weekly coaching SMS sent');
    } catch (err) {
      console.error('[REMINDER-CRON] Weekly coaching failed:', err.message);
    }
  }

  // Start the cron
  const timer = setInterval(async () => {
    await processDueReminders();
    await processWeeklyCoaching();
  }, CRON_INTERVAL_MS);

  // Run immediately on start
  processDueReminders().catch(() => {});

  console.log('[REMINDER-CRON] Started — checking every 60s');

  return () => {
    clearInterval(timer);
    console.log('[REMINDER-CRON] Stopped');
  };
}
