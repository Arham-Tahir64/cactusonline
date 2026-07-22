import { describe, expect, it } from 'vitest';
import { formatConnectionError } from './connectionError';

describe('formatConnectionError', () => {
  it('keeps useful error messages', () => {
    expect(formatConnectionError(new Error('Room not found'))).toBe('Room not found');
    expect(formatConnectionError({ message: 'Server rejected the request' })).toBe(
      'Server rejected the request',
    );
  });

  it('turns browser network events into actionable copy', () => {
    expect(formatConnectionError({ type: 'error', loaded: 0, total: 0 })).toMatch(
      /Unable to reach the game server/,
    );
    expect(formatConnectionError('[object ProgressEvent]')).toMatch(/Unable to reach the game server/);
  });
});
