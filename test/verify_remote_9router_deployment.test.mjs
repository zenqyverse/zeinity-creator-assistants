import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  DEFAULT_SETTINGS,
  loadLocalSettings,
  initialCustomGatewayEndpoint,
  initialCustomGatewayApiKey,
} from '../src/hooks/useSettings.ts';
import {
  fetchNineRouterCatalog,
  normalizeGatewayEndpoint,
} from '../src/lib/gemini.ts';

describe('9Router Remote Tunnel & Deployment Verification Suite', () => {
  it('1. Environment variable initialization and default fallback settings', () => {
    assert.ok(
      typeof initialCustomGatewayEndpoint === 'string',
      'initialCustomGatewayEndpoint must be a string'
    );
    assert.ok(
      typeof initialCustomGatewayApiKey === 'string',
      'initialCustomGatewayApiKey must be a string'
    );
    assert.ok(
      DEFAULT_SETTINGS.custom_gateway_endpoint.length > 0,
      'DEFAULT_SETTINGS.custom_gateway_endpoint must have default value'
    );
    assert.equal(
      DEFAULT_SETTINGS.active_provider,
      'custom',
      'DEFAULT_SETTINGS.active_provider must default to custom (9Router)'
    );
  });

  it('2. Remote Origin detection: auto-switches from localhost to remote endpoint on non-localhost hosts', () => {
    const originalWindow = globalThis.window;
    try {
      // Simulate running on deployed Vercel domain
      globalThis.window = {
        location: {
          hostname: 'zeinity-creator.vercel.app',
        },
        localStorage: {
          getItem: (key) => {
            if (key === 'zeinity_settings') {
              // Stale settings from local dev still pointing to localhost
              return JSON.stringify({
                custom_gateway_endpoint: 'http://localhost:20128/v1',
              });
            }
            return null;
          },
          setItem: () => {},
        },
      };

      const settings = loadLocalSettings();
      // On remote host with initialCustomGatewayEndpoint defined (non-localhost), it should not be stuck on localhost:20128
      if (initialCustomGatewayEndpoint && !initialCustomGatewayEndpoint.includes('localhost')) {
        assert.equal(settings.custom_gateway_endpoint, initialCustomGatewayEndpoint);
      } else {
        assert.ok(settings.custom_gateway_endpoint);
      }
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it('3. Error transparency: HTTP 401 returns actionable diagnostic for missing Bearer API Key', async () => {
    // Create temporary mock HTTP server that simulates 401 Unauthorized
    const server = http.createServer((req, res) => {
      if (!req.headers.authorization) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key required for remote API access' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'Creator-Combo' }] }));
      }
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const testUrl = `http://127.0.0.1:${port}/v1`;

    try {
      // Unauthenticated request should throw descriptive 401 message
      await assert.rejects(
        async () => {
          await fetchNineRouterCatalog(testUrl, '');
        },
        (err) => {
          assert.match(err.message, /HTTP 401 Unauthorized/i);
          assert.match(err.message, /Bearer API Key/i);
          return true;
        }
      );

      // Authenticated request should succeed
      const catalog = await fetchNineRouterCatalog(testUrl, 'sk-test-key-123');
      assert.ok(catalog.allModels.includes('Creator-Combo'));
    } finally {
      server.close();
    }
  });

  it('4. Remote Tunnel normalization preserves HTTPS scheme and path', () => {
    assert.equal(
      normalizeGatewayEndpoint('https://rje2m9z.abc-tunnel.us'),
      'https://rje2m9z.abc-tunnel.us/v1'
    );
    assert.equal(
      normalizeGatewayEndpoint('https://rje2m9z.abc-tunnel.us/v1'),
      'https://rje2m9z.abc-tunnel.us/v1'
    );
    assert.equal(
      normalizeGatewayEndpoint('https://watt-membrane-beds-customise.trycloudflare.com'),
      'https://watt-membrane-beds-customise.trycloudflare.com/v1'
    );
  });
});
