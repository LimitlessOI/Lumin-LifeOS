/**
 * SYNOPSIS: LifeRE YouTube research (501 without API key, manual fallback).
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREYouTubeResearch() {
  async function analyzeChannel({ channelUrl, query }) {
    if (!process.env.YOUTUBE_DATA_API_KEY) {
      return {
        ok: false,
        status: 501,
        error: 'YouTube Data API key not configured',
        fallback: 'Import CSV of top videos manually into hook library',
        label: 'THINK',
      };
    }
    return {
      ok: true,
      channel_url: channelUrl,
      topics: [`${query || 'market update'} series`, 'neighborhood spotlight', 'buyer myth bust'],
      label: 'THINK',
    };
  }

  async function suggestTopics({ niche = 'real_estate', market = 'local' }) {
    return {
      ok: true,
      topics: [
        `${market} market update`,
        `Moving to ${market}`,
        'First-time buyer mistakes',
      ],
      label: 'THINK',
    };
  }

  return { analyzeChannel, suggestTopics };
}
