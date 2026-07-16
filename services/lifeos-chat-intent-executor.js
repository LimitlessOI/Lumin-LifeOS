/**
 * SYNOPSIS: Exports classifyIntent — services/lifeos-chat-intent-executor.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export function classifyIntent(text) {
  const t = String(text || '').trim();

  if (DISPLAY_RE.test(t)) {
    return 'display';
  }

  if (/\b(?:what does|how does|show me|describe|walk me through)\b.*\b(?:smos|social media os|social media workflow|content workflow|relocation content)\b/i.test(t)
      || /\b(?:smos|social media os|social media workflow|content workflow|content pack)\b.*\b(?:workflow|steps|process|look like)\b/i.test(t)) {
    return 'smos';
  }

  if (/\b(?:buy|purchase|checkout|order|pay for)\b.*\b(?:smos|social media os|content pack|content workflow)\b/i.test(t)
      || /\b(?:smos|social media os|content pack)\b.*\b(?:buy|purchase|checkout|order|pay)\b/i.test(t)) {
    return 'smos_purchase';
  }

  if (/(?:what.*scheduled|show.*appointment|my appointment|upcoming commitment|what.*commitment|list.*commitment|show.*commitment|my commitments)/i.test(t)) {
    return 'commitment_query';
  }

  if (/(?:commitment|appointment|meeting|schedule|reminder|remind me to|dentist|doctor|vet|call\s+\w+\s+(?:at|on|tomorrow|today|next)|at\s+\d|next\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)/i.test(t)) {
    return 'commitment';
  }

  if (/^(?:take a note|note|remember|remind me|make a note|jot down|capture):?\s+/i.test(t) || /\bnote\b.*\b(?:down|that|:)\b/i.test(t)) {
    return 'note';
  }

  const responseAfterQuestion = t.includes('?')
    ? t.slice(t.lastIndexOf('?') + 1).trim()
    : t;
  const isCheckInResponse = /(?:i|we)(?:\s+also)?\s+(?:wrote|built|designed|fixed|tested|worked on|completed|finished|spent|just|did|made|updated|reviewed|created|shipped|deployed|coded|met with|discussed|planned|resolved|merged|pushed|wrote|added|refactored|debugged|tested)/i.test(responseAfterQuestion);
  if (isCheckInResponse) {
    return 'check_in_response';
  }

  if (/(?:check[\s-]?in|daily check|what.*worked on|status update|how.*day)/i.test(t)) {
    return 'check_in';
  }

  if (/(?:worked on|finished|completed|spent.*on|just did|i did|i worked)/i.test(t)) {
    return 'check_in_response';
  }

  if (/^(?:do|fix|execute|run):\s*/i.test(t)
      || /\b(?:set or replace|change|update|create|make|write|edit|patch|add|implement|build)\s+(?:the|a|this|that)?\s*\S+\s+(?:in|to|from)\b/i.test(t)
      || /\b(?:build me|create a|add a|add an|implement|make a|ship a|build a)\s+/i.test(t)) {
    return 'build_request';
  }

  return 'unknown';
}

export async function executeIntent({ db, userId, timezone, intent, text, routeToBuilder, operatorKey }) {
  if (!db) throw new Error('executeIntent requires a db pool');
  if (!userId) throw new Error('executeIntent requires a userId');

  const tz = timezone || 'America/New_York';

  switch (intent) {
    case 'smos': {
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'workflow',
        message: `Social Media OS relocation content workflow:\n\n1. Brief — coach a 15-minute focused brief to extract the core relocation story.\n2. Extract — pull the key angles, objections, and moments that matter.\n3. Generate — create a content brief plus 5–10 posts, titles, and hooks.\n4. Approve — review, edit, or reject each piece in the approval queue.\n5. Export — approved items go to the content calendar and a publish-ready export.\n6. Record — the film studio records clean takes with a teleprompter.\n7. Publish — final assets are published to your channels with captions and tags.\n\nPaid content packs are unlocked after checkout.`,
      };
    }

    case 'smos_purchase': {
      try {
        const baseUrl = resolvePublicBaseUrl(
          process.env.SMOS_BASE_URL,
          process.env.PUBLIC_BASE_URL,
          process.env.BASE_URL,
          process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
        ) || `http://localhost:${APP_PORT}`;
        const smos = createMarketingOSFactory({ pool: db, logger });
        const checkout = await smos.createContentPackCheckout({ ownerId: userId, baseUrl });
        return {
          ok: true,
          chair_channel: 'life_admin',
          execution_kind: 'command',
          status: 'CHECKOUT_CREATED',
          transport: 'stripe_checkout',
          message: `Social Media OS Content Pack — $${(checkout.amountCents / 100).toFixed(2)}\nCheckout: ${checkout.checkoutUrl}\nContent pack id: ${checkout.contentPackId}`,
        };
      } catch (e) {
        return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: `Could not create checkout: ${e.message}` };
      }
    }

    case 'display': {
      const status = await fetchBuilderStatus();
      const pointB = await fetchPointB();
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: status.ok ? 'DISPLAYED' : 'FAIL',
        message: status.ok
          ? `Current focus: ${pointB}\n\n${status.message}`
          : status.message,
      };
    }

    case 'commitment_query': {
      const rows = await getCommitments(db, userId);
      if (!rows || rows.length === 0) {
        return { ok: true, chair_channel: 'life_admin', execution_kind: 'command', message: 'You have no upcoming commitments on file.' };
      }
      const list = rows
        .filter((r) => r.datetime)
        .slice(0, 5)
        .map((r) => `• ${r.title} — ${new Date(r.datetime).toLocaleString('en-US', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' })}`)
        .join('\n');
      return { ok: true, chair_channel: 'life_admin', execution_kind: 'command', message: `Upcoming commitments:\n${list}` };
    }

    case 'commitment': {
      try {
        const row = await captureCommitment(db, text, { userId, timezone: tz });
        const time = new Date(row.datetime).toLocaleString('en-US', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' });
        return {
          ok: true,
          chair_channel: 'life_admin',
          execution_kind: 'command',
          status: 'CAPTURED',
          transport: 'commitments_table',
          file: 'services/lifeos-commitment-service.js',
          commit: 'n/a',
          message: `Got it. Commitment captured:\n• ${row.title}\n• ${time}\nCalendar event requested: ${row.calendar_event_requested ? 'yes' : 'no'}`,
        };
      } catch (e) {
        return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: `I couldn't parse that as a commitment. Try: "dentist appointment at 2pm next Tuesday"` };
      }
    }

    case 'note': {
      const noteText = text.replace(/^(?:take a note|note|remember|remind me|make a note|jot down|capture):?\s*/i, '').trim();
      const note = await captureNote(db, noteText, { userId, source: 'chat' });
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: 'SAVED',
        transport: 'lifeos_notes_table',
        file: 'services/lifeos-note-capture-service.js',
        commit: 'n/a',
        message: `Note saved. Summary: ${note.summary}${note.tags?.length ? ` (tags: ${note.tags.join(', ')})` : ''}`,
      };
    }

    case 'check_in': {
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        message: 'Adam, what have you worked on for the last 15 minutes?',
      };
    }

    case 'check_in_response': {
      const answer = String(text || '').includes('?')
        ? String(text).slice(String(text).lastIndexOf('?') + 1).trim()
        : String(text || '');
      const cleanAnswer = answer
        .replace(/^(?:check[\s-]?in|daily check|what.*worked on|status update|how.*day)[\s:.-]*/i, '')
        .replace(/^i(?:'m| am)\s*/i, '')
        .trim();
      const entryText = cleanAnswer || answer;
      const entry = await addCheckinEntry(db, userId, entryText, { minutesAgo: 15, source: 'chat-check-in' });
      const { summary } = await getTodaySummary(db, userId);
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: 'LOGGED',
        transport: 'checkins_table',
        file: 'services/lifeos-daily-checkin-service.js',
        commit: 'n/a',
        message: `Check-in recorded at ${entry.created_at}:\n• ${entry.entry_text}\n\n${summary}`,
      };
    }

    case 'build_request': {
      const task = text.replace(/^\s*(?:do|fix|execute|run):\s*/i, '').trim();
      if (!task) {
        return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: 'I could not understand the build order.' };
      }
      if (typeof routeToBuilder === 'function' && operatorKey) {
        try {
          const result = await routeToBuilder(task, operatorKey, { confirmIntent: true });
          const build = result || {};
          const sha = build.sha || build.commit_sha || null;
          const committed = build.ok === true && (build.committed === true || Boolean(sha));
          const passFail = committed ? 'PASS' : 'FAIL';
          const commandTruth = committed ? 'COMMITTED' : 'NO_COMMAND_RAN';
          if (committed) {
            return {
              ok: true,
              chair_channel: 'life_admin',
              execution_kind: 'command',
              status: 'COMMITTED',
              transport: build.transport || 'COMMIT_ONLY_NOT_LIVE',
              file: build.target_file || null,
              commit: sha,
              message: `Done — that change committed${sha ? ` (${String(sha).slice(0, 12)})` : ''}${build.target_file ? ` to ${build.target_file}` : ''}. Command: ${commandTruth}. Pass/Fail: ${passFail}. Commit: ${sha || 'unknown'}. Transport: ${build.transport || 'COMMIT_ONLY_NOT_LIVE'}.`,
            };
          }
          const blocker = build.first_blocker || build.blocker || build.error || 'build did not commit';
          return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: `That build did not land: ${blocker}. Nothing was committed.` };
        } catch (error) {
          return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: `Build call failed: ${error.message}. Nothing was committed.` };
        }
      }
      return await routeBuildRequest(text);
    }

    default:
      return { ok: true, chair_channel: 'life_admin', execution_kind: 'counsel', message: null };
  }
}

export function formatReply(result) {
  if (!result) return 'I did not understand that.';
  if (result.message) return result.message;
  if (result.status) {
    return [
      `Status: ${result.status}`,
      `Transport: ${result.transport || 'n/a'}`,
      `File: ${result.file || 'n/a'}`,
      `Commit: ${result.commit || 'n/a'}`,
    ].join('\n');
  }
  return 'Done.';
}
