import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  parseFallbackChain,
  DEFAULT_SETTINGS,
  SENSITIVE_SETTINGS_KEYS,
} from '../src/hooks/useSettings.ts';
import {
  callAI,
  callAIWithFallback,
  fetchAvailableCustomGatewayModels,
  fetchNineRouterCatalog,
  parseNineRouterModels,
  normalizeGatewayEndpoint,
  getProviderLabel,
  resolveTargetModelForTask,
  isProviderConfigured,
  NINEROUTER_CATALOG_STORAGE_KEY,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_NINEROUTER_CATALOG,
} from '../src/lib/gemini.ts';

describe('AI Router & 100% 9Router Resilience Engine Verification Suite', () => {
  it('Layer 1: Security & Sensitive Keys Isolation & 9Router Defaults', () => {
    assert.ok(
      SENSITIVE_SETTINGS_KEYS.includes('custom_gateway_api_key'),
      'custom_gateway_api_key must be in SENSITIVE_SETTINGS_KEYS to prevent Supabase leakage'
    );
    assert.equal(
      DEFAULT_SETTINGS.custom_gateway_endpoint,
      'http://localhost:20128/v1',
      'DEFAULT_SETTINGS must have 9Router default endpoint http://localhost:20128/v1'
    );
    assert.equal(
      DEFAULT_SETTINGS.custom_gateway_model_version,
      'Creator-Combo',
      'DEFAULT_SETTINGS must have default model Creator-Combo'
    );
    assert.equal(
      DEFAULT_SETTINGS.gemini_model_version,
      'gemini-3.8-flash',
      'DEFAULT_SETTINGS must have non-deprecated default gemini_model_version gemini-3.8-flash'
    );
    assert.ok(
      DEFAULT_GEMINI_MODELS.includes('gemini-3.8-flash'),
      'DEFAULT_GEMINI_MODELS must include active flagship gemini-3.8-flash'
    );
    assert.deepEqual(
      DEFAULT_NINEROUTER_CATALOG.combos,
      ['Creator-Combo', 'Zeinity-Audit-Combo'],
      'DEFAULT_NINEROUTER_CATALOG must feature Creator-Combo and Zeinity-Audit-Combo'
    );
    assert.equal(
      DEFAULT_SETTINGS.custom_gateway_model_mode,
      'combo',
      'DEFAULT_SETTINGS must have default model mode combo'
    );
    assert.equal(
      DEFAULT_SETTINGS.active_provider,
      'custom',
      'DEFAULT_SETTINGS must have active_provider set to custom for 100% 9Router'
    );
    assert.equal(
      NINEROUTER_CATALOG_STORAGE_KEY,
      'zeinity_9router_catalog',
      'NINEROUTER_CATALOG_STORAGE_KEY must match persistent local storage key'
    );
  });

  it('Layer 2: Fallback Chain Parsing and Label Utilities', () => {
    const chain1 = parseFallbackChain('gemini,openrouter,custom,ollama');
    assert.deepEqual(chain1, ['gemini', 'openrouter', 'custom', 'ollama']);

    // Handles partial or duplicate orders cleanly
    const chain2 = parseFallbackChain('custom,gemini');
    assert.equal(chain2[0], 'custom');
    assert.equal(chain2[1], 'gemini');
    assert.equal(chain2.length, 4, 'Must include remaining providers in default sequence');
    assert.ok(chain2.includes('openrouter') && chain2.includes('ollama'));

    // Handles empty or invalid string
    const chain3 = parseFallbackChain('');
    assert.deepEqual(chain3, ['gemini', 'openrouter', 'custom', 'ollama']);

    assert.equal(getProviderLabel('custom'), '9Router Gateway');

    // Endpoint normalization
    assert.equal(normalizeGatewayEndpoint('http://localhost:20128'), 'http://localhost:20128/v1');
    assert.equal(normalizeGatewayEndpoint('http://localhost:20128/v1'), 'http://localhost:20128/v1');
    assert.equal(normalizeGatewayEndpoint('https://ai.zeinity.com'), 'https://ai.zeinity.com/v1');
    assert.equal(normalizeGatewayEndpoint('https://ai.zeinity.com/v1/'), 'https://ai.zeinity.com/v1');
    assert.equal(normalizeGatewayEndpoint(''), 'http://localhost:20128/v1');
  });

  it('Layer 3: 9Router Model Catalog Parsing (Combo vs Direct Models & Edge Cases)', () => {
    // Null, undefined, empty array safety
    assert.deepEqual(parseNineRouterModels(null), { combos: [], directModels: {}, allModels: [] });
    assert.deepEqual(parseNineRouterModels(undefined), { combos: [], directModels: {}, allModels: [] });
    assert.deepEqual(parseNineRouterModels([]), { combos: [], directModels: {}, allModels: [] });

    const mockData = [
      { id: 'Creator-Combo', owned_by: 'combo' },
      { id: 'Zeinity-Audit-Combo', owned_by: 'combo' },
      { id: 'groq/llama-3.3-70b-versatile', owned_by: 'groq' },
      { id: 'gemini/gemini-3.8-flash', owned_by: 'Google Gemini' },
      { id: 'openrouter/auto', owned_by: 'openrouter' },
      { id: 'ollama-local/qwen3:8b', owned_by: 'ollama-local' },
      'groq/mixtral-8x7b-32768', // String item fallback test
    ];

    const catalog = parseNineRouterModels(mockData);
    assert.deepEqual(catalog.combos, ['Creator-Combo', 'Zeinity-Audit-Combo']);
    assert.ok(catalog.allModels.includes('Creator-Combo'));
    assert.ok(catalog.allModels.includes('Zeinity-Audit-Combo'));
    assert.ok(catalog.allModels.includes('groq/llama-3.3-70b-versatile'));
    assert.ok(catalog.allModels.includes('groq/mixtral-8x7b-32768'));
    assert.ok(catalog.directModels['groq']?.includes('groq/llama-3.3-70b-versatile'));
    assert.ok(catalog.directModels['Google Gemini']?.includes('gemini/gemini-3.8-flash'));
    assert.ok(catalog.directModels['Groq']?.includes('groq/mixtral-8x7b-32768'));
  });

  it('Layer 4: Honest Healthcheck & Offline Error Handling', async () => {
    // When offline, fetchAvailableCustomGatewayModels must throw honest Indonesian error
    // instead of silently returning fake models
    await assert.rejects(
      async () => {
        await fetchAvailableCustomGatewayModels('http://127.0.0.1:59999/v1');
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Gagal terhubung ke 9Router') &&
          err.message.includes('9router start')
        );
      },
      'fetchAvailableCustomGatewayModels must throw honest error advising 9router start'
    );

    await assert.rejects(
      async () => {
        await fetchNineRouterCatalog('http://127.0.0.1:59999/v1');
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes('Gagal terhubung ke 9Router') &&
          err.message.includes('9router start')
        );
      },
      'fetchNineRouterCatalog must throw honest error advising 9router start'
    );
  });

  it('Layer 5: Full Execution of callAI with Creator-Combo & 9Router Mock Server', async () => {
    let receivedModel = '';
    let receivedAuth = '';
    let receivedPrompt = '';

    // Create an ephemeral mock 9Router server
    const server = http.createServer((req, res) => {
      receivedAuth = req.headers['authorization'] || '';

      if (req.url === '/v1/models' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: [
              { id: 'Creator-Combo', owned_by: 'combo' },
              { id: 'Zeinity-Audit-Combo', owned_by: 'combo' },
              { id: 'groq/llama-3.3-70b-versatile', owned_by: 'Groq' },
            ],
          })
        );
        return;
      }

      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            receivedModel = parsed.model;
            receivedPrompt = parsed.messages?.[0]?.content || '';
          } catch { /* ignore */ }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'chatcmpl-test-123',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Naskah AI dari model Creator-Combo terverifikasi.',
                  },
                },
              ],
            })
          );
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const mockEndpoint = `http://127.0.0.1:${port}/v1`;

    try {
      // 1. Test fetchNineRouterCatalog against live mock
      const catalog = await fetchNineRouterCatalog(mockEndpoint, 'sk-test-token');
      assert.deepEqual(catalog.combos, ['Creator-Combo', 'Zeinity-Audit-Combo']);
      assert.ok(catalog.directModels['Groq']?.includes('groq/llama-3.3-70b-versatile'));
      assert.equal(receivedAuth, 'Bearer sk-test-token');

      // 2. Test successful execution of callAI with Creator-Combo
      const logs = [];
      const result = await callAI(
        'Tolong buatkan opening hook naskah YouTube',
        {
          provider: 'custom',
          endpoint: mockEndpoint,
          modelVersion: 'Creator-Combo',
          apiKey: 'sk-test-token-2',
          onLog: (msg, sev) => logs.push({ msg, sev }),
        },
        5000
      );

      assert.equal(result, 'Naskah AI dari model Creator-Combo terverifikasi.');
      assert.equal(receivedModel, 'Creator-Combo');
      assert.equal(receivedPrompt, 'Tolong buatkan opening hook naskah YouTube');
      assert.equal(receivedAuth, 'Bearer sk-test-token-2');
      assert.ok(logs.some((l) => l.msg.includes('Creator-Combo') && l.sev === 'success'));

      // 3. Test callAIWithFallback with default Creator-Combo
      const fallbackResult = await callAIWithFallback('Test prompt', {
        provider: 'custom',
        endpoint: mockEndpoint,
        modelVersion: 'Creator-Combo',
      });
      assert.equal(fallbackResult.usedProvider, 'custom');
      assert.equal(fallbackResult.usedModel, 'Creator-Combo');
      assert.equal(fallbackResult.text, 'Naskah AI dari model Creator-Combo terverifikasi.');

      // 4. Test callAI with Direct Model mode
      const directResult = await callAIWithFallback('Prompt direct', {
        provider: 'custom',
        endpoint: mockEndpoint,
        modelMode: 'direct',
        allSettings: {
          custom_gateway_model_mode: 'direct',
          custom_gateway_direct_model: 'groq/llama-3.3-70b-versatile',
        },
      });
      assert.equal(directResult.usedModel, 'groq/llama-3.3-70b-versatile');
      assert.equal(receivedModel, 'groq/llama-3.3-70b-versatile');

      // 5. Test timeout rejection handling
      await assert.rejects(
        async () => {
          await callAI(
            'Test Prompt',
            {
              provider: 'custom',
              endpoint: mockEndpoint,
              modelVersion: 'Creator-Combo',
            },
            1 // 1ms timeout triggers immediately
          );
        },
        (err) => {
          return (
            err instanceof Error &&
            (err.message.includes('Batas waktu habis') ||
              err.message.includes('tidak merespons'))
          );
        },
        'callAI must reject with descriptive Indonesian timeout error'
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('Layer 6: Smart Task-Based Routing (Creator-Combo for Script vs Zeinity-Audit-Combo for Audit)', () => {
    const baseConfig = {
      provider: 'custom',
      endpoint: 'http://localhost:20128/v1',
      modelVersion: 'Creator-Combo',
      modelMode: 'combo',
      allSettings: {
        custom_gateway_model_mode: 'combo',
        custom_gateway_model_version: 'Creator-Combo',
      },
    };

    // 1. Script task routing targets Creator-Combo
    const scriptConfig = resolveTargetModelForTask('script', baseConfig);
    assert.equal(scriptConfig.modelVersion, 'Creator-Combo');
    assert.equal(scriptConfig.allSettings?.custom_gateway_model_version, 'Creator-Combo');

    // 2. Audit task routing targets Zeinity-Audit-Combo
    const auditConfig = resolveTargetModelForTask('audit', baseConfig);
    assert.equal(auditConfig.modelVersion, 'Zeinity-Audit-Combo');
    assert.equal(auditConfig.allSettings?.custom_gateway_model_version, 'Zeinity-Audit-Combo');

    // 3. User explicit Direct Model choice is preserved (not overwritten)
    const directConfig = {
      provider: 'custom',
      modelMode: 'direct',
      modelVersion: 'groq/llama-3.3-70b-versatile',
      allSettings: {
        custom_gateway_model_mode: 'direct',
        custom_gateway_direct_model: 'groq/llama-3.3-70b-versatile',
      },
    };
    const resolvedDirectScript = resolveTargetModelForTask('script', directConfig);
    assert.equal(resolvedDirectScript.modelVersion, 'groq/llama-3.3-70b-versatile');
    assert.equal(resolvedDirectScript.modelMode, 'direct');

    const resolvedDirectAudit = resolveTargetModelForTask('audit', directConfig);
    assert.equal(resolvedDirectAudit.modelVersion, 'groq/llama-3.3-70b-versatile');
    assert.equal(resolvedDirectAudit.modelMode, 'direct');

    // 4. Non-custom provider (e.g. Google Gemini directly) is preserved
    const geminiConfig = {
      provider: 'gemini',
      modelVersion: 'gemini-3.8-flash',
    };
    const resolvedGemini = resolveTargetModelForTask('audit', geminiConfig);
    assert.equal(resolvedGemini.provider, 'gemini');
    assert.equal(resolvedGemini.modelVersion, 'gemini-3.8-flash');
  });

  it('Layer 7: Provider Readiness & Zero-Auth Local Exemption (9Router & Ollama)', () => {
    // 1. 9Router (custom) does NOT require an API Key
    assert.equal(isProviderConfigured({ provider: 'custom', apiKey: '' }), true);
    assert.equal(isProviderConfigured({ provider: 'custom' }), true);
    assert.equal(isProviderConfigured({ provider: 'custom', apiKey: 'sk-optional-key' }), true);

    // 2. Ollama does NOT require an API Key
    assert.equal(isProviderConfigured({ provider: 'ollama', apiKey: '' }), true);
    assert.equal(isProviderConfigured({ provider: 'ollama' }), true);

    // 3. Gemini REQUIRES a non-empty API Key
    assert.equal(isProviderConfigured({ provider: 'gemini', apiKey: '' }), false);
    assert.equal(isProviderConfigured({ provider: 'gemini', apiKey: '   ' }), false);
    assert.equal(isProviderConfigured({ provider: 'gemini', apiKey: 'AIzaSyTestKey' }), true);

    // 4. OpenRouter REQUIRES a non-empty API Key
    assert.equal(isProviderConfigured({ provider: 'openrouter', apiKey: '' }), false);
    assert.equal(isProviderConfigured({ provider: 'openrouter', apiKey: 'sk-or-test' }), true);

    // 5. Null or undefined config returns false safely
    assert.equal(isProviderConfigured(null), false);
    assert.equal(isProviderConfigured(undefined), false);
  });
});
