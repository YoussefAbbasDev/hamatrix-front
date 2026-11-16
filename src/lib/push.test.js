import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from './push.js';

describe('urlBase64ToUint8Array', () => {
  it('decodes a plain base64 key', () => {
    expect(Array.from(urlBase64ToUint8Array('AQAB'))).toEqual([1, 0, 1]);
  });

  it('accepts base64url characters and restores padding', () => {
    expect(Array.from(urlBase64ToUint8Array('-_-_'))).toEqual([251, 255, 191]);
  });
});
