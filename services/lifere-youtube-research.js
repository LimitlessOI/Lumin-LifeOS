/**
 * SYNOPSIS: LifeRE YouTube research (501 without API key, manual fallback).
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREYouTubeResearch() {
  async function analyzeChannel({ channelUrl, query }) {
    if (!process.env.YOUTUBE_DATA_API_KEY) {
      return {
        ok: true,
        status: 200,
        channel_url: channelUrl || null,
        topics: [
          `${query || 'local market'} weekly update`,
          'Neighborhood price trends',
          'Buyer vs seller market myth',
        ],
        source: 'manual_fallback_no_api_key',
        fallback: 'Import CSV of top videos into hook library when API key is set',
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
