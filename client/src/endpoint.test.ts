import { describe, expect, it } from 'vitest';
import { resolveEndpoint } from './endpoint';

describe('resolveEndpoint', () => {
  it('uses and normalizes an explicit WebSocket endpoint', () => {
    expect(resolveEndpoint({ protocol: 'cactus:', host: 'app' }, ' wss://game.example.test/socket/ ', false)).toBe(
      'wss://game.example.test/socket',
    );
  });

  it('rejects malformed, non-WebSocket, and credential-bearing overrides', () => {
    expect(() => resolveEndpoint({ protocol: 'https:', host: 'web.test' }, 'not-a-url', false)).toThrow(
      /valid ws/,
    );
    expect(() => resolveEndpoint({ protocol: 'https:', host: 'web.test' }, 'https://game.test', false)).toThrow(
      /must begin with ws/,
    );
    expect(() =>
      resolveEndpoint({ protocol: 'https:', host: 'web.test' }, 'wss://user:secret@game.test', false),
    ).toThrow(/credentials/);
  });

  it('uses the local server during Vite development', () => {
    expect(resolveEndpoint({ protocol: 'http:', host: 'localhost:5173' }, undefined, true)).toBe(
      'ws://localhost:2567',
    );
  });

  it('derives secure same-origin WebSockets for an HTTPS browser deployment', () => {
    expect(resolveEndpoint({ protocol: 'https:', host: 'cactus.example.test' }, undefined, false)).toBe(
      'wss://cactus.example.test',
    );
  });

  it('keeps a same-origin HTTP browser build interoperable with a local server', () => {
    expect(resolveEndpoint({ protocol: 'http:', host: 'localhost:2567' }, undefined, false)).toBe(
      'ws://localhost:2567',
    );
  });

  it('requires an explicit build-time endpoint for the application protocol', () => {
    expect(() => resolveEndpoint({ protocol: 'cactus:', host: 'app' }, undefined, false)).toThrow(
      /secure VITE_COLYSEUS_URL/,
    );
  });
});
