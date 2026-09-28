import { useState, useEffect, useMemo } from 'react';
import { Save, Bot, Key, MessageSquare, Link2, Cpu, Download, Check, Sparkles, Info, Trash2, Radio, Shield, Users, HelpCircle } from 'lucide-react';
import {
  fetchAvailableGeminiModels,
  DEFAULT_GEMINI_MODELS,
  fetchAvailableOpenRouterModels,
  DEFAULT_OPENROUTER_MODELS,
  fetchAvailableOllamaModels,
  DEFAULT_OLLAMA_MODELS,
  getDynamicRecommendations,
} from '@/lib/gemini';
import { useAlert } from '@/components/AlertModal';
import { useTerminal } from '@/components/Terminal';
import { isValidTelegramToken, verifyTelegramBotToken, type TelegramVerificationResult } from '@/hooks/useSettings';

interface SettingsProps {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<boolean>;
  onDelete?: (key: string) => Promise<boolean>;
  onResetTelegramToken?: () => Promise<boolean>;
  onShowToast?: (msg: string) => void;
}

const providers = [
  { key: 'gemini_api_key', label: 'Google Gemini API Key', icon: Bot, placeholder: 'AIza…', mask: 'gemini' },
  { key: 'openrouter_api_key', label: 'OpenRouter / Groq API Key', icon: Link2, placeholder: 'sk-or-…', mask: 'openrouter' },
  { key: 'ollama_endpoint', label: 'Ollama Local Endpoint', icon: Key, placeholder: 'http://localhost:11434', mask: 'ollama' },
];

export default function Settings({ settings, onSave, onDelete, onResetTelegramToken, onShowToast }: SettingsProps) {
  const { showAlert, showError, showWarning } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity } = useTerminal();
  const [values, setValues] = useState<Record<string, string>>({
    gemini_api_key: settings.gemini_api_key || '',
    gemini_model_version: settings.gemini_model_version || 'gemini-1.5-flash',
    openrouter_api_key: settings.openrouter_api_key || '',
    openrouter_model_version: settings.openrouter_model_version || 'openrouter/free',
    ollama_endpoint: settings.ollama_endpoint || 'http://localhost:11434',
    ollama_model_version: settings.ollama_model_version || 'llama3',
    active_provider: settings.active_provider || 'gemini',
    telegram_token: settings.telegram_token || '',
    telegram_allowed_chat_ids: settings.telegram_allowed_chat_ids || '',
  });

  // Sinkronkan state lokal form jika props settings dari useSettings selesai dimuat
  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      gemini_api_key: settings.gemini_api_key !== undefined ? settings.gemini_api_key : prev.gemini_api_key,
      gemini_model_version: settings.gemini_model_version || prev.gemini_model_version,
      openrouter_api_key: settings.openrouter_api_key !== undefined ? settings.openrouter_api_key : prev.openrouter_api_key,
      openrouter_model_version: settings.openrouter_model_version || prev.openrouter_model_version,
      ollama_endpoint: settings.ollama_endpoint || prev.ollama_endpoint,
      ollama_model_version: settings.ollama_model_version || prev.ollama_model_version,
      active_provider: settings.active_provider || prev.active_provider,
      telegram_token: settings.telegram_token !== undefined ? settings.telegram_token : prev.telegram_token,
      telegram_allowed_chat_ids: settings.telegram_allowed_chat_ids !== undefined ? settings.telegram_allowed_chat_ids : prev.telegram_allowed_chat_ids,
    }));
  }, [settings]);

  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [deletingToken, setDeletingToken] = useState(false);
  const [verifyingBot, setVerifyingBot] = useState(false);
  const [botVerificationResult, setBotVerificationResult] = useState<TelegramVerificationResult | null>(null);

  const MODELS_CACHE_KEY = 'zeinity_imported_models';

  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(() => {
    try {
      const cached = localStorage.getItem(MODELS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          gemini: Array.isArray(parsed.gemini) && parsed.gemini.length > 0 ? parsed.gemini : DEFAULT_GEMINI_MODELS,
          openrouter: Array.isArray(parsed.openrouter) && parsed.openrouter.length > 0 ? parsed.openrouter : DEFAULT_OPENROUTER_MODELS,
          ollama: Array.isArray(parsed.ollama) && parsed.ollama.length > 0 ? parsed.ollama : DEFAULT_OLLAMA_MODELS,
        };
      }
    } catch { /* ignore */ }
    return { gemini: DEFAULT_GEMINI_MODELS, openrouter: DEFAULT_OPENROUTER_MODELS, ollama: DEFAULT_OLLAMA_MODELS };
  });
  const [importingProvider, setImportingProvider] = useState<string | null>(null);
  const [importStatuses, setImportStatuses] = useState<Record<string, string>>({});

  const [savingAll, setSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  // F-12: Deteksi status perubahan konfigurasi (dirty state)
  const isDirty = useMemo(() => {
    const keysToCheck = [
      'gemini_api_key',
      'gemini_model_version',
      'openrouter_api_key',
      'openrouter_model_version',
      'ollama_endpoint',
      'ollama_model_version',
      'active_provider',
      'telegram_token',
      'telegram_allowed_chat_ids',
    ];
    return keysToCheck.some((k) => (values[k] ?? '').trim() !== (settings[k] ?? '').trim());
  }, [values, settings]);

  const handleSaveAll = async () => {
    const rawVal = values.telegram_token ?? '';
    const tgVal = typeof rawVal === 'string' ? rawVal.trim() : '';

    if (tgVal && !isValidTelegramToken(tgVal)) {
      showError(
        'Format Token Telegram Tidak Valid',
        'Token yang dimasukkan tidak sesuai format standar Telegram Bot API (contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678). Harap perbaiki sebelum menyimpan seluruh pengaturan.',
        {
          solution: 'Pastikan Anda menyalin seluruh string token dari @BotFather secara utuh tanpa ada karakter yang terpotong atau spasi tambahan.',
        }
      );
      return;
    }

    setSavingAll(true);
    startActivity('Simpan Semua Pengaturan', 'Menyimpan seluruh konfigurasi sistem...');
    addLog('Menyimpan API keys, pilihan model AI, dan konfigurasi Telegram...', 30);

    const keysToSave = [
      'gemini_api_key',
      'gemini_model_version',
      'openrouter_api_key',
      'openrouter_model_version',
      'ollama_endpoint',
      'ollama_model_version',
      'active_provider',
      'telegram_token',
      'telegram_allowed_chat_ids',
    ];

    try {
      let allOk = true;
      for (const k of keysToSave) {
        const valToSave = k === 'telegram_token' ? tgVal : (values[k] || '');
        const ok = await onSave(k, valToSave);
        if (ok === false) allOk = false;
      }

      if (tgVal) {
        setValues((v) => ({ ...v, telegram_token: tgVal }));
      }

      if (allOk) {
        finishActivity('Seluruh pengaturan berhasil disimpan!');
        setSavedAll(true);
        onShowToast?.('Semua pengaturan berhasil disimpan sekaligus!');
        setTimeout(() => setSavedAll(false), 3000);
      } else {
        errorActivity('Beberapa pengaturan mungkin gagal disimpan.');
        showWarning('Peringatan Penyimpanan', 'Beberapa pengaturan mungkin tidak tersimpan secara sempurna ke database.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan semua pengaturan.';
      errorActivity(`Error simpan semua pengaturan: ${msg}`);
      showError('Gagal Menyimpan Pengaturan', msg);
    } finally {
      setSavingAll(false);
    }
  };

  const handleSave = async (key: string) => {
    const rawVal = values[key] ?? '';
    const val = typeof rawVal === 'string' ? rawVal.trim() : '';

    if (key === 'telegram_token') {
      if (!val) {
        showWarning(
          'Format Token Tidak Boleh Kosong',
          'Silakan masukkan token bot Telegram yang valid dari @BotFather atau gunakan tombol "Hapus Token" untuk mengosongkannya.',
          {
            solution: 'Buka @BotFather di aplikasi Telegram, buat bot baru atau dapatkan token bot yang sudah ada dengan perintah /token.',
          }
        );
        return;
      }
      if (!isValidTelegramToken(val)) {
        showError(
          'Format Token Telegram Tidak Valid',
          'Token yang dimasukkan tidak sesuai format standar Telegram Bot API (contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678). Format standar terdiri dari 7-10 digit ID bot, tanda titik dua (:), dan 35 karakter acak.',
          {
            solution: 'Pastikan Anda menyalin seluruh string token dari @BotFather secara utuh tanpa ada karakter yang terpotong atau spasi tambahan.',
          }
        );
        return;
      }
    }

    setSaving(key);
    const ok = await onSave(key, key === 'telegram_token' ? val : (values[key] || ''));
    setSaving(null);
    if (ok !== false) {
      if (key === 'telegram_token') {
        setValues((v) => ({ ...v, telegram_token: val }));
      }
      setSavedKey(key);
      onShowToast?.(`Pengaturan "${key}" berhasil disimpan.`);
      setTimeout(() => setSavedKey(null), 2500);
    }
  };

  const handleDeleteTelegramToken = () => {
    const currentVal = (values.telegram_token || '').trim();
    const storedVal = (settings.telegram_token || '').trim();

    if (!currentVal && !storedVal) {
      showWarning(
        'Tidak Ada Token',
        'Tidak ada token bot Telegram yang tersimpan atau terisi untuk dihapus.'
      );
      return;
    }

    showAlert({
      title: 'Hapus Token Telegram?',
      message:
        'Apakah Anda yakin ingin menghapus token bot Telegram? Token akan dihapus permanen dari penyimpanan aman peramban (localStorage) dan koneksi bot akan diputus.',
      type: 'warning',
      confirmText: 'Ya, Hapus Token',
      cancelText: 'Batal',
      onConfirm: async () => {
        setDeletingToken(true);
        let ok = false;
        try {
          if (onResetTelegramToken) {
            ok = await onResetTelegramToken();
          } else if (onDelete) {
            ok = await onDelete('telegram_token');
          } else {
            ok = await onSave('telegram_token', '');
          }
        } catch (err) {
          console.error('Gagal menghapus token Telegram:', err);
          ok = false;
        } finally {
          setDeletingToken(false);
        }

        if (ok !== false) {
          setValues((v) => ({ ...v, telegram_token: '' }));
          setBotVerificationResult(null);
          onShowToast?.('Token Telegram berhasil dihapus.');
        } else {
          showError('Gagal Menghapus Token', 'Terjadi kesalahan saat menghapus token Telegram.');
        }
      },
    });
  };

  const handleVerifyTelegramBot = async () => {
    const rawVal = values.telegram_token ?? '';
    const token = typeof rawVal === 'string' ? rawVal.trim() : '';

    if (!token) {
      showWarning(
        'Token Belum Diisi',
        'Silakan masukkan token bot Telegram Anda terlebih dahulu sebelum menguji koneksi.',
        {
          solution: 'Buka @BotFather di aplikasi Telegram, salin token bot Anda, dan tempelkan di kolom input.',
        }
      );
      return;
    }

    if (!isValidTelegramToken(token)) {
      showError(
        'Format Token Telegram Tidak Valid',
        'Token yang dimasukkan tidak sesuai format standar Telegram Bot API (contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678).',
        {
          solution: 'Pastikan Anda menyalin seluruh string token dari @BotFather secara utuh tanpa karakter terpotong atau spasi tambahan.',
        }
      );
      return;
    }

    setVerifyingBot(true);
    setBotVerificationResult(null);
    startActivity('Verifikasi Telegram Bot', 'Menghubungkan ke https://api.telegram.org/bot<TOKEN>/getMe...');
    addLog('Mengirim request getMe langsung ke server Telegram Bot API...', 35);

    try {
      const result = await verifyTelegramBotToken(token);
      setBotVerificationResult(result);

      if (result.success && result.botInfo) {
        const rawUser = result.botInfo.username;
        const botHandle = rawUser ? (rawUser.startsWith('@') ? rawUser : `@${rawUser}`) : result.botInfo.firstName;
        finishActivity(`Bot terverifikasi: ${botHandle} (ID: ${result.botInfo.id}) - Aktif & Terhubung`);
        onShowToast?.(`Bot ${botHandle} berhasil diverifikasi dan aktif!`);
      } else if (result.isCorsBlocked) {
        finishActivity('Catatan: Pengujian langsung dibatasi oleh kebijakan CORS Telegram');
        onShowToast?.('Token bot disimpan. Pengujian langsung dibatasi oleh CORS browser.');
      } else {
        const errMsg = result.error || 'Verifikasi bot gagal.';
        errorActivity(errMsg);
        showError('Verifikasi Bot Gagal', errMsg, {
          solution: 'Periksa kembali apakah token bot valid di @BotFather atau buat token baru.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan jaringan saat menghubungi Telegram API.';
      errorActivity(msg);
      setBotVerificationResult({ success: false, error: msg });
      showError('Gagal Menghubungi Telegram API', msg);
    } finally {
      setVerifyingBot(false);
    }
  };

  const modelConfigs: Array<{
    provider: 'gemini' | 'openrouter' | 'ollama';
    label: string;
    key: string;
    defaultModel: string;
    isConfigured: boolean;
    unconfiguredHint: string;
    fetchModels: () => Promise<string[]>;
  }> = [
    {
      provider: 'gemini',
      label: 'Google Gemini',
      key: 'gemini_model_version',
      defaultModel: 'gemini-1.5-flash',
      isConfigured: Boolean(values.gemini_api_key?.trim()),
      unconfiguredHint: 'Isi Google Gemini API Key terlebih dahulu untuk auto import',
      fetchModels: () => fetchAvailableGeminiModels(values.gemini_api_key || ''),
    },
    {
      provider: 'openrouter',
      label: 'OpenRouter / Groq-Llama',
      key: 'openrouter_model_version',
      defaultModel: 'openrouter/free',
      isConfigured: Boolean(values.openrouter_api_key?.trim()),
      unconfiguredHint: 'Isi OpenRouter API Key terlebih dahulu untuk auto import',
      fetchModels: () => fetchAvailableOpenRouterModels(values.openrouter_api_key || ''),
    },
    {
      provider: 'ollama',
      label: 'Ollama Local',
      key: 'ollama_model_version',
      defaultModel: 'llama3',
      isConfigured: Boolean(values.ollama_endpoint?.trim()),
      unconfiguredHint: 'Isi Ollama Endpoint terlebih dahulu untuk auto import',
      fetchModels: () => fetchAvailableOllamaModels(values.ollama_endpoint || 'http://localhost:11434'),
    },
  ];

  const handleImportModelsForProvider = async (provider: string) => {
    const config = modelConfigs.find((c) => c.provider === provider);
    if (!config) return;
    if (!config.isConfigured) {
      showWarning('Konfigurasi Belum Lengkap', config.unconfiguredHint, {
        solution: `Masukkan ${config.label} API Key / Endpoint terlebih dahulu pada kolom input di atas, lalu klik Simpan sebelum menjalankan Auto Import.`,
      });
      setImportStatuses((prev) => ({ ...prev, [provider]: config.unconfiguredHint }));
      return;
    }
    setImportingProvider(provider);
    setImportStatuses((prev) => ({ ...prev, [provider]: '' }));
    startActivity(`Model Importer Log (${config.label})`, `Menghubungkan ke API ${config.label}...`);
    addLog('Meminta katalog model yang tersedia dari endpoint...', 45);

    try {
      const models = await config.fetchModels();
      const updated = { ...providerModels, [provider]: models };
      setProviderModels(updated);
      try {
        localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(updated));
      } catch { /* ignore storage errors */ }
      const msg = `Berhasil mengimpor ${models.length} model ${config.label}.`;
      setImportStatuses((prev) => ({ ...prev, [provider]: msg }));
      finishActivity(`Berhasil mengimpor dan memperbarui ${models.length} model ${config.label}!`);
      onShowToast?.(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengimpor daftar model.';
      errorActivity(`Gagal mengimpor model: ${msg}`);
      showError(`Gagal Mengimpor Model ${config.label}`, msg, {
        solution: 'Pastikan koneksi internet aktif dan API Key / Endpoint yang Anda masukkan valid serta memiliki izin akses.',
      });
      setImportStatuses((prev) => ({ ...prev, [provider]: msg }));
    } finally {
      setImportingProvider(null);
    }
  };

  const activeProvider = values.active_provider || 'gemini';

  return (
    <main className="main-content">
      <section className="hero">
        <div>
          <p className="eyebrow">Konfigurasi Sistem</p>
          <h1>Settings</h1>
          <p className="subtitle">
            Kelola kunci API, provider AI, versi model, dan integrasi Telegram dari satu tempat.
          </p>
        </div>
        <div className="hero-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {isDirty && (
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--amber, #ffd984)',
                background: 'rgba(249, 199, 79, 0.12)',
                border: '1px solid rgba(249, 199, 79, 0.35)',
                padding: '6px 12px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--amber, #ffd984)',
                  display: 'inline-block',
                  boxShadow: '0 0 8px rgba(249, 199, 79, 0.8)',
                }}
              />
              Perubahan belum disimpan
            </span>
          )}
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            style={{
              padding: '9px 18px',
              fontWeight: 600,
              boxShadow: isDirty ? '0 0 16px rgba(79, 232, 255, 0.35)' : undefined,
            }}
            title="Simpan seluruh konfigurasi API Keys, Model AI, dan Telegram dalam satu klik"
          >
            {savedAll ? <Check size={17} /> : <Save size={17} />}
            {savingAll ? 'Menyimpan Semua…' : savedAll ? 'Semua Tersimpan ✓' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </section>

      <div className="settings-grid">
        {/* AI Provider Gateway */}
        <section className="settings-card glass">
          <h2>AI Provider Gateway</h2>
          <p className="subtitle">Pilih provider AI aktif untuk validasi dan generasi konten.</p>

          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { key: 'gemini', label: 'Google Gemini', desc: 'API cloud Google, kuota gratis tersedia' },
              { key: 'openrouter', label: 'OpenRouter / Groq-Llama', desc: 'Akses beragam model via satu API' },
              { key: 'ollama', label: 'Ollama Local', desc: 'Berjalan 100% lokal, tanpa batas kuota' },
            ].map((p) => (
              <div
                key={p.key}
                className={`provider-toggle ${activeProvider === p.key ? 'active' : ''}`}
                onClick={() => {
                  setValues((v) => ({ ...v, active_provider: p.key }));
                  onSave('active_provider', p.key);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="provider-toggle-info">
                  <div className="provider-toggle-icon">
                    <Bot size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '.88rem' }}>{p.label}</strong>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{p.desc}</div>
                  </div>
                </div>
                <div className={`toggle-switch ${activeProvider === p.key ? 'on' : ''}`} />
              </div>
            ))}
          </div>
        </section>

        {/* API Keys */}
        <section className="settings-card glass">
          <h2>API Keys</h2>
          <p className="subtitle">Kunci sensitif disimpan aman di penyimpanan lokal peramban (localStorage) dan tidak pernah dikirim ke tabel publik database.</p>

          {providers.map((p) => {
            const Icon = p.icon;
            const isPassword = p.key !== 'ollama_endpoint';
            return (
              <div key={p.key} className="field" style={{ marginTop: 14 }}>
                <label htmlFor={p.key}>{p.label}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Icon size={16} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
                    <input
                      id={p.key}
                      type={isPassword ? 'password' : 'text'}
                      placeholder={p.placeholder}
                      value={values[p.key] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => handleSave(p.key)}
                    disabled={saving === p.key}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {savedKey === p.key ? <Check size={16} /> : <Save size={16} />}
                    {saving === p.key ? 'Menyimpan…' : savedKey === p.key ? 'Tersimpan ✓' : 'Simpan'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Kustomisasi Model AI */}
        <section className="settings-card glass">
          <h2>Kustomisasi Model AI</h2>
          <p className="subtitle">
            Sesuaikan versi model AI untuk masing-masing provider (Google Gemini, OpenRouter, dan Ollama).
          </p>

          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            {modelConfigs.map((cfg) => {
              const currentList = providerModels[cfg.provider] || [];
              const isCurrentActive = activeProvider === cfg.provider;
              const val = values[cfg.key] || cfg.defaultModel;
              const statusMsg = importStatuses[cfg.provider];
              const isImporting = importingProvider === cfg.provider;

              return (
                <div
                  key={cfg.key}
                  style={{
                    padding: '14px',
                    borderRadius: 12,
                    background: isCurrentActive ? 'rgba(79, 232, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: isCurrentActive ? '1px solid rgba(79, 232, 255, 0.3)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label htmlFor={cfg.key} style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Cpu size={16} style={{ color: isCurrentActive ? 'var(--cyan)' : 'var(--muted)' }} />
                      {cfg.label}
                      {isCurrentActive && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(79, 232, 255, 0.15)', color: 'var(--cyan)' }}>
                          Active Provider
                        </span>
                      )}
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <select
                      id={cfg.key}
                      aria-label={`Pilih model ${cfg.label}`}
                      value={val}
                      onChange={(e) => {
                        if (e.target.value) {
                          setValues((v) => ({ ...v, [cfg.key]: e.target.value }));
                        }
                      }}
                      style={{ flex: 1, minWidth: 200 }}
                    >
                      {currentList.map((m) => (
                        <option key={m} value={m}>
                          {m}{m === cfg.defaultModel ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleImportModelsForProvider(cfg.provider)}
                      disabled={!cfg.isConfigured || isImporting}
                      title={!cfg.isConfigured ? cfg.unconfiguredHint : `Import daftar model ${cfg.label}`}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Download size={16} /> {isImporting ? 'Mengambil…' : 'Auto Import Models'}
                    </button>

                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => handleSave(cfg.key)}
                      disabled={saving === cfg.key}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {savedKey === cfg.key ? <Check size={16} /> : <Save size={16} />}
                      {saving === cfg.key ? 'Menyimpan…' : savedKey === cfg.key ? 'Tersimpan ✓' : 'Simpan'}
                    </button>
                  </div>

                  {/* Dynamic Free Model Recommendations */}
                  {(() => {
                    const recs = getDynamicRecommendations(cfg.provider, currentList);
                    if (recs.length === 0) return null;
                    return (
                      <div className="recommendations-box">
                        <div className="recommendations-header">
                          <Sparkles size={14} style={{ color: 'var(--cyan)' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cyan)' }}>
                            Rekomendasi Model Terbaik & Gratis (Klik untuk Pilih):
                          </span>
                        </div>
                        <div className="recommendation-chips">
                          {recs.map((rec) => {
                            const isSelected = val === rec.id;
                            return (
                              <button
                                key={rec.id}
                                type="button"
                                className={`rec-chip ${isSelected ? 'selected' : ''}`}
                                title={rec.desc || rec.name}
                                onClick={() => {
                                  setValues((v) => ({ ...v, [cfg.key]: rec.id }));
                                  if (!currentList.includes(rec.id)) {
                                    const updated = [rec.id, ...currentList];
                                    setProviderModels((prev) => ({
                                      ...prev,
                                      [cfg.provider]: updated,
                                    }));
                                    try {
                                      localStorage.setItem(
                                        MODELS_CACHE_KEY,
                                        JSON.stringify({ ...providerModels, [cfg.provider]: updated })
                                      );
                                    } catch { /* ignore */ }
                                  }
                                }}
                              >
                                <span className="rec-badge">{rec.badge}</span>
                                <span className="rec-name">{rec.name}</span>
                                {isSelected && <span className="rec-check">✓ Terpilih</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {statusMsg && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: statusMsg.includes('Berhasil') ? 'var(--green)' : 'var(--amber)' }}>
                      {statusMsg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Telegram Bot */}
        <section className="settings-card glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Telegram Bot Integration</h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'rgba(249, 199, 79, 0.15)',
                border: '1px solid rgba(249, 199, 79, 0.35)',
                color: 'var(--amber, #ffd984)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ⭐ Roadmap / Segera Hadir
            </span>
          </div>
          <p className="subtitle">
            Sambungkan bot Telegram untuk menerima ide langsung dari chat. Token bot disimpan aman di peramban lokal (localStorage).
          </p>

          <div
            style={{
              margin: '12px 0 16px 0',
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(79, 232, 255, 0.05)',
              border: '1px solid rgba(79, 232, 255, 0.18)',
              fontSize: '0.78rem',
              color: 'var(--muted)',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Info size={16} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--foreground)' }}>Status Integrasi:</strong> Roadmap &amp; Arsitektur Telegram (F-010). Token ini disimpan dengan aman di penyimpanan lokal peramban Anda (localStorage) untuk integrasi webhook dan automated polling di masa mendatang. Anda dapat menguji validitas token secara langsung menggunakan tombol <em>&quot;Uji Koneksi Bot&quot;</em>.
              </div>
            </div>
            <div
              style={{
                marginLeft: 26,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: 4 }}>
                Transparansi Arsitektur Masa Depan:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                <li>
                  <strong>Edge Function Webhook:</strong> Supabase Edge Function untuk menerima payload pesan/audio Telegram secara real-time via HTTPS webhook.
                </li>
                <li>
                  <strong>Auto-Polling Engine:</strong> Mekanisme polling terjadwal otomatis sebagai alternatif fallback pada infrastruktur tanpa domain publik.
                </li>
                <li>
                  <strong>Direct Pipeline Handoff:</strong> Ide dari chat langsung diekstraksi menjadi kartu draft terstruktur pada 5 pilar konten Zeinity.
                </li>
              </ul>
              <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--amber, #ffd984)' }}>
                ℹ️ Saat ini, ide dari Telegram tetap dapat dicatat manual melalui pilihan sumber &quot;Telegram&quot; di Content Pipeline.
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="telegram_token">Bot Token (dari @BotFather)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <MessageSquare size={16} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
                <input
                  id="telegram_token"
                  type="password"
                  placeholder="123456789:ABCdef…"
                  value={values.telegram_token || ''}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, telegram_token: e.target.value }));
                    setBotVerificationResult(null);
                  }}
                  style={{ paddingLeft: 36, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleVerifyTelegramBot}
                  disabled={verifyingBot || saving === 'telegram_token' || deletingToken || !values.telegram_token?.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                  title="Uji koneksi dan keabsahan bot langsung ke server Telegram API via getMe (tunduk batasan CORS peramban)"
                >
                  <Radio size={16} className={verifyingBot ? 'animate-pulse' : ''} />
                  {verifyingBot ? 'Menguji…' : 'Uji Koneksi Bot'}
                </button>
                <span
                  title="Catatan Keamanan Browser (CORS): Panggilan API getMe langsung dari browser dapat dibatasi oleh kebijakan keamanan Same-Origin/CORS Telegram. Token yang tersimpan tetap aktif dan berfungsi normal untuk integrasi bot."
                  style={{
                    cursor: 'help',
                    color: 'var(--cyan)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  aria-label="Catatan keamanan CORS Telegram"
                >
                  <HelpCircle size={15} />
                </span>
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleSave('telegram_token')}
                disabled={saving === 'telegram_token' || deletingToken || verifyingBot}
                style={{ whiteSpace: 'nowrap' }}
              >
                {savedKey === 'telegram_token' ? <Check size={16} /> : <Save size={16} />}
                {saving === 'telegram_token' ? 'Menyimpan…' : savedKey === 'telegram_token' ? 'Tersimpan ✓' : 'Simpan'}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDeleteTelegramToken}
                disabled={deletingToken || saving === 'telegram_token' || verifyingBot || (!values.telegram_token?.trim() && !settings.telegram_token?.trim())}
                style={{ whiteSpace: 'nowrap' }}
                title="Hapus token bot Telegram dari penyimpanan aman"
              >
                <Trash2 size={16} />
                {deletingToken ? 'Menghapus…' : 'Hapus Token'}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--muted)' }}>
              ℹ️ <em>Catatan: Uji koneksi langsung dari browser dapat dibatasi oleh kebijakan CORS Telegram. Token tersimpan tetap aktif untuk integrasi bot.</em>
            </div>

            {/* F-007: Hasil Verifikasi Bot Langsung ke Telegram API */}
            {botVerificationResult?.success && botVerificationResult.botInfo && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--green, #22c55e)',
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  >
                    🤖
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--green, #22c55e)' }}>
                      Bot Terverifikasi: {botVerificationResult.botInfo.username ? (botVerificationResult.botInfo.username.startsWith('@') ? botVerificationResult.botInfo.username : `@${botVerificationResult.botInfo.username}`) : botVerificationResult.botInfo.firstName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                      Nama: {botVerificationResult.botInfo.firstName} • ID: {botVerificationResult.botInfo.id} • Status: Aktif & Siap Menerima Ide
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: 'var(--green, #22c55e)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                  }}
                >
                  ✓ Aktif & Terhubung
                </span>
              </div>
            )}

            {/* F-27: Penanganan ramah pembatasan CORS browser */}
            {botVerificationResult?.isCorsBlocked && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(249, 199, 79, 0.1)',
                  border: '1px solid rgba(249, 199, 79, 0.35)',
                  fontSize: '0.78rem',
                  color: 'var(--amber, #ffd984)',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Info size={16} style={{ color: 'var(--amber, #ffd984)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Informasi Keamanan Browser (CORS):</strong> {botVerificationResult.error}
                </div>
              </div>
            )}

            {/* Hasil Uji Koneksi: Gagal Non-CORS */}
            {botVerificationResult && !botVerificationResult.success && !botVerificationResult.isCorsBlocked && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  fontSize: '0.78rem',
                  color: 'var(--danger, #ff6b6b)',
                }}
              >
                <strong>Gagal Verifikasi Bot:</strong> {botVerificationResult.error}
              </div>
            )}

            {values.telegram_token && !isValidTelegramToken(values.telegram_token) && (
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--danger, #ff6b6b)' }}>
                Format token belum sesuai standar Telegram Bot API (contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678).
              </p>
            )}
            {values.telegram_token && isValidTelegramToken(values.telegram_token) && (
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--green, #22c55e)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={13} /> Format token valid.
              </p>
            )}
          </div>

          {/* F-005: Whitelist Chat/User ID Telegram */}
          <div className="field" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label htmlFor="telegram_allowed_chat_ids" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Shield size={15} style={{ color: 'var(--cyan)' }} />
                Allowed Chat/User IDs (Whitelist Keamanan)
                <span
                  title="Pondasi Keamanan Anti-Spam: Bot Telegram hanya akan memproses ide masuk dari ID chat atau pengguna yang terdaftar di sini untuk mencegah spam atau serangan injeksi publik. Format: string ID chat/user Telegram terpisah koma (contoh: 12345678, 987654321, -1001234567890)."
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'help',
                    color: 'var(--cyan)',
                  }}
                  aria-label="Penjelasan Allowed Chat/User IDs"
                >
                  <HelpCircle size={14} />
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Users size={16} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
                <input
                  id="telegram_allowed_chat_ids"
                  type="text"
                  placeholder="Contoh: 12345678, 987654321, -1001234567890"
                  value={values.telegram_allowed_chat_ids || ''}
                  onChange={(e) => setValues((v) => ({ ...v, telegram_allowed_chat_ids: e.target.value }))}
                  style={{ paddingLeft: 36, width: '100%' }}
                />
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleSave('telegram_allowed_chat_ids')}
                disabled={saving === 'telegram_allowed_chat_ids'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {savedKey === 'telegram_allowed_chat_ids' ? <Check size={16} /> : <Save size={16} />}
                {saving === 'telegram_allowed_chat_ids' ? 'Menyimpan…' : savedKey === 'telegram_allowed_chat_ids' ? 'Tersimpan ✓' : 'Simpan Whitelist'}
              </button>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              💡 <strong>Helper Anti-Spam:</strong> Bot hanya akan memproses dan memasukkan ide dari Chat ID atau User ID ini ke dalam database pipeline. Pisahkan beberapa ID dengan tanda koma.
            </p>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>ℹ️</span>
              <span>
                <strong style={{ color: 'var(--foreground)' }}>Cara menemukan Chat ID Anda:</strong>{' '}
                Ketik <code style={{ background: 'rgba(79,232,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem', color: 'var(--cyan)' }}>/start</code> ke bot Anda di Telegram, atau gunakan{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--cyan)', textDecoration: 'underline' }}
                >
                  @userinfobot
                </a>{' '}
                untuk mengetahui ID akun Telegram Anda secara instan.
              </span>
            </p>
          </div>
        </section>

        {/* F-12: Master Save Bar at bottom */}
        <section
          className="settings-card glass"
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            padding: '16px 20px',
            border: isDirty ? '1px solid rgba(79, 232, 255, 0.4)' : '1px solid var(--border)',
            background: isDirty ? 'rgba(79, 232, 255, 0.05)' : undefined,
          }}
        >
          <div>
            <strong style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={18} style={{ color: 'var(--cyan)' }} />
              Simpan Konsolidasi Pengaturan
            </strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
              Simpan seluruh perubahan pada API Keys, Model AI terpilih, dan Integrasi Telegram secara serentak dalam satu klik.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {isDirty && (
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--amber, #ffd984)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--amber, #ffd984)',
                    display: 'inline-block',
                    boxShadow: '0 0 6px rgba(249, 199, 79, 0.7)',
                  }}
                />
                Perubahan belum disimpan
              </span>
            )}
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll}
              style={{
                padding: '10px 22px',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: isDirty ? '0 0 16px rgba(79, 232, 255, 0.35)' : undefined,
              }}
              title="Simpan seluruh konfigurasi API Keys, Model AI, dan Telegram dalam satu klik"
            >
              {savedAll ? <Check size={18} /> : <Save size={18} />}
              {savingAll ? 'Menyimpan Semua…' : savedAll ? 'Semua Tersimpan ✓' : 'Simpan Semua Pengaturan'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
