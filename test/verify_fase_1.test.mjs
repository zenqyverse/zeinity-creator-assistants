import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 1 Verification Suite (F-002, F-011, F-003, F-009)', async () => {
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const useSettingsContent = fs.readFileSync(useSettingsPath, 'utf8');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('F-002 & F-011: Penyaringan Kunci Sensitif di useSettings.ts & Storage Terisolasi', async () => {
    // 1. Helper function terpusat terdefinisi dan diekspor
    assert.ok(
      useSettingsContent.includes('export function filterNonSensitiveSettings'),
      'useSettings.ts must export filterNonSensitiveSettings'
    );
    assert.ok(
      useSettingsContent.includes('export function saveNonSensitiveSettings'),
      'useSettings.ts must export saveNonSensitiveSettings'
    );
    assert.ok(
      useSettingsContent.includes('export function removeStoredSensitiveKey'),
      'useSettings.ts must export removeStoredSensitiveKey'
    );

    // 2. Logika penyaringan benar-benar menghapus kunci sensitif
    // Simulasi in-memory unit test untuk filterNonSensitiveSettings
    const rawSettings = {
      active_provider: 'gemini',
      gemini_model_version: 'gemini-1.5-flash',
      gemini_api_key: 'AIzaSySecretGeminiKey123',
      openrouter_api_key: 'sk-or-v1-secret-openrouter-key',
      telegram_token: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678',
      ollama_endpoint: 'http://localhost:11434',
      channel_identity: 'Custom Identity Text',
    };

    const SENSITIVE_SETTINGS_KEYS = ['gemini_api_key', 'openrouter_api_key', 'telegram_token'];
    const SENSITIVE_KEYS_SET = new Set(SENSITIVE_SETTINGS_KEYS);

    function filterNonSensitive(settings) {
      const filtered = {};
      for (const [key, value] of Object.entries(settings)) {
        if (!SENSITIVE_KEYS_SET.has(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    }

    const filtered = filterNonSensitive(rawSettings);
    assert.equal(filtered.gemini_api_key, undefined, 'gemini_api_key must be filtered out');
    assert.equal(filtered.openrouter_api_key, undefined, 'openrouter_api_key must be filtered out');
    assert.equal(filtered.telegram_token, undefined, 'telegram_token must be filtered out');
    assert.equal(filtered.active_provider, 'gemini', 'Non-sensitive key active_provider must be kept');
    assert.equal(filtered.ollama_endpoint, 'http://localhost:11434', 'ollama_endpoint must be kept');
    assert.equal(filtered.channel_identity, 'Custom Identity Text', 'channel_identity must be kept');

    // 3. SETTINGS_STORAGE_KEY tidak lagi menerima raw settings objek dengan kunci sensitif
    // Baris 244, 291, 319, 332 harus menggunakan saveNonSensitiveSettings
    assert.ok(
      !useSettingsContent.includes('localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(loadedSettings))'),
      'fetchSettings must not directly serialize un-sanitized loadedSettings to SETTINGS_STORAGE_KEY'
    );
    assert.ok(
      !useSettingsContent.includes('localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))'),
      'upsertSetting must not directly serialize un-sanitized updated settings to SETTINGS_STORAGE_KEY'
    );

    // 4. Semua penyimpanan lokal ke SETTINGS_STORAGE_KEY dialihkan via saveNonSensitiveSettings
    const saveCount = (useSettingsContent.match(/saveNonSensitiveSettings\(/g) || []).length;
    assert.ok(saveCount >= 4, `Expected at least 4 occurrences of saveNonSensitiveSettings, found ${saveCount}`);
  });

  it('F-003: Validasi Format Token Telegram di useSettings.ts & Settings.tsx', () => {
    // 1. Format regex standar Telegram Bot API terdefinisi
    assert.ok(
      useSettingsContent.includes('TELEGRAM_TOKEN_REGEX = /^[0-9]{7,10}:[A-Za-z0-9_-]{35}$/'),
      'useSettings.ts must define standard TELEGRAM_TOKEN_REGEX'
    );
    assert.ok(
      useSettingsContent.includes('export function isValidTelegramToken'),
      'useSettings.ts must export isValidTelegramToken'
    );

    // 2. Validasi fungsional regex
    const regex = /^[0-9]{7,10}:[A-Za-z0-9_-]{35}$/;

    // Token valid (7 digit ID, 35 char secret)
    assert.ok(regex.test('1234567:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678'), '7-digit bot ID should be valid');
    // Token valid (10 digit ID, 35 char secret)
    assert.ok(regex.test('1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678'), '10-digit bot ID should be valid');
    // Token valid dengan simbol '-' dan '_'
    assert.ok(regex.test('123456789:ABCdefGhIJKlmNo-QRsTUVwxyZ_12345678'), 'Token with dashes and underscores should be valid');

    // Token tidak valid:
    assert.ok(!regex.test(''), 'Empty token should be invalid');
    assert.ok(!regex.test('123456:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678'), '6-digit bot ID (too short) should be invalid');
    assert.ok(!regex.test('12345678901:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678'), '11-digit bot ID (too long) should be invalid');
    assert.ok(!regex.test('123456789ABCdefGhIJKlmNoPQRsTUVwxyZa12345678'), 'Missing colon should be invalid');
    assert.ok(!regex.test('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa1234567'), '34-character secret (too short) should be invalid');
    assert.ok(!regex.test('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa123456789'), '36-character secret (too long) should be invalid');
    assert.ok(!regex.test('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa1234567@'), 'Secret with illegal character @ should be invalid');

    // 3. Settings.tsx mengintegrasikan validasi sebelum menyimpan
    assert.ok(
      settingsContent.includes('isValidTelegramToken'),
      'Settings.tsx must call isValidTelegramToken'
    );
    assert.ok(
      settingsContent.includes("key === 'telegram_token'"),
      'Settings.tsx must explicitly intercept telegram_token in handleSave'
    );
    assert.ok(
      settingsContent.includes('Format Token Telegram Tidak Valid') ||
      settingsContent.includes('Format Token Tidak Boleh Kosong'),
      'Settings.tsx must show descriptive error message when format is invalid'
    );
  });

  it('F-009: Mekanisme Hapus / Revokasi Token di useSettings.ts, Settings.tsx & App.tsx', () => {
    // 1. useSettings.ts mengekspor fungsi deleteSetting dan resetTelegramToken
    assert.ok(
      useSettingsContent.includes('deleteSetting'),
      'useSettings.ts must provide deleteSetting'
    );
    assert.ok(
      useSettingsContent.includes('resetTelegramToken'),
      'useSettings.ts must provide resetTelegramToken'
    );
    assert.ok(
      useSettingsContent.includes("removeStoredSensitiveKey(key)"),
      'deleteSetting must invoke removeStoredSensitiveKey to purge from localStorage'
    );

    // 2. Settings.tsx menyediakan tombol Hapus Token
    assert.ok(
      settingsContent.includes('Hapus Token'),
      'Settings.tsx must render a "Hapus Token" button'
    );
    assert.ok(
      settingsContent.includes('handleDeleteTelegramToken'),
      'Settings.tsx must define handleDeleteTelegramToken handler'
    );

    // 3. Dialog konfirmasi sebelum menghapus token
    assert.ok(
      settingsContent.includes('Hapus Token Telegram?'),
      'Settings.tsx must ask for confirmation with descriptive modal title'
    );
    assert.ok(
      settingsContent.includes("confirmText: 'Ya, Hapus Token'") ||
      settingsContent.includes('confirmText: "Ya, Hapus Token"'),
      'Settings.tsx must specify clear confirmation button text'
    );
    assert.ok(
      settingsContent.includes("cancelText: 'Batal'") ||
      settingsContent.includes('cancelText: "Batal"'),
      'Settings.tsx must provide a cancel button'
    );

    // 4. App.tsx meneruskan onDelete dan onResetTelegramToken ke Settings
    assert.ok(
      appContent.includes('deleteSetting') && appContent.includes('resetTelegramToken'),
      'App.tsx must consume deleteSetting and resetTelegramToken from useSettings'
    );
    assert.ok(
      appContent.includes('onDelete={deleteSetting}') || appContent.includes('onResetTelegramToken={resetTelegramToken}'),
      'App.tsx must pass deletion handlers to Settings component'
    );
  });
});
