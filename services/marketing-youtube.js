// SYNOPSIS: MarketingOS YouTube OAuth service
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const YOUTUBE_PROVIDER = 'youtube_channel';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

function buildRedirectUri() {
  const base = process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080';
  return `${base.replace(/\/$/, '')}/api/v1/marketing/youtube/callback`;
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = buildRedirectUri();
  return { clientId, clientSecret, redirectUri };
}

function createClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

async function upsertIntegration(pool, ownerId, tokens) {
  const tokenJson = JSON.stringify(tokens ?? {});
  await pool.query(
    `
      INSERT INTO user_integrations (user_id, provider, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, provider)
      DO UPDATE SET updated_at = NOW()
    `,
    [ownerId, YOUTUBE_PROVIDER]
  );
  await pool.query(
    `
      UPDATE user_integrations
      SET updated_at = NOW()
      WHERE user_id = $1 AND provider = $2
    `,
    [ownerId, YOUTUBE_PROVIDER]
  );
  return tokenJson;
}

async function loadIntegrationRow(pool, ownerId) {
  const result = await pool.query(
    `
      SELECT id, user_id, provider, updated_at
      FROM user_integrations
      WHERE user_id = $1 AND provider = $2
      LIMIT 1
    `,
    [ownerId, YOUTUBE_PROVIDER]
  );
  return result.rows[0] || null;
}

async function getStoredTokens(pool, ownerId) {
  const row = await loadIntegrationRow(pool, ownerId);
  if (!row) return null;
  return row.tokens || row.token_data || row.auth_data || row.data || null;
}

export function createYouTubeService(pool) {
  async function getAuthUrl() {
    const { clientId } = getOAuthConfig();
    if (!clientId) {
      return { error: 'GOOGLE_CLIENT_ID is not set' };
    }

    const auth = createClient();
    const url = auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: YOUTUBE_SCOPES,
    });

    return { url };
  }

  async function handleCallback({ code, ownerId }) {
    const { clientId } = getOAuthConfig();
    if (!clientId) {
      return { error: 'GOOGLE_CLIENT_ID is not set' };
    }
    if (!code) {
      return { error: 'Missing authorization code' };
    }
    if (!ownerId) {
      return { error: 'Missing ownerId' };
    }

    const auth = createClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    await pool.query(
      `
        INSERT INTO user_integrations (user_id, provider, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, provider)
        DO UPDATE SET updated_at = NOW()
      `,
      [ownerId, YOUTUBE_PROVIDER]
    );

    return { connected: true, tokens };
  }

  async function getAuthedClient(ownerId) {
    const { clientId } = getOAuthConfig();
    if (!clientId) {
      return { error: 'GOOGLE_CLIENT_ID is not set' };
    }
    if (!ownerId) {
      return { error: 'Missing ownerId' };
    }

    const tokens = await getStoredTokens(pool, ownerId);
    if (!tokens) {
      return { error: 'YouTube is not connected' };
    }

    const auth = createClient();
    auth.setCredentials(tokens);

    auth.on('tokens', async (newTokens) => {
      try {
        const merged = {
          ...(tokens || {}),
          ...(newTokens || {}),
        };
        await pool.query(
          `
            INSERT INTO user_integrations (user_id, provider, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id, provider)
            DO UPDATE SET updated_at = NOW()
          `,
          [ownerId, YOUTUBE_PROVIDER]
        );
        auth.setCredentials(merged);
      } catch {}
    });

    return { auth };
  }

  async function getStatus(ownerId) {
    if (!ownerId) {
      return { connected: false, connectedSince: null };
    }

    const result = await pool.query(
      `
        SELECT updated_at
        FROM user_integrations
        WHERE user_id = $1 AND provider = $2
        LIMIT 1
      `,
      [ownerId, YOUTUBE_PROVIDER]
    );

    const row = result.rows[0];
    return {
      connected: !!row,
      connectedSince: row ? row.updated_at : null,
    };
  }

  return {
    getAuthUrl,
    handleCallback,
    getAuthedClient,
    getStatus,
  };
}

export default createYouTubeService;