import { describe, expect, it } from 'vitest';
import { ConfigError, DEV_SECRET, loadConfig, resolveSecrets } from '../src/config.ts';

const SECRET = 'x'.repeat(32);

describe('resolveSecrets', () => {
  it('refuses to start without a secret outside development', () => {
    expect(() => resolveSecrets({})).toThrow(ConfigError);
    expect(() => resolveSecrets({ NODE_ENV: 'production' })).toThrow(/POUXIS_SYNC_SECRET/);
  });

  it('falls back to the insecure dev secret in development only', () => {
    expect(resolveSecrets({ NODE_ENV: 'development' })).toEqual({
      secrets: [DEV_SECRET],
      insecure: true,
    });
  });

  it('enforces a minimum length and supports rotation', () => {
    expect(() => resolveSecrets({ POUXIS_SYNC_SECRET: 'short' })).toThrow(/at least 32/);
    const previous = 'y'.repeat(40);
    expect(
      resolveSecrets({ POUXIS_SYNC_SECRET: SECRET, POUXIS_SYNC_SECRET_PREVIOUS: previous }),
    ).toEqual({ secrets: [SECRET, previous], insecure: false });
  });
});

describe('loadConfig', () => {
  it('applies documented defaults', () => {
    const config = loadConfig({ POUXIS_SYNC_SECRET: SECRET });
    expect(config).toMatchObject({
      host: '127.0.0.1',
      port: 8787,
      storage: 'file',
      fsync: 'always',
      maxFrameBytes: 1024 * 1024,
      maxConnectionsPerSpace: 64,
      allowedOrigins: null,
      metricsToken: null,
      logLevel: 'info',
    });
  });

  it('parses origins and overrides', () => {
    const config = loadConfig({
      POUXIS_SYNC_SECRET: SECRET,
      PORT: '9000',
      POUXIS_STORAGE: 'memory',
      POUXIS_ALLOWED_ORIGINS: 'https://app.example, tauri://localhost',
    });
    expect(config.port).toBe(9000);
    expect(config.storage).toBe('memory');
    expect(config.allowedOrigins).toEqual(['https://app.example', 'tauri://localhost']);
    expect(
      loadConfig({ POUXIS_SYNC_SECRET: SECRET, POUXIS_ALLOWED_ORIGINS: '*' }).allowedOrigins,
    ).toBeNull();
  });

  it('lists every invalid variable', () => {
    try {
      loadConfig({ PORT: 'eighty', POUXIS_FSYNC: 'sometimes', POUXIS_MAX_FRAME_BYTES: '10' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const problems = (error as ConfigError).problems.join('\n');
      expect(problems).toMatch(/POUXIS_SYNC_SECRET/);
      expect(problems).toMatch(/PORT/);
      expect(problems).toMatch(/POUXIS_FSYNC/);
      expect(problems).toMatch(/POUXIS_MAX_FRAME_BYTES/);
    }
  });

  it('rejects inconsistent limits', () => {
    expect(() =>
      loadConfig({
        POUXIS_SYNC_SECRET: SECRET,
        POUXIS_MAX_PAYLOAD_BYTES: String(2 * 1024 * 1024),
      }),
    ).toThrow(/POUXIS_MAX_PAYLOAD_BYTES/);
  });
});
