/**
 * response-cache.js — extracted from server.js
 * In-memory response cache helpers and text compression utilities.
 *
 * Note: council-service.js contains its own internal copies of these
 * for DB-backed caching. This module provides the in-memory Map cache.
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// In-memory cache state (module-level singleton)
// ---------------------------------------------------------------------------
const responseCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// hashPrompt
// ---------------------------------------------------------------------------
export function hashPrompt(prompt) {
  // Create semantic hash (simple but effective)
  const normalized = prompt.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

// ---------------------------------------------------------------------------
// getCachedResponse
// ---------------------------------------------------------------------------
export async function getCachedResponse(prompt, member, compressionMetrics) {
  const key = `${member}:${hashPrompt(prompt)}`;
  const cached = responseCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    if (compressionMetrics) {
      compressionMetrics.cache_hits = (compressionMetrics.cache_hits || 0) + 1;
    }
    return cached.response;
  }
  // Track cache miss
  if (compressionMetrics) {
    compressionMetrics.cache_misses = (compressionMetrics.cache_misses || 0) + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// cacheResponse
// ---------------------------------------------------------------------------
export function cacheResponse(prompt, member, response) {
  const key = `${member}:${hashPrompt(prompt)}`;
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    prompt: prompt.substring(0, 100), // Store snippet for debugging
  });
  // Limit cache size
  if (responseCache.size > 1000) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// ---------------------------------------------------------------------------
// advancedCompress
// ---------------------------------------------------------------------------
export function advancedCompress(text) {
  try {
    // Remove redundant whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();

    // Replace common phrases with tokens
    const replacements = {
      'You are': 'Ua',
      'inside the LifeOS AI Council': 'iLAC',
      'This is a LIVE SYSTEM': 'TLS',
      'running on Railway': 'rR',
      'Execution queue for tasks': 'EQ',
      'Self-programming endpoint': 'SPE',
      'Income drones': 'ID',
      'ROI tracking': 'ROI',
      'blind-spot detection': 'BSD',
      'Database on Neon PostgreSQL': 'DNPG',
      'Optional Stripe integration': 'OSI',
    };

    for (const [full, short] of Object.entries(replacements)) {
      compressed = compressed.replace(new RegExp(full, 'gi'), short);
    }

    // Base64 encode
    const encoded = Buffer.from(compressed).toString('base64');
    return { compressed: encoded, ratio: text.length / encoded.length, method: 'advanced' };
  } catch (error) {
    return { compressed: text, ratio: 1, method: 'none' };
  }
}

// ---------------------------------------------------------------------------
// advancedDecompress
// ---------------------------------------------------------------------------
export function advancedDecompress(compressed, method) {
  if (method !== 'advanced') return compressed;
  try {
    const decoded = Buffer.from(compressed, 'base64').toString('utf-8');
    // Reverse replacements
    const replacements = {
      'Ua': 'You are',
      'iLAC': 'inside the LifeOS AI Council',
      'TLS': 'This is a LIVE SYSTEM',
      'rR': 'running on Railway',
      'EQ': 'Execution queue for tasks',
      'SPE': 'Self-programming endpoint',
      'ID': 'Income drones',
      'ROI': 'ROI tracking',
      'BSD': 'blind-spot detection',
      'DNPG': 'Database on Neon PostgreSQL',
      'OSI': 'Optional Stripe integration',
    };
    let decompressed = decoded;
    for (const [short, full] of Object.entries(replacements)) {
      decompressed = decompressed.replace(new RegExp(short, 'g'), full);
    }
    return decompressed;
  } catch (error) {
    return compressed;
  }
}
