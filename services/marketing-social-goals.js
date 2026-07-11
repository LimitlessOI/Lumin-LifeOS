// SYNOPSIS: https://github.com/openai/ssot/blob/main/docs/products/marketingos/PRODUCT_HOME.md

export const SOCIAL_PLATFORMS = ['instagram', 'linkedin', 'x', 'facebook'];

const PLATFORM_META = {
  instagram: {
    expectSiteHost: 'instagram.com',
    startUrl: 'https://www.instagram.com/',
    mustContain: ['Create new post', 'Share']
  },
  linkedin: {
    expectSiteHost: 'linkedin.com',
    startUrl: 'https://www.linkedin.com/feed/',
    mustContain: ['Create a post', 'Post']
  },
  x: {
    expectSiteHost: 'x.com',
    startUrl: 'https://x.com/compose/post',
    mustContain: ['Post', 'What is happening?!']
  },
  facebook: {
    expectSiteHost: 'facebook.com',
    startUrl: 'https://www.facebook.com/',
    mustContain: ['Create post', 'Post']
  }
};

function quoteVerbatim(text) {
  return JSON.stringify(String(text));
}

export function buildPublishGoal({ platform, contentText }) {
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${String(platform)}. Expected one of: ${SOCIAL_PLATFORMS.join(', ')}`);
  }

  const meta = PLATFORM_META[platform];
  if (!meta) {
    throw new Error(`Missing platform metadata for: ${platform}`);
  }

  const quotedContent = quoteVerbatim(contentText);

  return {
    goalKey: 'publish_post',
    goal:
      `Open ${platform} and create a new post using this text EXACTLY as written: ${quotedContent}. ` +
      `Do not alter, shorten, rewrite, paraphrase, embellish, or add anything to the wording. ` +
      `Publish it as-is.`,
    startUrl: meta.startUrl,
    expectSiteHost: meta.expectSiteHost,
    mustContain: meta.mustContain
  };
}

export default buildPublishGoal;