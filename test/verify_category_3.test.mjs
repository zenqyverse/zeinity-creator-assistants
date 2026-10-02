import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Kategori 3 (MINOR, PLACEHOLDER & POLISHING) Verification Suite', async () => {
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const fileManagerPath = path.join(projectRoot, 'src', 'views', 'FileManager.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const indexCssPath = path.join(projectRoot, 'src', 'index.css');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  const fileManagerContent = fs.readFileSync(fileManagerPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('Item 1: Kejelasan Status Fitur Telegram Bot di Settings.tsx', () => {
    // 1. Badge status kesiapan integrasi Telegram Bot
    assert.ok(
      settingsContent.includes('Siap Digunakan') || settingsContent.includes('Roadmap / Segera Hadir'),
      'Settings.tsx must display active readiness status badge on Telegram Bot card'
    );

    // 2. Keterangan transparan mengenai webhook masa depan dan penyimpanan token lokal
    assert.ok(
      settingsContent.includes('Status Integrasi:'),
      'Settings.tsx must provide clear Status Integrasi notice'
    );
    assert.ok(
      settingsContent.includes('webhook') || settingsContent.includes('localStorage'),
      'Settings.tsx must explain token storage for future webhook/polling integration'
    );
  });

  it('Item 2: Perbaikan Teks Multi-Provider di FileManager.tsx', () => {
    // Subtitle hero harus menyebutkan multi-provider (Gemini, OpenRouter, & Ollama)
    assert.ok(
      fileManagerContent.includes('konteks AI (Gemini, OpenRouter, Ollama, & 9Router Gateway)') ||
      fileManagerContent.includes('konteks AI (Gemini, OpenRouter, & Ollama)'),
      'FileManager.tsx must mention multi-provider including 9Router Gateway in hero subtitle'
    );
    assert.ok(
      !fileManagerContent.includes('konteks AI Gemini.'),
      'FileManager.tsx must no longer restrict hero context description to only Gemini'
    );
  });

  it('Item 3: Responsivitas Layout 2-Kolom di ScriptDetail.tsx dan index.css', () => {
    // 1. ScriptDetail.tsx tidak lagi menggunakan inline style gridTemplateColumns: '1fr 1fr'
    assert.ok(
      !scriptDetailContent.includes("gridTemplateColumns: '1fr 1fr'"),
      "ScriptDetail.tsx must not use inline gridTemplateColumns: '1fr 1fr'"
    );
    assert.ok(
      scriptDetailContent.includes('className="workspace-grid"'),
      'ScriptDetail.tsx must use className="workspace-grid"'
    );

    // 2. index.css memiliki definisi .workspace-grid dan media query untuk layar tablet/sempit
    assert.ok(
      indexCssContent.includes('.workspace-grid'),
      'index.css must define .workspace-grid'
    );
    assert.ok(
      indexCssContent.includes('@media (max-width: 960px)') || indexCssContent.includes('@media (max-width: 860px)'),
      'index.css must have responsive media query breakpoint for workspace grid'
    );
    assert.ok(
      indexCssContent.includes('grid-template-columns: 1fr'),
      'index.css must stack to 1 column in responsive media query'
    );
    assert.ok(
      indexCssContent.includes('.workspace-grid > *') && indexCssContent.includes('min-width: 0'),
      'index.css must ensure grid children have min-width: 0 to prevent horizontal overflow'
    );
  });

  it('Item 4: Pembersihan Dead Code & Berkas Tidak Terpakai', () => {
    const templatePath = path.join(projectRoot, 'src', 'components', 'template_UI_UX.html');
    const adhocTestPath = path.join(projectRoot, 'test_models_and_analytics.mjs');
    const testsAdhocTestPath = path.join(projectRoot, 'tests', 'test_models_and_analytics.mjs');

    assert.ok(!fs.existsSync(templatePath), 'template_UI_UX.html must be deleted');
    assert.ok(!fs.existsSync(adhocTestPath), 'test_models_and_analytics.mjs at root must be deleted');
    assert.ok(!fs.existsSync(testsAdhocTestPath), 'tests/test_models_and_analytics.mjs must be deleted');
  });

  it('Item 5: Pembersihan Sisa Linting Debt (ESLint)', () => {
    // 1. App.tsx tidak memiliki empty catch blocks
    assert.ok(!appContent.includes('catch {}'), 'App.tsx must not contain empty catch blocks');

    // 2. App.tsx tidak menggunakan `: any` dalam error handling
    assert.ok(!appContent.includes('catch (err: any)'), 'App.tsx must not use catch (err: any)');

    // 3. Settings.tsx tidak menggunakan `cfg.provider as any`
    assert.ok(!settingsContent.includes('cfg.provider as any'), 'Settings.tsx must not use cfg.provider as any');
  });
});
