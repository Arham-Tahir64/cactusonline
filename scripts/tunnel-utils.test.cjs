const assert = require('node:assert/strict');
const test = require('node:test');
const { extractQuickTunnelUrl, websocketUrl } = require('./tunnel-utils.cjs');

test('extracts a Cloudflare quick-tunnel URL from mixed log output', () => {
  assert.equal(
    extractQuickTunnelUrl('INF Your quick Tunnel has been created! Visit https://quiet-cactus.trycloudflare.com'),
    'https://quiet-cactus.trycloudflare.com',
  );
  assert.equal(extractQuickTunnelUrl('waiting for connector'), undefined);
});

test('converts the friend link to a secure WebSocket endpoint', () => {
  assert.equal(websocketUrl('https://quiet-cactus.trycloudflare.com/'), 'wss://quiet-cactus.trycloudflare.com');
});
