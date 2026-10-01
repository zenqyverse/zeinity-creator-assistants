import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAIError } from '../src/lib/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Custom Timeout Option & Diagnostics Verification Suite', () => {
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');

  const settingsSource = fs.readFileSync(settingsPath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  const geminiSource = fs.readFileSync(geminiPath, 'utf8');

  it('1. Settings.tsx implements 5 presets plus dedicated Custom Timeout card', () => {
    assert.ok(settingsSource.includes("'60'"), 'Must support 60s preset');
    assert.ok(settingsSource.includes("'90'"), 'Must support 90s preset');
    assert.ok(settingsSource.includes("'120'"), 'Must support 120s preset');
    assert.ok(settingsSource.includes("'180'"), 'Must support 180s preset');
    assert.ok(settingsSource.includes("'300'"), 'Must support 300s preset (5 Menit)');
    assert.ok(settingsSource.includes('Kustom…') || settingsSource.includes('Kustom'), 'Must render Custom card');
  });

  it('2. Settings.tsx implements Custom Timeout input panel with quick chips', () => {
    assert.ok(settingsSource.includes('ai_request_timeout_custom_input'), 'Must have custom number input');
    assert.ok(settingsSource.includes('formatTimeoutDuration'), 'Must format timeout in minutes & seconds');
    assert.ok(settingsSource.includes('Terapkan Timeout'), 'Must provide apply custom timeout button');
    assert.ok(settingsSource.includes("'240'"), 'Must provide 240s quick chip');
    assert.ok(settingsSource.includes("'360'"), 'Must provide 360s quick chip');
    assert.ok(settingsSource.includes("'600'"), 'Must provide 600s quick chip');
  });

  it('3. App.tsx and gemini.ts correctly pass and compute custom timeout in seconds', () => {
    assert.ok(appSource.includes('timeoutSeconds: Number(settings.ai_request_timeout || 90)'), 'App.tsx must parse custom timeout to Number');
    assert.ok(geminiSource.includes('config.timeoutSeconds !== undefined'), 'gemini.ts must check timeoutSeconds');
    assert.ok(geminiSource.includes('config.timeoutSeconds * 1000'), 'gemini.ts must convert seconds to ms');
  });

  it('4. parseAIError includes custom timeout solution guidance in Settings', () => {
    const customTimeoutError = new Error('Batas waktu habis (300 detik): Server 9Router di "http://localhost:20128/v1" tidak merespons saat memanggil model "Creator-Combo".');
    const parsed = parseAIError(customTimeoutError);

    assert.equal(parsed.title, 'Permintaan AI Melebihi Batas Waktu (Timeout)');
    assert.equal(parsed.diagnostics?.statusCode, 'Timeout (300s)');
    assert.ok(parsed.solution?.includes('Settings'), 'Must guide user to Settings');
    assert.ok(parsed.solution?.includes('Custom Timeout') || parsed.solution?.includes('Batas Waktu Permintaan'), 'Must mention Custom Timeout option');
  });
});
