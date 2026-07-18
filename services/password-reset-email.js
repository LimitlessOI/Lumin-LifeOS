/**
 * SYNOPSIS: Send password-reset email via Resend or SMTP when configured.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export async function sendPasswordResetEmail({ to, resetUrl, logger = console } = {}) {
  const recipient = String(to || '').trim().toLowerCase();
  const link = String(resetUrl || '').trim();
  if (!recipient || !link) {
    return { sent: false, error: 'missing_to_or_url' };
  }

  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    process.env.WORK_EMAIL ||
    '';

  const subject = 'Reset your Social Media OS password';
  const text = `Reset your password:\n\n${link}\n\nThis link expires in 60 minutes. If you did not request it, ignore this email.`;
  const html = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 60 minutes. If you did not request it, ignore this email.</p>`;

  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    if (!from) return { sent: false, error: 'EMAIL_FROM_required_for_resend', provider: 'resend' };
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [recipient], subject, text, html }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return {
          sent: false,
          error: json?.message || json?.error || `resend_http_${resp.status}`,
          provider: 'resend',
        };
      }
      return { sent: true, provider: 'resend', messageId: json?.id || null };
    } catch (err) {
      logger?.warn?.('[PASSWORD-RESET] resend failed', { error: err.message });
      return { sent: false, error: err.message, provider: 'resend' };
    }
  }

  const smtpUser = String(process.env.SMTP_USER || process.env.WORK_EMAIL || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || process.env.WORK_EMAIL_APP_PASSWORD || '').trim();
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const info = await transporter.sendMail({
        from: from || smtpUser,
        to: recipient,
        subject,
        text,
        html,
      });
      return { sent: true, provider: 'smtp', messageId: info.messageId || null };
    } catch (err) {
      logger?.warn?.('[PASSWORD-RESET] smtp failed', { error: err.message });
      return { sent: false, error: err.message, provider: 'smtp' };
    }
  }

  return { sent: false, error: 'email_provider_not_configured', provider: null };
}

export default { sendPasswordResetEmail };