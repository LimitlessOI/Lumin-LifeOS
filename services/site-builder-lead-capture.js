/**
 * SYNOPSIS: Exports captureAndNotifyLead — services/site-builder-lead-capture.js.
 */
export async function captureAndNotifyLead({ pool, clientId, name, phone, email, message, source, notifier, logger }) {
  if (!name || (!phone && !email)) {
    return { ok: false, error: 'Name and at least one contact method (phone or email) are required.' };
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS site_builder_leads (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      email TEXT,
      message TEXT,
      source TEXT,
      emailed BOOLEAN DEFAULT false,
      email_error TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  try {
    await pool.query(createTableQuery);

    const insertLeadQuery = `
      INSERT INTO site_builder_leads (client_id, name, phone, email, message, source)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const insertResult = await pool.query(insertLeadQuery, [clientId, name, phone, email, message, source]);
    const leadId = insertResult.rows[0].id;

    let notificationEmail;
    try {
      const emailQuery = 'SELECT notification_email FROM prospect_sites WHERE client_id = $1';
      const emailResult = await pool.query(emailQuery, [clientId]);
      notificationEmail = emailResult.rows[0]?.notification_email || process.env.SITE_BUILDER_LEAD_FALLBACK_EMAIL;
    } catch (err) {
      logger.error('Error retrieving notification email:', err);
    }

    let emailed = false;
    let emailError = null;
    if (notificationEmail) {
      try {
        await notifier.sendEmail({
          to: notificationEmail,
          subject: `New Lead from ${source || 'Site Builder'}`,
          text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
        });
        emailed = true;
      } catch (err) {
        emailError = err.message;
        logger.error('Error sending notification email:', err);
      }
    } else {
      emailError = 'No notification email available';
      logger.warn(emailError);
    }

    await pool.query(
      'UPDATE site_builder_leads SET emailed = $1, email_error = $2 WHERE id = $3',
      [emailed, emailError, leadId]
    );

    return { ok: true, leadId, emailed };
  } catch (err) {
    logger.error('Error capturing and notifying lead:', err);
    return { ok: false, error: 'Error capturing lead.' };
  }
}
