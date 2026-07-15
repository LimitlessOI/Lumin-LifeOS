/**
 * SYNOPSIS: Exports initializeChannelMemory — services/channelMemory.js.
 */
let channelMemory = {};
let brandProfile = {};
let seoData = {};

export function initializeChannelMemory(memory = {}, profile = {}, seo = {}) {
  channelMemory = memory;
  brandProfile = profile;
  seoData = seo;
}

export { channelMemory, brandProfile, seoData };
