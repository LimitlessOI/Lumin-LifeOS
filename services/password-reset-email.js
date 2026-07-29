/**
 * SYNOPSIS: Send password-reset email via the configured provider (postmark, resend, smtp, disabled).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const REQUEST_TIMEOUT_MS = 10000;

function getFromAddress() {
  return (
    String(process.env.EMAIL_FROM || '').trim() ||
    String(process.env.RESEND_FROM || '').trim() ||
    String(process.env.SMTP_FROM || '').trim() ||
    String(process.env.WORK_EMAIL || '').trim() ||
    ''
  );
}

function providerName() {
  return String(process.env.EMAIL_PROVIDER || 'auto').toLowerCase().trim() || 'auto';
}

async function postmarkSend({ to, subject, textBody, htmlBody, token, from, logger }) {
  const body = {
    From: from,
    To: to,
    Subject: subject,
    TextBody: textBody,
    HtmlBody: htmlBody,
    MessageStream: 'outbound',
  };

  const resp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      sent: false,
      provider: 'postmark',
      error: json?.Message || `postmark_http_${resp.status}`,
    };
  }
  return { sent: true, provider: 'postmark', messageId: json?.MessageID || null };
}

async function resendSend({ to, subject, textBody, htmlBody, token, from, logger }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: textBody,
      html: htmlBody,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      sent: false,
      provider: 'resend',
      error: json?.message || json?.error || `resend_http_${resp.status}`,
    };
  }
  return { sent: true, provider: 'resend', messageId: json?.id || null };
}

async function smtpSend({ to, subject, textBody, htmlBody, from, logger }) {
  const smtpUser = String(process.env.SMTP_USER || process.env.WORK_EMAIL || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || process.env.WORK_EMAIL_APP_PASSWORD || '').trim();
  if (!smtpUser || !smtpPass) {
    return { sent: false, provider: 'smtp', error: 'smtp_credentials_not_configured' };
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const info = await transporter.sendMail({
    from: from || smtpUser,
    to,
    subject,
    text: textBody,
    html: htmlBody,
  });

  return { sent: true, provider: 'smtp', messageId: info.messageId || null };
}

function isPostmarkPendingApproval(error) {
  return /pending approval|same domain as the 'From' address|domain of the 'From' address/i.test(String(error || ''));
}

export async function sendPasswordResetEmail({ to, resetUrl, logger = console } = {}) {
  const recipient = String(to || '').trim().toLowerCase();
  const link = String(resetUrl || '').trim();
  if (!recipient || !link) {
    return { sent: false, error: 'missing_to_or_url' };
  }

  const from = getFromAddress();
  if (!from) {
    return { sent: false, error: 'EMAIL_FROM_not_configured' };
  }

  const subject = 'Reset your Social Media OS password';
  const textBody = `Reset your password:\n\n${link}\n\nThis link expires in 60 minutes. If you did not request it, ignore this email.`;
  const htmlBody = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 60 minutes. If you did not request it, ignore this email.</p>`;

  const configuredProvider = providerName();
  const postmarkToken = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();

  // Disabled explicitly
  if (configuredProvider === 'disabled') {
    return { sent: false, provider: 'disabled', error: 'email_disabled' };
  }

  try {
    // Postmark first when configured or auto
    if (configuredProvider === 'postmark' || (configuredProvider === 'auto' && postmarkToken)) {
      if (!postmarkToken) {
        return { sent: false, provider: 'postmark', error: 'POSTMARK_SERVER_TOKEN_not_set' };
      }
      const pm = await postmarkSend({ to: recipient, subject, textBody, htmlBody, token: postmarkToken, from, logger });
      if (pm.sent) return pm;
      // If Postmark is pending approval, fall through to Resend/SMTP so real customers can still recover passwords
      if (isPostmarkPendingApproval(pm.error) && resendKey) {
        logger?.warn?.('[PASSWORD-RESET] Postmark pending approval; falling back to Resend', { error: pm.error });
        const rd = await resendSend({ to: recipient, subject, textBody, htmlBody, token: resendKey, from, logger });
        if (rd.sent) return rd;
        // If Resend also fails, try SMTP as last resort before giving up
        const sm = await smtpSend({ to: recipient, subject, textBody, htmlBody, from, logger });
        if (sm.sent) return sm;
        return { sent: false, provider: 'resend', error: rd.error, fallback_error: sm.error };
      }
      // For any other Postmark failure, optionally try Resend/SMTP when in auto mode
      if (configuredProvider === 'auto' && (resendKey || process.env.SMTP_USER || process.env.WORK_EMAIL_APP_PASSWORD)) {
        logger?.warn?.('[PASSWORD-RESET] Postmark failed; trying fallbacks', { error: pm.error });
        if (resendKey) {
          const rd = await resendSend({ to: recipient, subject, textBody, htmlBody, token: resendKey, from, logger });
          if (rd.sent) return rd;
        }
        const sm = await smtpSend({ to: recipient, subject, textBody, htmlBody, from, logger });
        if (sm.sent) return sm;
      }
      return pm;
    }

    if (configuredProvider === 'resend' || (configuredProvider === 'auto' && resendKey)) {
      if (!resendKey) {
        return { sent: false, provider: 'resend', error: 'RESEND_API_KEY_not_set' };
      }
      return await resendSend({ to: recipient, subject, textBody, htmlBody, token: resendKey, from, logger });
    }

    if (configuredProvider === 'smtp' || configuredProvider === 'auto') {
      return await smtpSend({ to: recipient, subject, textBody, htmlBody, from, logger });
    }

    return { sent: false, error: `unknown_email_provider_${configuredProvider}`, provider: configuredProvider };
  } catch (err) {
    logger?.warn?.('[PASSWORD-RESET] send failed', { error: err.message, provider: configuredProvider });
    return { sent: false, error: err.message, provider: configuredProvider };
  }
}

export default { sendPasswordResetEmail };