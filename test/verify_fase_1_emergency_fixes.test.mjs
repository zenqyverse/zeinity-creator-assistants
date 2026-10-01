import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  mergeContentItemWithCache,
} from '../src/hooks/useContent.ts';
import {
  callAI,
  callAIWithFallback,
  extractSmartScriptContext,
  extractSalientMiddlePoints,
  parseFallbackChain,
  getFallbackProviderConfig,
} from '../src/lib/gemini.ts';

describe('Fase 1 (Penyelamatan Segera) Verification Suite', () => {
  it('1. mergeContentItemWithCache preserves local script metadata when Supabase returns null/undefined', () => {
    const cachedItem = {
      id: 'item-101',
      title: 'Video YouTube Inovatif',
      source: 'Web',
      status: 'Scripting',
      category: 'AI & Technology Impact',
      research_text: 'Riset awal',
      script_outline: 'I. Hook\nII. Solusi\nIII. Penutup',
      script_target_duration: '8-12m',
      script_target_words: 1600,
      script_angle_notes: 'Fokus pada implikasi etika AI',
      script_production_track: 'in_app',
      script_outline_approved: true,
      generated_thumbnail_visual: 'data:image/svg+xml;base64,PHN2Zz4...',
      thumbnail_mode: 'visual',
      generated_titles: [
        {
          id: 'formula_1',
          formulaName: 'Curiosity Gap',
          title: 'Rahasia AI 2026',
          wordCount: 3,
          isMobileSafe: false,
          explanation: 'Formula 1',
        },
      ],
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    };

    // Remote Supabase response lacks script metadata columns (or returns null)
    const remoteItem = {
      id: 'item-101',
      title: 'Video YouTube Inovatif (Updated on Server)',
      source: 'Web',
      status: 'Scripting',
      category: 'AI & Technology Impact',
      research_text: 'Riset awal',
      script_outline: null,
      script_target_duration: null,
      script_target_words: null,
      script_angle_notes: null,
      script_production_track: null,
      script_outline_approved: null,
      generated_thumbnail_visual: null,
      thumbnail_mode: null,
      generated_titles: null,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T01:00:00.000Z',
    };

    const merged = mergeContentItemWithCache(remoteItem, cachedItem);

    // Assert server-updated fields were applied
    assert.equal(merged.title, 'Video YouTube Inovatif (Updated on Server)');
    assert.equal(merged.updated_at, '2026-09-01T01:00:00.000Z');

    // Assert local script metadata was successfully rescued and preserved
    assert.equal(merged.script_outline, 'I. Hook\nII. Solusi\nIII. Penutup');
    assert.equal(merged.script_target_duration, '8-12m');
    assert.equal(merged.script_target_words, 1600);
    assert.equal(merged.script_angle_notes, 'Fokus pada implikasi etika AI');
    assert.equal(merged.script_production_track, 'in_app');
    assert.equal(merged.script_outline_approved, true);
    assert.equal(merged.generated_thumbnail_visual, 'data:image/svg+xml;base64,PHN2Zz4...');
    assert.equal(merged.thumbnail_mode, 'visual');
    assert.equal(merged.generated_titles?.length, 1);
    assert.equal(merged.generated_titles?.[0]?.title, 'Rahasia AI 2026');
  });

  it('2. Multi-provider failover mechanism in callAIWithFallback & callAI', async () => {
    // Start a mock server representing a secondary fallback gateway (e.g. 9Router on a mock port)
    let secondaryCallCount = 0;
    const secondaryServer = http.createServer((req, res) => {
      secondaryCallCount++;
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: 'Hasil AI dari provider cadangan yang berhasil.' } }],
          })
        );
      });
    });

    await new Promise((resolve) => secondaryServer.listen(0, '127.0.0.1', resolve));
    const secondaryPort = secondaryServer.address().port;
    const secondaryEndpoint = `http://127.0.0.1:${secondaryPort}/v1`;

    try {
      const logs = [];
      const config = {
        provider: 'custom',
        endpoint: 'http://127.0.0.1:59998/v1', // Dead primary gateway (fails immediately)
        modelVersion: 'Creator-Combo',
        fallbackChain: ['custom'], // will fallback to custom with fallback endpoint
        allSettings: {
          custom_gateway_endpoint: secondaryEndpoint,
          fallback_provider_order: 'custom,gemini',
        },
        onLog: (msg, sev) => logs.push({ msg, sev }),
      };

      // Since primary port 59998 is down, it should fallback to secondaryEndpoint in allSettings
      const fallbackResult = await callAIWithFallback('Prompt naskah', config, 1000);

      assert.equal(fallbackResult.usedProvider, 'custom');
      assert.equal(fallbackResult.text, 'Hasil AI dari provider cadangan yang berhasil.');
      assert.ok(secondaryCallCount >= 1, 'Secondary fallback endpoint was contacted');
      assert.ok(
        logs.some((l) => l.sev === 'warn' && l.msg.includes('Mengalihkan ke provider cadangan')),
        'Warning log was emitted during failover'
      );

      // Verify callAI returns text directly
      const textResult = await callAI('Prompt naskah 2', {
        ...config,
        endpoint: secondaryEndpoint,
      });
      assert.equal(textResult, 'Hasil AI dari provider cadangan yang berhasil.');
    } finally {
      await new Promise((resolve) => secondaryServer.close(resolve));
    }
  });

  it('3. extractSmartScriptContext preserves empirical research data, chronology, and numbers from the middle', () => {
    // Construct research text where middle contains crucial empirical facts, chronology, and statistics
    const headHook = 'PENDAHULUAN & PREMIS RISET: Dampak AI terhadap ekonomi kreator YouTube 2026.\n\n';
    const middleResearch = [
      '## KRONOLOGI PERKEMBANGAN',
      '- Tahap 1: Pada Januari 2024, adopsi AI baru mencapai 12% kreator mandiri.',
      '- Tahap 2: Riset Q1 2025 menunjukkan lonjakan hingga 58% dengan total nilai pasar $4.2 miliar.',
      '- Data: Survei 1,500 kreator menemukan retensi naskah berbasis bukti naik 73.5%.',
      '- Poin Kunci: Biaya produksi berkurang dari Rp 15 juta menjadi Rp 3.2 juta per video.',
      '- Bukti Empiris: 89% penonton drop-off jika hook tidak menyajikan fakta dalam 20 detik pertama.',
      'Teks narasi panjang pengisi '.repeat(200), // filler to trigger truncation
    ].join('\n');
    const tailResolution = '\n\nKESIMPULAN & RESOLUSI: Menguasai alur kerja hybrid adalah keharusan mutlak bagi kreator.';

    const fullText = headHook + middleResearch + tailResolution;

    // Extract with a bounded window smaller than the full text length
    const context = extractSmartScriptContext(fullText, { maxTotal: 3000, headChars: 800, tailChars: 600 });

    assert.ok(context.startsWith('PENDAHULUAN & PREMIS RISET'), 'Head hook must be preserved');
    assert.ok(context.endsWith('bagi kreator.'), 'Tail resolution must be preserved');
    assert.ok(context.includes('[... Bagian tengah diringkas'), 'Must include middle summary header');

    // Assert that empirical numbers, statistics, and dates from the middle were preserved
    assert.ok(context.includes('2024') || context.includes('2025'), 'Chronological years must be preserved');
    assert.ok(context.includes('%') || context.includes('miliar') || context.includes('Rp'), 'Empirical metrics must be preserved');
    assert.ok(context.includes('KRONOLOGI') || context.includes('Tahap 1') || context.includes('Data:'), 'Key empirical section markers must be preserved');
  });

  it('4. extractSalientMiddlePoints handles edge cases cleanly', () => {
    assert.equal(extractSalientMiddlePoints('', 500), '');
    assert.equal(extractSalientMiddlePoints('Teks biasa tanpa angka atau bukti', 20), '');

    const textWithData = 'Baris 1 biasa\nData: 85% creator menggunakan AI di tahun 2026.\nBaris 3 biasa';
    const extracted = extractSalientMiddlePoints(textWithData, 300);
    assert.ok(extracted.includes('85%'));
    assert.ok(extracted.includes('2026'));
  });

  it('5. parseFallbackChain & getFallbackProviderConfig helpers operate deterministically', () => {
    const chain = parseFallbackChain('ollama,gemini');
    assert.equal(chain[0], 'ollama');
    assert.equal(chain[1], 'gemini');
    assert.ok(chain.includes('openrouter'));
    assert.ok(chain.includes('custom'));

    const geminiCfg = getFallbackProviderConfig('gemini', {
      provider: 'custom',
      allSettings: {
        gemini_api_key: 'test-gemini-key',
        gemini_model_version: 'gemini-3.7-flash',
      },
    });
    assert.equal(geminiCfg.provider, 'gemini');
    assert.equal(geminiCfg.apiKey, 'test-gemini-key');
    assert.equal(geminiCfg.modelVersion, 'gemini-3.7-flash');

    const openrouterCfg = getFallbackProviderConfig('openrouter', {
      provider: 'custom',
      allSettings: {
        openrouter_api_key: 'test-or-key',
        openrouter_model_version: 'openrouter/free',
      },
    });
    assert.equal(openrouterCfg.provider, 'openrouter');
    assert.equal(openrouterCfg.apiKey, 'test-or-key');
    assert.equal(openrouterCfg.modelVersion, 'openrouter/free');
  });

  it('6. extractSmartScriptContext strictly honors maxTotal and extracts data from single-paragraph text & unicode bullets', () => {
    // Test 1: Single unbroken paragraph without newlines
    const singleParagraph = 'Premis: YouTube Creator Economy 2026. ' +
      'Dalam laporan industri Q1, tercatat pertumbuhan adopsi AI mencapai 85% dengan nilai valuasi $12.5 miliar. ' +
      'Survei 2,000 kreator menunjukkan retensi naskah meningkat tajam. ' +
      '• Poin A: Biaya produksi ditekan hingga 65%. ' +
      '• Poin B: 92% penonton menyukai narasi berbasis fakta empiris. ' +
      'Kalimat pengisi panjang tanpa jeda baris '.repeat(100) +
      'Penutup dan kesimpulan akhir naskah.';

    // Strict boundary checks across various limits
    const budgets = [250, 400, 800, 1500, 3000];
    for (const maxTotal of budgets) {
      const res = extractSmartScriptContext(singleParagraph, { maxTotal });
      assert.ok(
        res.length <= maxTotal,
        `Result length (${res.length}) must strictly not exceed maxTotal (${maxTotal})`
      );
    }

    // Verify salient points extracted from within the long unbroken paragraph
    const extracted = extractSalientMiddlePoints(singleParagraph, 400);
    assert.ok(extracted.includes('85%') || extracted.includes('miliar') || extracted.includes('65%'), 'Data in long unbroken paragraph should be extracted');

    // Edge case: small maxChars
    assert.equal(extractSalientMiddlePoints('Poin data 100%', 20), '');
  });

  it('7. callAIWithFallback deduplicates identical candidates to prevent repeating the same failed endpoint', async () => {
    let callAttempts = 0;
    const deadPort = 59997; // unreachable port
    const logs = [];

    const config = {
      provider: 'custom',
      endpoint: `http://127.0.0.1:${deadPort}/v1`,
      modelVersion: 'Creator-Combo',
      fallbackChain: ['custom', 'custom'], // attempts to configure same provider/endpoint multiple times
      allSettings: {
        custom_gateway_endpoint: `http://127.0.0.1:${deadPort}/v1`, // same dead port
      },
      onLog: (msg, sev) => {
        logs.push({ msg, sev });
        if (msg.includes('Mengirim permintaan ke 9Router')) {
          callAttempts++;
        }
      },
    };

    // Because endpoints and models are identical, it must not execute duplicate candidate
    await assert.rejects(
      async () => {
        await callAIWithFallback('Test Prompt', config, 200);
      },
      (err) => {
        return err instanceof Error;
      }
    );

    // Call attempts should be exactly 1, not duplicated
    assert.equal(callAttempts, 1, 'Duplicate candidate must not be executed twice');
  });

  it('8. mergeContentItemWithCache preserves local thumbnail visual and titles correctly', () => {
    const cached = {
      id: 'item-202',
      title: 'Judul Lama',
      source: 'Web',
      status: 'Scripting',
      category: 'AI & Technology Impact',
      research_text: 'Riset',
      thumbnail_mode: 'visual',
      generated_thumbnail_visual: 'data:image/svg+xml;base64,PHN2ZyB...',
      generated_titles: [
        {
          id: 'formula_3',
          formulaName: 'High Tension Hook',
          title: 'Bahaya AI 2026',
          wordCount: 3,
          isMobileSafe: true,
          explanation: 'Formula 3',
        },
      ],
    };

    const remote = {
      id: 'item-202',
      title: 'Judul Baru dari Server',
      source: 'Web',
      status: 'Scripting',
      category: 'AI & Technology Impact',
      research_text: 'Riset',
      thumbnail_mode: null,
      generated_thumbnail_visual: null,
      generated_titles: null,
    };

    const merged = mergeContentItemWithCache(remote, cached);
    assert.equal(merged.title, 'Judul Baru dari Server');
    assert.equal(merged.thumbnail_mode, 'visual');
    assert.equal(merged.generated_thumbnail_visual, 'data:image/svg+xml;base64,PHN2ZyB...');
    assert.equal(merged.generated_titles?.length, 1);
    assert.equal(merged.generated_titles?.[0]?.title, 'Bahaya AI 2026');
  });
});
