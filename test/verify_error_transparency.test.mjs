import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUpstreamErrorInfo,
  parseAIError,
} from '../src/lib/gemini.ts';

describe('Error Transparency & Root-Cause Diagnostics Verification Suite', () => {
  it('1. extractUpstreamErrorInfo accurately unmasks 9Router upstream failures', () => {
    // 9Router bracketed upstream 401 error
    const raw9Router401 = '9Router Gateway [Creator-Combo] error (503): {"error":{"message":"[gemini/gemini-3.8-flash] [401]: {\\"error\\":{\\"code\\":401,\\"message\\":\\"API key not valid. Please pass a valid API key.\\",\\"status\\":\\"UNAUTHENTICATED\\"}}"}}';
    const info401 = extractUpstreamErrorInfo(raw9Router401);

    assert.ok(info401, 'Must extract upstream info');
    assert.equal(info401.upstreamModel, 'gemini/gemini-3.8-flash');
    assert.equal(info401.statusCode, 401);
    assert.equal(info401.upstreamMessage, 'API key not valid. Please pass a valid API key.');

    // 9Router bracketed upstream 404 error
    const raw9Router404 = '9Router Gateway [Zeinity-Audit-Combo] error (404): {"error":{"message":"[groq/llama-3.3-70b-versatile] [404]: {\\"error\\":{\\"message\\":\\"The model llama-3.3-70b-versatile does not exist or you do not have access to it.\\",\\"type\\":\\"invalid_request_error\\",\\"code\\":\\"model_not_found\\"}}"}}';
    const info404 = extractUpstreamErrorInfo(raw9Router404);

    assert.ok(info404, 'Must extract 404 upstream info');
    assert.equal(info404.upstreamModel, 'groq/llama-3.3-70b-versatile');
    assert.equal(info404.statusCode, 404);
    assert.equal(info404.upstreamMessage, 'The model llama-3.3-70b-versatile does not exist or you do not have access to it.');

    // Plain message fallback
    const rawSimple = '{"error":{"message":"No models available in combo"}}';
    const infoSimple = extractUpstreamErrorInfo(rawSimple);
    assert.ok(infoSimple);
    assert.equal(infoSimple.upstreamMessage, 'No models available in combo');
  });

  it('2. parseAIError produces complete transparent diagnostics for 9Router 401 error', () => {
    const raw9Router401 = '9Router Gateway [Creator-Combo] error (503): {"error":{"message":"[gemini/gemini-3.8-flash] [401]: {\\"error\\":{\\"code\\":401,\\"message\\":\\"API key not valid. Please pass a valid API key.\\",\\"status\\":\\"UNAUTHENTICATED\\"}}"}}';
    const parsed = parseAIError(new Error(raw9Router401));

    assert.equal(parsed.title, 'Kunci API Belum Dikonfigurasi / Tidak Valid');
    assert.ok(parsed.diagnostics, 'Diagnostics must be present');
    assert.equal(parsed.diagnostics.targetModel, 'gemini/gemini-3.8-flash');
    assert.equal(parsed.diagnostics.statusCode, 401);
    assert.ok(parsed.diagnostics.rootCause?.includes('API key not valid'));
    assert.ok(parsed.diagnostics.rootCause?.includes('gemini'));
  });

  it('3. parseAIError produces complete transparent diagnostics for 9Router 404 error', () => {
    const raw9Router404 = '9Router Gateway [Zeinity-Audit-Combo] error (404): {"error":{"message":"[groq/llama-3.3-70b-versatile] [404]: {\\"error\\":{\\"message\\":\\"The model llama-3.3-70b-versatile does not exist or you do not have access to it.\\",\\"type\\":\\"invalid_request_error\\",\\"code\\":\\"model_not_found\\"}}"}}';
    const parsed = parseAIError(new Error(raw9Router404));

    assert.equal(parsed.title, 'Model AI Tidak Ditemukan / Deprecated (Error 404)');
    assert.ok(parsed.diagnostics, 'Diagnostics must be present');
    assert.equal(parsed.diagnostics.targetModel, 'groq/llama-3.3-70b-versatile');
    assert.equal(parsed.diagnostics.statusCode, 404);
    assert.ok(parsed.diagnostics.rootCause?.includes('does not exist or you do not have access'));
  });

  it('4. parseAIError provides rich timeout diagnostics unmasking socket hang', () => {
    const rawTimeout = 'Batas waktu habis (120 detik): Server 9Router di "http://localhost:20128/v1" tidak merespons saat memanggil model "Creator-Combo". Pastikan gateway aktif dan responsif.';
    const parsed = parseAIError(new Error(rawTimeout));

    assert.equal(parsed.title, 'Permintaan AI Melebihi Batas Waktu (Timeout)');
    assert.ok(parsed.diagnostics, 'Diagnostics must be present');
    assert.equal(parsed.diagnostics.targetModel, 'Creator-Combo');
    assert.equal(parsed.diagnostics.statusCode, 'Timeout (120s)');
    assert.ok(parsed.diagnostics.rootCause?.includes('socket hang'));
    assert.ok(parsed.solution?.includes('koneksi internet') || parsed.solution?.includes('Settings'));
  });

  it('5. parseAIError handles offline gateway (ECONNREFUSED) with actionable guidance', () => {
    const rawOffline = 'TypeError: Failed to fetch (http://localhost:20128/v1/chat/completions) ECONNREFUSED';
    const parsed = parseAIError(new Error(rawOffline));

    assert.ok(parsed.diagnostics, 'Diagnostics must be present');
    assert.equal(parsed.diagnostics.statusCode, 'ECONNREFUSED');
    assert.ok(parsed.solution?.includes('9router start'));
  });

  it('6. parseChatCompletionResponse seamlessly handles streaming SSE chunks without SyntaxError', async () => {
    const { parseChatCompletionResponse } = await import('../src/lib/gemini.ts');

    // Real SSE streaming response from 9Router
    const sseChunkText = `data: {"id":"chatcmpl-8bS7av_qHNuzg8UP_IzR2AE","object":"chat.completion.chunk","created":1790686449,"model":"gemini-3.5-flash-lite","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-8bS7av_qHNuzg8UP_IzR2AE","object":"chat.completion.chunk","created":1790686449,"model":"gemini-3.5-flash-lite","choices":[{"index":0,"delta":{"content":"Hasil riset "},"finish_reason":null}]}

data: {"id":"chatcmpl-8bS7av_qHNuzg8UP_IzR2AE","object":"chat.completion.chunk","created":1790686449,"model":"gemini-3.5-flash-lite","choices":[{"index":0,"delta":{"content":"berhasil dibuat!"},"finish_reason":"stop"}]}

data: [DONE]`;

    const res = parseChatCompletionResponse(sseChunkText);
    assert.equal(res.content, 'Hasil riset berhasil dibuat!');
    assert.equal(res.error, undefined);
  });

  it('7. parseAIError handles SyntaxError position 198 gracefully with diagnostic info', () => {
    const rawSyntaxErr = 'SyntaxError: Unexpected non-whitespace character after JSON at position 198 (line 3 column 1)';
    const parsed = parseAIError(new Error(rawSyntaxErr));

    assert.equal(parsed.title, 'Kesalahan Format Aliran Data (Streaming/SSE)');
    assert.ok(parsed.diagnostics);
    assert.equal(parsed.diagnostics.statusCode, 'PARSING_ERROR');
    assert.ok(parsed.diagnostics.rootCause?.includes('potongan stream'));
  });
});

