const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  createContentSecurityPolicy,
  isAllowedTopLevelNavigation,
  normalizeDevelopmentRendererUrl,
  normalizeSecureEndpoint,
  resolveRendererRequest,
} = require('../dist/security.js');

test('packaged endpoint accepts and normalizes only secure credential-free URLs', () => {
  assert.equal(normalizeSecureEndpoint(' wss://game.example.test/socket/ '), 'wss://game.example.test/socket');
  assert.throws(() => normalizeSecureEndpoint('ws://game.example.test'), /must use wss/);
  assert.throws(() => normalizeSecureEndpoint('https://game.example.test'), /must use wss/);
  assert.throws(() => normalizeSecureEndpoint('wss://user:secret@game.example.test'), /credentials/);
  assert.throws(() => normalizeSecureEndpoint(undefined), /require a configured/);
});

test('development renderer is restricted to local HTTP origins', () => {
  assert.equal(normalizeDevelopmentRendererUrl(undefined), 'http://localhost:5173');
  assert.equal(normalizeDevelopmentRendererUrl('http://127.0.0.1:4173/'), 'http://127.0.0.1:4173');
  assert.equal(normalizeDevelopmentRendererUrl('http://[::1]:5173'), 'http://[::1]:5173');
  assert.throws(() => normalizeDevelopmentRendererUrl('https://localhost:5173'), /must use http/);
  assert.throws(() => normalizeDevelopmentRendererUrl('http://localhost.evil.test'), /must use http/);
  assert.throws(() => normalizeDevelopmentRendererUrl('https://example.test'), /must use http/);
});

test('CSP permits the configured HTTPS matchmaking and WebSocket origins', () => {
  const policy = createContentSecurityPolicy('wss://game.example.test/socket');
  assert.match(
    policy,
    /connect-src 'self' https:\/\/game\.example\.test wss:\/\/game\.example\.test/,
  );
  assert.doesNotMatch(policy, /https:\/\/untrusted\.example\.test/);
  assert.doesNotMatch(policy, /ws:\/\/localhost/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
});

test('top-level navigation requires the exact application host or development origin', () => {
  assert.equal(isAllowedTopLevelNavigation('cactus://app/index.html'), true);
  assert.equal(isAllowedTopLevelNavigation('cactus://evil/index.html'), false);
  assert.equal(isAllowedTopLevelNavigation('https://example.test'), false);
  assert.equal(
    isAllowedTopLevelNavigation('http://localhost:5173/game', 'http://localhost:5173'),
    true,
  );
  assert.equal(
    isAllowedTopLevelNavigation('http://localhost:5173.evil.test/', 'http://localhost:5173'),
    false,
  );
});

test('application protocol stays inside the renderer root', () => {
  const root = path.resolve('renderer-fixture');
  assert.equal(resolveRendererRequest(root, 'cactus://app/'), path.join(root, 'index.html'));
  assert.equal(resolveRendererRequest(root, 'cactus://app/assets/app.js'), path.join(root, 'assets', 'app.js'));
  assert.equal(resolveRendererRequest(root, 'cactus://other/assets/app.js'), null);
  assert.equal(resolveRendererRequest(root, 'https://app/assets/app.js'), null);
  assert.equal(resolveRendererRequest(root, 'not a URL'), null);
});
