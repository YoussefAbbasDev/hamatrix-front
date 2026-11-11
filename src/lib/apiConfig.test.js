import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeApiUrl, assetUrl, API_ORIGIN } from './apiConfig.js';

describe('api config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the same origin when VITE_API_URL is empty', () => {
    expect(normalizeApiUrl('')).toEqual({ origin: '', baseURL: '/api/v1' });
    expect(normalizeApiUrl(undefined)).toEqual({ origin: '', baseURL: '/api/v1' });
  });

  it('adds /api/v1 to a bare origin', () => {
    expect(normalizeApiUrl('http://192.168.1.10:4010')).toEqual({
      origin: 'http://192.168.1.10:4010',
      baseURL: 'http://192.168.1.10:4010/api/v1',
    });
  });

  it('keeps an explicit /api/v1 and ignores trailing slashes', () => {
    expect(normalizeApiUrl('https://api.example.com/api/v1/')).toEqual({
      origin: 'https://api.example.com',
      baseURL: 'https://api.example.com/api/v1',
    });
  });

  it('keeps a sub-path prefix', () => {
    expect(normalizeApiUrl('https://example.com/hamatrix')).toEqual({
      origin: 'https://example.com',
      baseURL: 'https://example.com/hamatrix/api/v1',
    });
  });

  it('falls back to same-origin for malformed values', () => {
    expect(normalizeApiUrl('not a url')).toEqual({ origin: '', baseURL: '/api/v1' });
  });

  it('leaves relative and absolute asset URLs untouched on the same origin', () => {
    // VITE_API_URL is empty in tests, so API_ORIGIN is ''.
    expect(API_ORIGIN).toBe('');
    expect(assetUrl('/uploads/brand/logo.png')).toBe('/uploads/brand/logo.png');
    expect(assetUrl('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    );
    expect(assetUrl('')).toBe('');
  });

  it('prefixes only /uploads when the API is on another origin', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();
    const remote = await import('./apiConfig.js');

    expect(remote.API_ORIGIN).toBe('https://api.example.com');
    expect(remote.assetUrl('/uploads/brand/logo.png')).toBe(
      'https://api.example.com/uploads/brand/logo.png',
    );
    // Bundled assets live in client/public, not on the API host.
    expect(remote.assetUrl('/logo.png')).toBe('/logo.png');
    expect(remote.assetUrl('/icon-192.png')).toBe('/icon-192.png');
    expect(remote.assetUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });
});
