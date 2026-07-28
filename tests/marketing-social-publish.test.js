/**
 * SYNOPSIS: js — tests/marketing-social-publish.test.js.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  saveConnection,
  getConnection,
  listConnections,
} from '../services/marketing-social-connections.js';
import { publishApprovedPiece } from '../services/marketing-publisher.js';
import { isSupportedSocialPlatform } from '../services/marketing-social-connect-session.js';
import { SOCIAL_PLATFORMS } from '../services/marketing-social-goals.js';

test('social platforms list is fixed', () => {
  assert.deepEqual(SOCIAL_PLATFORMS, ['instagram', 'linkedin', 'x', 'facebook']);
  assert.equal(isSupportedSocialPlatform('instagram'), true);
  assert.equal(isSupportedSocialPlatform('youtube'), false);
});

test('saveConnection uses browser_session auth_mode', async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return {
        rows: [{
          id: 'c1',
          owner_id: params[0],
          platform: params[1],
          auth_mode: params[2],
          status: params[4],
          connected_at: new Date().toISOString(),
          last_verified_at: null,
          last_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      };
    },
  };

  const result = await saveConnection(pool, {
    ownerId: 'adam',
    platform: 'linkedin',
    sessionState: { cookies: [{ name: 'a', value: 'b', domain: '.linkedin.com' }] },
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].params[2], 'browser_session');
  assert.equal(result.connection.auth_mode, 'browser_session');
  assert.equal(result.connection.session_state_encrypted, undefined);
});

test('publishApprovedPiece unwraps getConnection and gates correctly', async () => {
  const original = process.env.LIVE_SOCIAL_PUBLISH_ENABLED;
  delete process.env.LIVE_SOCIAL_PUBLISH_ENABLED;

  const pool = {
    async query(sql, params) {
      if (String(sql).includes('FROM marketing_social_connections') && String(sql).includes('platform = $2')) {
        return {
          rows: [{
            id: 'c1',
            owner_id: 'adam',
            platform: 'x',
            auth_mode: 'browser_session',
            session_state_encrypted: null,
            status: 'connected',
            connected_at: new Date().toISOString(),
            last_verified_at: null,
            last_error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    },
  };

  // Stub encrypt path unused; getConnection will try decrypt null → sessionState null
  const draft = await publishApprovedPiece({
    pool,
    piece: { id: 'p1', owner_id: 'adam', platform: 'x', status: 'draft', content_text: 'hi' },
    session: null,
  });
  assert.equal(draft.ok, false);
  assert.equal(draft.reason, 'not_approved');

  const ready = await publishApprovedPiece({
    pool,
    piece: { id: 'p1', owner_id: 'adam', platform: 'x', status: 'approved', content_text: 'hi' },
    session: null,
  });
  assert.equal(ready.ok, false);
  assert.equal(ready.reason, 'live_publish_disabled');
  assert.equal(ready.ready, true);
  assert.equal(ready.dryRun, true);

  if (original === undefined) delete process.env.LIVE_SOCIAL_PUBLISH_ENABLED;
  else process.env.LIVE_SOCIAL_PUBLISH_ENABLED = original;
});

test('listConnections never returns ciphertext', async () => {
  const pool = {
    async query() {
      return {
        rows: [{
          platform: 'instagram',
          status: 'connected',
          connected_at: '2026-07-24T00:00:00.000Z',
          last_verified_at: null,
          last_error: null,
        }],
      };
    },
  };
  const listed = await listConnections(pool, { ownerId: 'adam' });
  assert.equal(listed.ok, true);
  assert.equal(listed.connections[0].platform, 'instagram');
  assert.equal(listed.connections[0].session_state_encrypted, undefined);
});

test('getConnection returns wrapped shape', async () => {
  const pool = {
    async query() {
      return { rows: [] };
    },
  };
  const got = await getConnection(pool, { ownerId: 'adam', platform: 'facebook' });
  assert.equal(got.ok, true);
  assert.equal(got.connection, null);
});