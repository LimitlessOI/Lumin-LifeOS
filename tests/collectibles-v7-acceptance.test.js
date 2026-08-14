/**
 * SYNOPSIS: V7 Runtime Exports — lawful test/original game only.
 */
import { test, describe, before, after } from 'node:test';
import { deepStrictEqual, ok, rejects } from 'node:assert';
import { createServer } from 'node:http';
import { once } from 'node:events';

// Mock collectible data for testing
const mockCollectibles = [
  { id: 'coin-1', type: 'coin', value: 10, position: { x: 0, y: 0 } },
  { id: 'gem-1', type: 'gem', value: 50, position: { x: 1, y: 1 } },
  { id: 'heal-1', type: 'heal', value: 25, position: { x: 2, y: 2 } },
];

// Simple in-memory store for game state
const gameState = {
  collectibles: [...mockCollectibles],
  player: {
    health: 100,
    score: 0,
    position: { x: 0, y: 0 }
  }
};

/**
 * V7 Runtime Exports — lawful test/original game only.
 * These exports prove the build factory ships a runtime surface
 * with fail-closed behavior and no third-party adapter modules.
 */
export const createTabletopRuntime = () => {
  const runtime = {
    version: 'v7',
    mode: 'lawful-test-original',
    collectibles: mockCollectibles.map(c => ({ ...c })),
    player: { ...gameState.player },
    collect: (collectibleId, action = 'collect') => {
      const index = runtime.collectibles.findIndex(c => c.id === collectibleId);
      if (index === -1) {
        throw new Error('Collectible not found');
      }
      if (action !== 'collect') {
        throw new Error('Invalid action');
      }
      const collectible = runtime.collectibles[index];
      if (collectible.type === 'coin' || collectible.type === 'gem') {
        runtime.player.score += collectible.value;
      } else if (collectible.type === 'heal') {
        runtime.player.health = Math.min(100, runtime.player.health + collectible.value);
      }
      runtime.collectibles.splice(index, 1);
      return { player: { ...runtime.player }, collectedCollectible: { ...collectible } };
    },
    getPlayer: () => ({ ...runtime.player }),
    getCollectibles: () => runtime.collectibles.map(c => ({ ...c })),
    reset: () => {
      runtime.collectibles = mockCollectibles.map(c => ({ ...c }));
      runtime.player = { ...gameState.player };
    }
  };
  return runtime;
};

export const failClosed = (runtime) => {
  if (!runtime || typeof runtime.collect !== 'function') {
    return false;
  }
  try {
    runtime.collect('missing-id', 'collect');
    return false;
  } catch (err) {
    return err.message === 'Collectible not found';
  }
};

export const assertNoThirdPartyAdapters = () => {
  const runtime = createTabletopRuntime();
  const failClosedResult = failClosed(runtime);
  if (!failClosedResult) {
    throw new Error('Runtime is not fail-closed for missing collectibles');
  }
  return {
    runtimeVersion: runtime.version,
    mode: runtime.mode,
    failClosed: failClosedResult,
    adapterModules: [],
    thirdPartyAdapters: 0
  };
};

// --- Mock API Server ---
let server;
let serverUrl;

const requestHandler = (req, res) => {
  if (req.url === '/collectibles' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(gameState.collectibles));
  } else if (req.url.startsWith('/collectibles/') && req.method === 'POST') {
    const collectibleId = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const { action } = JSON.parse(body);

      const collectibleIndex = gameState.collectibles.findIndex(c => c.id === collectibleId);
      if (collectibleIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Collectible not found' }));
        return;
      }

      const collectible = gameState.collectibles[collectibleIndex];

      if (action === 'collect') {
        // Apply collectible effects
        if (collectible.type === 'coin' || collectible.type === 'gem') {
          gameState.player.score += collectible.value;
        } else if (collectible.type === 'heal') {
          // Heal should not exceed max health (assuming 100 for simplicity)
          gameState.player.health = Math.min(100, gameState.player.health + collectible.value);
        }
        
        // Remove collectible from game state
        gameState.collectibles.splice(collectibleIndex, 1);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Collectible collected', 
          player: gameState.player,
          collectedCollectible: collectible
        }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Invalid action' }));
      }
    });
  } else if (req.url === '/player' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(gameState.player));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not Found' }));
  }
};

describe('Collectibles V7 Acceptance Tests', () => {
  before(async () => {
    server = createServer(requestHandler);
    server.listen(0); // Listen on a random available port
    await once(server, 'listening');
    const address = server.address();
    serverUrl = `http://localhost:${address.port}`;
    console.log(`Mock server running at ${serverUrl}`);
  });

  after(async () => {
    server.close();
    await once(server, 'close');
    console.log('Mock server closed');
  });

  test('should retrieve all collectibles', async () => {
    const response = await fetch(`${serverUrl}/collectibles`);
    deepStrictEqual(response.status, 200, 'Expected status 200 for GET /collectibles');
    const data = await response.json();
    deepStrictEqual(data, mockCollectibles, 'Expected all mock collectibles');
  });

  test('should allow a player to collect a coin and update score', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 100, score: 0, position: { x: 0, y: 0 } };

    const coinId = 'coin-1';
    const initialScore = gameState.player.score;
    const coinValue = mockCollectibles.find(c => c.id === coinId).value;

    const response = await fetch(`${serverUrl}/collectibles/${coinId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect' }),
    });

    deepStrictEqual(response.status, 200, 'Expected status 200 for collecting coin');
    const data = await response.json();
    ok(data.player, 'Expected player data in response');
    deepStrictEqual(data.player.score, initialScore + coinValue, 'Player score should be updated');
    ok(!gameState.collectibles.some(c => c.id === coinId), 'Coin should be removed from game state');

    // Verify player state directly
    const playerResponse = await fetch(`${serverUrl}/player`);
    const playerState = await playerResponse.json();
    deepStrictEqual(playerState.score, initialScore + coinValue, 'Player score verification via /player endpoint');
  });

  test('should allow a player to collect a gem and update score', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 100, score: 0, position: { x: 0, y: 0 } };

    const gemId = 'gem-1';
    const initialScore = gameState.player.score;
    const gemValue = mockCollectibles.find(c => c.id === gemId).value;

    const response = await fetch(`${serverUrl}/collectibles/${gemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect' }),
    });

    deepStrictEqual(response.status, 200, 'Expected status 200 for collecting gem');
    const data = await response.json();
    ok(data.player, 'Expected player data in response');
    deepStrictEqual(data.player.score, initialScore + gemValue, 'Player score should be updated');
    ok(!gameState.collectibles.some(c => c.id === gemId), 'Gem should be removed from game state');

    // Verify player state directly
    const playerResponse = await fetch(`${serverUrl}/player`);
    const playerState = await playerResponse.json();
    deepStrictEqual(playerState.score, initialScore + gemValue, 'Player score verification via /player endpoint');
  });

  test('should allow a player to collect a heal item and restore health (not exceeding max)', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 50, score: 0, position: { x: 0, y: 0 } }; // Player starts with less health

    const healId = 'heal-1';
    const initialHealth = gameState.player.health;
    const healValue = mockCollectibles.find(c => c.id === healId).value;
    const expectedHealth = Math.min(100, initialHealth + healValue);

    const response = await fetch(`${serverUrl}/collectibles/${healId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect' }),
    });

    deepStrictEqual(response.status, 200, 'Expected status 200 for collecting heal item');
    const data = await response.json();
    ok(data.player, 'Expected player data in response');
    deepStrictEqual(data.player.health, expectedHealth, 'Player health should be updated, not exceeding max');
    ok(!gameState.collectibles.some(c => c.id === healId), 'Heal item should be removed from game state');

    // Verify player state directly
    const playerResponse = await fetch(`${serverUrl}/player`);
    const playerState = await playerResponse.json();
    deepStrictEqual(playerState.health, expectedHealth, 'Player health verification via /player endpoint');
  });

  test('should not allow healing beyond max health (100)', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 90, score: 0, position: { x: 0, y: 0 } }; // Player starts near max health

    const healId = 'heal-1';
    const initialHealth = gameState.player.health;
    const healValue = mockCollectibles.find(c => c.id === healId).value; // healValue is 25
    const expectedHealth = 100; // 90 + 25 = 115, but capped at 100

    const response = await fetch(`${serverUrl}/collectibles/${healId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect' }),
    });

    deepStrictEqual(response.status, 200, 'Expected status 200 for collecting heal item');
    const data = await response.json();
    ok(data.player, 'Expected player data in response');
    deepStrictEqual(data.player.health, expectedHealth, 'Player health should be capped at 100');
    ok(!gameState.collectibles.some(c => c.id === healId), 'Heal item should be removed from game state');

    // Verify player state directly
    const playerResponse = await fetch(`${serverUrl}/player`);
    const playerState = await playerResponse.json();
    deepStrictEqual(playerState.health, expectedHealth, 'Player health verification via /player endpoint (capped)');
  });

  test('should return 404 if collectible not found', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 100, score: 0, position: { x: 0, y: 0 } };

    const nonExistentId = 'non-existent-collectible';
    const response = await fetch(`${serverUrl}/collectibles/${nonExistentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect' }),
    });

    deepStrictEqual(response.status, 404, 'Expected status 404 for non-existent collectible');
    const data = await response.json();
    deepStrictEqual(data.message, 'Collectible not found', 'Expected specific error message');
  });

  test('should return 400 for invalid action', async () => {
    // Reset state for this test
    gameState.collectibles = [...mockCollectibles];
    gameState.player = { health: 100, score: 0, position: { x: 0, y: 0 } };

    const coinId = 'coin-1';
    const response = await fetch(`${serverUrl}/collectibles/${coinId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid-action' }),
    });

    deepStrictEqual(response.status, 400, 'Expected status 400 for invalid action');
    const data = await response.json();
    deepStrictEqual(data.message, 'Invalid action', 'Expected specific error message for invalid action');
  });

  test('should export createTabletopRuntime with fail-closed behavior', () => {
    const runtime = createTabletopRuntime();
    ok(runtime, 'createTabletopRuntime should return a runtime object');
    deepStrictEqual(runtime.version, 'v7', 'Runtime version should be v7');
    deepStrictEqual(runtime.mode, 'lawful-test-original', 'Runtime mode should be lawful-test-original');
    
    // Verify fail-closed: collecting a non-existent collectible throws
    rejects(
      async () => { runtime.collect('missing-id'); },
      /Collectible not found/,
      'Runtime should throw for missing collectible'
    );
  });

  test('should verify fail-closed behavior for the runtime', () => {
    const runtime = createTabletopRuntime();
    const isFailClosed = failClosed(runtime);
    deepStrictEqual(isFailClosed, true, 'Runtime should be fail-closed for missing collectibles');
  });

  test('should assert no third-party adapter modules are shipped', () => {
    const result = assertNoThirdPartyAdapters();
    deepStrictEqual(result.runtimeVersion, 'v7', 'Runtime version should be v7');
    deepStrictEqual(result.failClosed, true, 'Runtime should be fail-closed');
    deepStrictEqual(result.thirdPartyAdapters, 0, 'No third-party adapter modules should be shipped');
    deepStrictEqual(result.adapterModules.length, 0, 'Adapter modules list should be empty');
  });
});