/**
 * tc-email-monitor.js
 * Monitors email for incoming real estate contracts (Nevada/GLVAR).
 * Sends TC outbound emails via Postmark (NotificationService).
 *
 * Deps: services/email-reader.js pattern, core/notification-service.js
 * Exports: createTCEmailMonitor(deps)
 */

import { ImapFlow } from 'imapflow';
import { resolveTCImapConfig } from './tc-imap-config.js';

const NEVADA_DEFAULTS = {
  inspection_contingency_days: 10,
  loan_contingency_days: 21,
  appraisal_contingency_days: 17,
};

// Subject patterns that indicate a new contract / offer
const CONTRACT_SUBJECT_PATTERNS = [
  /purchase\s+agreement/i,
  /counter\s+offer/i,
  /accepted\s+offer/i,
  /executed\s+contract/i,
  /ratified/i,
  /signed\s+contract/i,
  /fully\s+executed/i,
  /offer\s+accepted/i,
  /transaction\s+coordinator/i,
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createTCEmailMonitor({ notificationService, callCouncilMember, accountManager, logger = console }) {
  const TC_FROM = process.env.TC_EMAIL_FROM || process.env.EMAIL_FROM || 'LifeOS@hopkinsgroup.org';
  const TC_NAME = process.env.TC_AGENT_NAME || 'Adam Hopkins';
  const TC_PHONE = process.env.TC_AGENT_PHONE || '';

  function looksLikeContract(subject, hasAttachment) {
    return CONTRACT_SUBJECT_PATTERNS.some(p => p.test(subject)) || hasAttachment;
  }

  /**
   * Poll the IMAP inbox once and return emails that look like contracts.
   */
  async function checkForNewContracts({ since = null } = {}) {
    const imapConfig = await resolveTCImapConfig({ accountManager, logger });
    if (!imapConfig.auth.pass) {
      logger.warn?.('[TC-EMAIL] IMAP password not set — email monitoring disabled');
      return [];
    }

    const client = new ImapFlow(imapConfig);

    const found = [];
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      const searchCriteria = { seen: false };
      if (since) searchCriteria.since = since;

      for await (const msg of client.fetch(searchCriteria, {
        envelope: true,
        bodyStructure: true,
        uid: true,
      })) {
        const subject = msg.envelope?.subject || '';
        const hasAttachment = hasAttachments(msg.bodyStructure);
        if (looksLikeContract(subject, hasAttachment)) {
          found.push({
            uid: msg.uid,
            subject,
            from: msg.envelope?.from?.[0]?.address,
            date: msg.envelope?.date,
            hasAttachment,
            messageId: msg.envelope?.messageId,
          });
        }
      }

      await client.logout();
    } catch (err) {
      logger.warn?.({ error: err.message }, '[TC-EMAIL] IMAP check failed');
    }

    return found;
  }

  function hasAttachments(bodyStructure) {
    if (!bodyStructure) return false;
    if (bodyStructure.disposition?.value?.toLowerCase() === 'attachment') return true;
    if (Array.isArray(bodyStructure.childNodes)) {
      return bodyStructure.childNodes.some(hasAttachments);
    }
    return false;
  }

  /**
   * Use AI council to extract transaction details from email text.
   */
  async function parseTransactionFromEmail(emailText) {
    if (!callCouncilMember) {
      return extractWithRegex(emailText);
    }

    const prompt = `You are a real estate transaction coordinator assistant in Nevada.
Extract the following fields from this email/document. Return ONLY valid JSON, no markdown.

Required fields:
- address (full property address)
- mls_number (MLS# if present)
- purchase_price (number, no commas or $)
- acceptance_date (ISO8601 date YYYY-MM-DD, the date the contract was accepted/ratified)
- close_date (ISO8601 date YYYY-MM-DD, close of escrow date)
- agent_role (one of: listing, buyers, dual)
- buyer (object: {name, email, phone})
- seller (object: {name, email, phone})
- buyer_agent (object: {name, email, phone})
- listing_agent (object: {name, email, phone})
- escrow (object: {company, officer, email, phone})
- lender (object: {company, officer, email, phone})

If a field is not found, use null.

EMAIL/CONTRACT TEXT:
${emailText.slice(0, 4000)}`;

    try {
      const result = await callCouncilMember('gemini', prompt, { taskType: 'extraction' });
      const json = result.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(json);
    } catch {
      return extractWithRegex(emailText);
    }
  }

  function extractWithRegex(text) {
    const addressMatch = text.match(/\d+\s+[\w\s]+(?:Ave|Blvd|Ct|Dr|Ln|Pl|Rd|St|Way|Circle|Loop|Pkwy)[^,\n]*(?:Las Vegas|Henderson|North Las Vegas|Boulder City|NV)[^,\n]*\d{5}/i);
    const mlsMatch = text.match(/MLS[\s#:]*(\d{6,8})/i);
    const priceMatch = text.match(/purchase\s+price[\s:$]*([\d,]+)/i);
    const dateMatch = text.match(/(?:accepted|ratified|executed)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);

    return {
      address: addressMatch?.[0]?.trim() || null,
      mls_number: mlsMatch?.[1] || null,
      purchase_price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null,
      acceptance_date: dateMatch ? parseDate(dateMatch[1]) : null,
      close_date: null,
      agent_role: 'buyers',
      buyer: null, seller: null, buyer_agent: null, listing_agent: null, escrow: null, lender: null,
    };
  }

  function parseDate(str) {
    try {
      return new Date(str).toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }

  /**
   * Compute Nevada-standard contingency dates from acceptance date.
   */
  function computeKeyDates(acceptanceDate, closeDate) {
    if (!acceptanceDate) return {};
    return {
      acceptance: acceptanceDate,
      inspection_contingency: addDays(acceptanceDate, NEVADA_DEFAULTS.inspection_contingency_days),
      loan_contingency: addDays(acceptanceDate, NEVADA_DEFAULTS.loan_contingency_days),
      appraisal_contingency: addDays(acceptanceDate, NEVADA_DEFAULTS.appraisal_contingency_days),
      coe: closeDate || addDays(acceptanceDate, 30),
    };
  }

  /**
   * Send party introduction email to all transaction parties.
   */
  async function sendPartyIntro(transaction) {
    if (!notificationService?.sendEmail) {
      logger.warn?.('[TC-EMAIL] Notification service unavailable — skipping party intro');
      return [];
    }

    const keyDates = transaction.key_dates || {};
    const parties = transaction.parties || {};

    const dateTable = Object.entries(keyDates)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${v}`)
      .join('\n');

    const body = `Hello,

I am ${TC_NAME}, the Transaction Coordinator for the purchase of:
${transaction.address || 'Property address pending'}
${transaction.mls_number ? `MLS# ${transaction.mls_number}` : ''}
${transaction.purchase_price ? `Purchase Price: $${Number(transaction.purchase_price).toLocaleString()}` : ''}

KEY DATES:
${dateTable || 'Dates to be confirmed'}

I will be coordinating this transaction through close of escrow. Please reach out if you have any questions.

${TC_NAME}
Transaction Coordinator${TC_PHONE ? `\n${TC_PHONE}` : ''}
${TC_FROM}
`;

    const recipients = [
      parties.buyer?.email,
      parties.seller?.email,
      parties.buyer_agent?.email,
      parties.listing_agent?.email,
      parties.escrow?.email,
      parties.lender?.email,
    ].filter(Boolean);

    const results = [];
    for (const email of recipients) {
      try {
        await notificationService.sendEmail({
          to: email,
          from: TC_FROM,
          subject: `Transaction Coordinator Introduction — ${transaction.address || 'New Transaction'}`,
          text: body,
        });
        results.push({ email, ok: true });
      } catch (err) {
        results.push({ email, ok: false, error: err.message });
      }
    }

    logger.info?.({ recipients: results }, '[TC-EMAIL] Party intro emails sent');
    return results;
  }

  /**
   * Send a deadline reminder to relevant parties.
   */
  async function sendDeadlineReminder(transaction, deadlineName, deadlineDate, daysRemaining) {
    if (!notificationService?.sendEmail) {
      logger.warn?.(
        { transactionId: transaction?.id, deadlineName },
        '[TC-EMAIL] Notification service unavailable — skipping deadline reminder'
      );
      return [];
    }

    const parties = transaction.parties || {};

    // Who gets reminded depends on which deadline
    const buyerSide = ['buyer', 'buyer_agent', 'lender'];
    const allParties = ['buyer', 'seller', 'buyer_agent', 'listing_agent', 'escrow'];

    const recipientKeys = deadlineName.includes('inspection') || deadlineName.includes('loan') || deadlineName.includes('appraisal')
      ? buyerSide : allParties;

    const recipients = recipientKeys.map(k => parties[k]?.email).filter(Boolean);

    const urgency = daysRemaining <= 1 ? '⚠️ URGENT — ' : '';
    const subject = `${urgency}${deadlineName.replace(/_/g, ' ').toUpperCase()} — ${daysRemaining} day(s) remaining — ${transaction.address}`;

    const body = `Hello,

This is a reminder that the ${deadlineName.replace(/_/g, ' ')} for the following transaction is approaching:

Property: ${transaction.address}
${transaction.mls_number ? `MLS#: ${transaction.mls_number}` : ''}
Deadline: ${deadlineDate} (${daysRemaining} day(s) remaining)

Please ensure all required actions are completed before this deadline.

${TC_NAME}
Transaction Coordinator
${TC_FROM}`;

    const results = [];
    for (const email of recipients) {
      try {
        await notificationService.sendEmail({ to: email, from: TC_FROM, subject, text: body });
        results.push({ email, ok: true });
      } catch (err) {
        results.push({ email, ok: false, error: err.message });
      }
    }

    logger.info?.({ deadlineName, daysRemaining, recipients: results }, '[TC-EMAIL] Deadline reminder sent');
    return results;
  }

  return {
    checkForNewContracts,
    parseTransactionFromEmail,
    computeKeyDates,
    sendPartyIntro,
    sendDeadlineReminder,
    looksLikeContract,
  };
}

export default createTCEmailMonitor;
