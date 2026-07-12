/**
 * SYNOPSIS: Exports createCommunityValueDrafter — value-first community reply drafts.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
export function createCommunityValueDrafter({ callCouncilMember } = {}) {
  const allowedPlatforms = new Set([
    'reddit',
    'facebook_group',
    'linkedin',
    'x',
    'instagram_comment',
  ]);

  const platformHints = {
    reddit: 'write like a helpful subreddit regular: practical, concise, no salesy tone',
    facebook_group: 'write like a thoughtful group member: warm, specific, and community-first',
    linkedin: 'write like a professional peer: clear, credible, and helpful',
    x: 'write like a short, useful reply: direct, human, and punchy',
    instagram_comment: 'write like a friendly comment: brief, encouraging, and natural',
  };

  function normalizeText(value) {
    return String(value ?? '').trim();
  }

  function buildDeterministicDraft({ platform, threadTitle, threadBody, productAngle, tone }) {
    const title = normalizeText(threadTitle);
    const body = normalizeText(threadBody);
    const angle = normalizeText(productAngle);
    const toneText = normalizeText(tone);

    const answerSeed =
      title ||
      body.split(/\n+/).find(Boolean) ||
      'the question you raised';

    const replyParts = [
      `A practical way to think about ${answerSeed.toLowerCase()} is to start with the smallest next step and make it easy to repeat.`,
      body
        ? `From what you shared, the key issue seems to be: ${body.slice(0, 180)}${body.length > 180 ? '…' : ''}`
        : null,
      `One useful move is to define the outcome you want, then list the 2-3 constraints that matter most before choosing a solution.`,
    ].filter(Boolean);

    if (angle) {
      replyParts.push(
        `If it helps, ${angle} can fit here when it reduces friction and keeps the workflow simple.`
      );
    }

    if (toneText) {
      replyParts.push(`Keeping the tone ${toneText.toLowerCase()} usually helps this land better.`);
    }

    let reply_text = replyParts.join(' ');
    let cta_line = '';
    if (allowedPlatforms.has(platform)) {
      cta_line =
        'If you want, I can share a simple template or adapt this for your exact situation.';
    }

    return { reply_text, cta_line };
  }

  function extractRiskNotes({ platform, threadTitle, threadBody, productAngle }) {
    const notes = [];

    const full = `${threadTitle || ''} ${threadBody || ''} ${productAngle || ''}`.toLowerCase();

    if (/(buy now|sign up|book a demo|click here|limited time|discount|promo|sale)/i.test(full)) {
      notes.push('Avoid promotional phrasing and direct conversion language in the first reply.');
    }

    if (/(customers?|clients?|revenue|revenue growth|results?|roi|case study)/i.test(full)) {
      notes.push('Avoid unverified performance claims, customer claims, or outcome claims.');
    }

    if (/(link|url|http|https|site builder|limitless|lifeos)/i.test(full)) {
      notes.push('Keep any optional product mention soft, optional, and placed after value.');
    }

    if (platform === 'reddit') {
      notes.push('Reddit replies should feel like peer-to-peer help rather than marketing copy.');
    }

    return notes;
  }

  async function draftReply({ platform, threadTitle, threadBody, productAngle, tone } = {}) {
    const safePlatform = normalizeText(platform).toLowerCase();
    const allowed = allowedPlatforms.has(safePlatform) ? safePlatform : 'reddit';

    const risk_notes = extractRiskNotes({
      platform: allowed,
      threadTitle,
      threadBody,
      productAngle,
    });

    const deterministic = buildDeterministicDraft({
      platform: allowed,
      threadTitle,
      threadBody,
      productAngle,
      tone,
    });

    if (typeof callCouncilMember !== 'function') {
      return {
        ok: true,
        reply_text: deterministic.reply_text,
        cta_line: deterministic.cta_line,
        risk_notes,
      };
    }

    const prompt = [
      `Platform: ${allowed}`,
      `Guidance: ${platformHints[allowed]}`,
      `Tone: ${normalizeText(tone) || 'natural, helpful'}`,
      '',
      'Write a community reply that offers help first and keeps any CTA soft and last.',
      'Rules:',
      '- VALUE FIRST: answer the person’s actual question with concrete usable help.',
      '- Never spam.',
      '- Never drop product links as the first move.',
      '- Engage like an ideal neighbor in the community.',
      '- Earn attention, then optionally include a soft CTA to Site Builder / Limitless / LifeOS only if it naturally fits.',
      '- Prefer CTA URL https://limitlesssites.com or SITE_BASE_URL/site-builder.',
      '- No fake stats.',
      '- No hype.',
      '- Never claim paying customers you do not have.',
      '',
      `Thread title: ${normalizeText(threadTitle) || '(none)'}`,
      `Thread body: ${normalizeText(threadBody) || '(none)'}`,
      `Product angle: ${normalizeText(productAngle) || '(none)'}`,
      '',
      'Return plain text with two parts:',
      '1) reply_text',
      '2) cta_line',
      'Keep it concise and practical.',
    ].join('\n');

    try {
      const response = await callCouncilMember('community-replies', prompt, {
        temperature: 0.4,
        maxTokens: 300,
      });

      const text = normalizeText(response);
      if (!text) {
        return {
          ok: true,
          reply_text: deterministic.reply_text,
          cta_line: deterministic.cta_line,
          risk_notes: [...risk_notes, 'AI returned an empty response; used deterministic fallback.'],
        };
      }

      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

      let reply_text = lines[0] || deterministic.reply_text;
      let cta_line = lines.slice(1).join(' ').trim() || deterministic.cta_line;

      if (/^cta[:\s-]/i.test(reply_text) && !/^cta[:\s-]/i.test(cta_line)) {
        const merged = reply_text.replace(/^reply_text[:\s-]*/i, '').trim();
        reply_text = merged || deterministic.reply_text;
      }

      if (!reply_text) reply_text = deterministic.reply_text;
      if (!cta_line) cta_line = deterministic.cta_line;

      return {
        ok: true,
        reply_text,
        cta_line,
        risk_notes,
      };
    } catch (error) {
      return {
        ok: true,
        reply_text: deterministic.reply_text,
        cta_line: deterministic.cta_line,
        risk_notes: [...risk_notes, `AI draft failed; used deterministic fallback (${error?.message || 'unknown error'}).`],
      };
    }
  }

  return { draftReply };
}

export default createCommunityValueDrafter;