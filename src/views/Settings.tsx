import { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Key,
  MessageSquare,
  Cpu,
  Download,
  Check,
  Sparkles,
  Info,
  Trash2,
  Radio,
  Shield,
  Users,
  HelpCircle,
  Zap,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  fetchNineRouterCatalog,
  DEFAULT_NINEROUTER_CATALOG,
  NINEROUTER_CATALOG_STORAGE_KEY,
} from '@/lib/gemini';
import { useAlert } from '@/components/AlertModal';
import { useTerminal } from '@/components/Terminal';
import {
  isValidTelegramToken,
  verifyTelegramBotToken,
  type TelegramVerificationResult,
  initialCustomGatewayEndpoint,
  initialCustomGatewayApiKey,
} from '@/hooks/useSettings';
import type { NineRouterCatalog } from '@/types';

interface SettingsProps {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<boolean>;
  onDelete?: (key: string) => Promise<boolean>;
  onResetTelegramToken?: () => Promise<boolean>;
  onShowToast?: (msg: string) => void;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function checkIsPasswordKey(p: { key: string }) {
  const isPassword = p.key !== 'ollama_endpoint' && p.key !== 'custom_gateway_endpoint';
  return isPassword;
}

export default function Settings({ settings, onSave, onDelete, onResetTelegramToken, onShowToast }: SettingsProps) {
  const { showAlert, showError, showWarning } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity } = useTerminal();
  const [values, setValues] = useState<Record<string, string>>({
    gemini_api_key: settings.gemini_api_key || '',
    gemini_model_version: settings.gemini_model_version || 'gemini-3.8-flash',
    openrouter_api_key: settings.openrouter_api_key || '',
    openrouter_model_version: settings.openrouter_model_version || 'openrouter/free',
    ollama_endpoint: settings.ollama_endpoint || 'http://localhost:11434',
    ollama_model_version: settings.ollama_model_version || 'llama3',
    custom_gateway_endpoint: settings.custom_gateway_endpoint || 'http://localhost:20128/v1',
    custom_gateway_api_key: settings.custom_gateway_api_key || '',
    custom_gateway_model_version: settings.custom_gateway_model_version || 'Creator-Combo',
    custom_gateway_model_mode: settings.custom_gateway_model_mode || 'combo',
    custom_gateway_direct_model: settings.custom_gateway_direct_model || 'groq/llama-3.3-70b-versatile',
    active_provider: 'custom',
    auto_switch_enabled: settings.auto_switch_enabled ?? 'true',
    ai_request_timeout: settings.ai_request_timeout || '90',
    fallback_provider_order: settings.fallback_provider_order || 'custom,gemini,openrouter,ollama',
    skip_quick_switch_confirm: settings.skip_quick_switch_confirm || 'false',
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
      custom_gateway_endpoint: settings.custom_gateway_endpoint !== undefined ? settings.custom_gateway_endpoint : prev.custom_gateway_endpoint,
      custom_gateway_api_key: settings.custom_gateway_api_key !== undefined ? settings.custom_gateway_api_key : prev.custom_gateway_api_key,
      custom_gateway_model_version: settings.custom_gateway_model_version || prev.custom_gateway_model_version,
      custom_gateway_model_mode: settings.custom_gateway_model_mode || prev.custom_gateway_model_mode,
      custom_gateway_direct_model: settings.custom_gateway_direct_model || prev.custom_gateway_direct_model,
      active_provider: 'custom',
      auto_switch_enabled: settings.auto_switch_enabled !== undefined ? settings.auto_switch_enabled : prev.auto_switch_enabled,
      ai_request_timeout: settings.ai_request_timeout || prev.ai_request_timeout,
      fallback_provider_order: settings.fallback_provider_order || prev.fallback_provider_order,
      skip_quick_switch_confirm: settings.skip_quick_switch_confirm !== undefined ? settings.skip_quick_switch_confirm : prev.skip_quick_switch_confirm,
      telegram_token: settings.telegram_token !== undefined ? settings.telegram_token : prev.telegram_token,
      telegram_allowed_chat_ids: settings.telegram_allowed_chat_ids !== undefined ? settings.telegram_allowed_chat_ids : prev.telegram_allowed_chat_ids,
    }));
  }, [settings]);

  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [deletingToken, setDeletingToken] = useState(false);
  const [verifyingBot, setVerifyingBot] = useState(false);
  const [botVerificationResult, setBotVerificationResult] = useState<TelegramVerificationResult | null>(null);
  const [testingCustomGateway, setTestingCustomGateway] = useState(false);
  const [importingModels, setImportingModels] = useState(false);

  const [catalog, setCatalog] = useState<NineRouterCatalog>(() => {
    try {
      const cached = localStorage.getItem(NINEROUTER_CATALOG_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.combos)) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_NINEROUTER_CATALOG;
  });

  const [savingAll, setSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  // Custom request timeout helpers & state
  const PRESET_TIMEOUTS = useMemo(
    () => [
      { sec: '60', label: '60 Detik', badge: 'Cepat', desc: 'Cocok untuk ideasi & model cloud ringan' },
      { sec: '90', label: '90 Detik', badge: 'Rekomendasi', desc: 'Seimbang untuk naskah standar & 9Router' },
      { sec: '120', label: '120 Detik', badge: 'Naskah Panjang', desc: 'Ideal untuk Full Script 2000 kata & failover' },
      { sec: '180', label: '180 Detik', badge: 'Ekstra Sabar', desc: 'Untuk model penalaran tinggi / LLM lokal' },
      { sec: '300', label: '300 Detik', badge: '5 Menit', desc: 'Deep Reasoning / Multi-Tier Failover' },
    ],
    []
  );

  const formatTimeoutDuration = (secondsStr: string): string => {
    const num = Number(secondsStr);
    if (!num || isNaN(num) || num <= 0) return `${secondsStr || 90} Detik`;
    if (num < 60) return `${num} Detik`;
    const mins = Math.floor(num / 60);
    const rem = num % 60;
    if (rem === 0) return `${mins} Menit`;
    return `${mins}m ${rem}s`;
  };

  const activeTimeoutSec = values.ai_request_timeout || '90';
  const isCustomTimeoutActive = !PRESET_TIMEOUTS.some((p) => p.sec === activeTimeoutSec);
  const [customTimeoutInput, setCustomTimeoutInput] = useState<string>(
    isCustomTimeoutActive ? activeTimeoutSec : '240'
  );
  const [showCustomTimeout, setShowCustomTimeout] = useState<boolean>(isCustomTimeoutActive);

  useEffect(() => {
    if (isCustomTimeoutActive) {
      setShowCustomTimeout(true);
      setCustomTimeoutInput(activeTimeoutSec);
    }
  }, [activeTimeoutSec, isCustomTimeoutActive]);

  const handleSelectPresetTimeout = (sec: string) => {
    setValues((v) => ({ ...v, ai_request_timeout: sec }));
    onSave('ai_request_timeout', sec);
    onShowToast?.(`Batas waktu timeout diatur ke ${sec} detik (${formatTimeoutDuration(sec)}).`);
  };

  const handleApplyCustomTimeout = (rawVal: string) => {
    const num = parseInt(rawVal.trim(), 10);
    if (isNaN(num) || num < 10) {
      showWarning('Durasi Terlalu Singkat', 'Batas waktu minimal adalah 10 detik agar permintaan AI tidak langsung terputus.');
      return;
    }
    if (num > 3600) {
      showWarning('Durasi Terlalu Lama', 'Batas waktu maksimal yang didukung adalah 3.600 detik (60 menit).');
      return;
    }
    const secStr = String(num);
    setValues((v) => ({ ...v, ai_request_timeout: secStr }));
    onSave('ai_request_timeout', secStr);
    onShowToast?.(`Batas waktu timeout kustom berhasil diatur ke ${secStr} detik (${formatTimeoutDuration(secStr)}).`);
  };

  // F-12: Deteksi status perubahan konfigurasi (dirty state)
  const isDirty = useMemo(() => {
    const keysToCheck = [
      'custom_gateway_endpoint',
      'custom_gateway_api_key',
      'custom_gateway_model_version',
      'custom_gateway_model_mode',
      'custom_gateway_direct_model',
      'gemini_api_key',
      'gemini_model_version',
      'openrouter_api_key',
      'openrouter_model_version',
      'ollama_endpoint',
      'ollama_model_version',
      'active_provider',
      'auto_switch_enabled',
      'ai_request_timeout',
      'fallback_provider_order',
      'skip_quick_switch_confirm',
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
      'custom_gateway_endpoint',
      'custom_gateway_api_key',
      'custom_gateway_model_version',
      'custom_gateway_model_mode',
      'custom_gateway_direct_model',
      'gemini_api_key',
      'gemini_model_version',
      'openrouter_api_key',
      'openrouter_model_version',
      'ollama_endpoint',
      'ollama_model_version',
      'active_provider',
      'auto_switch_enabled',
      'ai_request_timeout',
      'fallback_provider_order',
      'skip_quick_switch_confirm',
      'telegram_token',
      'telegram_allowed_chat_ids',
    ];

    try {
      let allOk = true;
      for (const k of keysToSave) {
        const valToSave = k === 'telegram_token' ? tgVal : k === 'active_provider' ? 'custom' : (values[k] || '');
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

  const handleTestCustomGateway = async () => {
    const ep = (values.custom_gateway_endpoint || 'http://localhost:20128/v1').trim();
    setTestingCustomGateway(true);
    startActivity('9Router Gateway Test', `Menghubungkan ke ${ep}...`);
    try {
      const res = await fetchNineRouterCatalog(ep, values.custom_gateway_api_key);
      setCatalog(res);
      try {
        localStorage.setItem(NINEROUTER_CATALOG_STORAGE_KEY, JSON.stringify(res));
      } catch { /* ignore */ }
      finishActivity(`Koneksi ke 9Router berhasil! Ditemukan ${res.allModels.length} model (${res.combos.length} Combos).`);
      showAlert({
        title: 'Koneksi 9Router Berhasil 🟢',
        message: `Berhasil terhubung ke endpoint ${ep}. Terdeteksi ${res.combos.length} Combo Presets dan ${res.allModels.length - res.combos.length} Direct Models dari ${Object.keys(res.directModels).length} provider aktif.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errorActivity(`Koneksi 9Router gagal: ${msg}`);
      showError('Koneksi 9Router Gagal 🔴', msg, {
        solution: ep.includes('localhost')
          ? 'Pastikan 9Router proxy server sudah berjalan di komputer Anda (jalankan perintah: 9router di terminal) dan port 20128 tidak terblokir firewall.'
          : 'Untuk endpoint remote / tunnel publik, pastikan Tunnel di 9Router sedang aktif (ON) dan 9Router Bearer API Key telah dimasukkan.',
      });
    } finally {
      setTestingCustomGateway(false);
    }
  };

  const handleImportNineRouterModels = async () => {
    const ep = (values.custom_gateway_endpoint || 'http://localhost:20128/v1').trim();
    setImportingModels(true);
    startActivity('9Router Model Importer', `Meminta katalog model dari ${ep}...`);
    addLog('Mengimpor Combo Presets dan Direct Models...', 40);
    try {
      const res = await fetchNineRouterCatalog(ep, values.custom_gateway_api_key);
      setCatalog(res);
      try {
        localStorage.setItem(NINEROUTER_CATALOG_STORAGE_KEY, JSON.stringify(res));
      } catch { /* ignore */ }
      finishActivity(`Berhasil mengimpor ${res.allModels.length} model dari 9Router!`);
      showAlert({
        title: 'Import Model Berhasil ✓',
        message: `Berhasil mengimpor ${res.allModels.length} model nyata dari 9Router (${res.combos.length} Combo Presets, ${res.allModels.length - res.combos.length} Direct Models).`,
        type: 'success',
      });
      onShowToast?.(`Berhasil mengimpor ${res.allModels.length} model 9Router!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errorActivity(`Import model gagal: ${msg}`);
      showError('Gagal Mengimpor Model 9Router', msg, {
        solution: ep.includes('localhost')
          ? 'Pastikan server 9Router aktif di terminal (perintah: 9router di terminal) sebelum mengimpor model.'
          : 'Untuk endpoint remote / tunnel publik, pastikan Tunnel di 9Router aktif dan Bearer API Key sudah dimasukkan.',
      });
    } finally {
      setImportingModels(false);
    }
  };

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
        {/* 9Router Core AI Gateway */}
        <section className="settings-card glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} style={{ color: 'var(--cyan)' }} />
              9Router Core AI Gateway
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'rgba(79, 232, 255, 0.15)',
                border: '1px solid rgba(79, 232, 255, 0.35)',
                color: 'var(--cyan)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              100% Single AI Gateway
            </span>
          </div>
          <p className="subtitle">
            Kunci sensitif disimpan aman di penyimpanan lokal peramban (localStorage) dan tidak pernah dikirim ke tabel publik database.
          </p>

          {/* Preset Endpoint Cepat */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Preset Endpoint Cepat:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  background: (values.custom_gateway_endpoint || '').includes('localhost:20128') ? 'rgba(79, 232, 255, 0.15)' : undefined,
                  borderColor: (values.custom_gateway_endpoint || '').includes('localhost:20128') ? 'var(--cyan)' : undefined,
                  color: (values.custom_gateway_endpoint || '').includes('localhost:20128') ? 'var(--cyan)' : undefined,
                }}
                onClick={() => {
                  setValues((v) => ({ ...v, custom_gateway_endpoint: 'http://localhost:20128/v1', active_provider: 'custom' }));
                  onSave('custom_gateway_endpoint', 'http://localhost:20128/v1');
                  onSave('active_provider', 'custom');
                  onShowToast?.('Endpoint diatur ke Default Lokal (localhost:20128).');
                }}
              >
                💻 Default Lokal (localhost:20128)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  background: (values.custom_gateway_endpoint || '').includes('abc-tunnel.us') ? 'rgba(79, 232, 255, 0.15)' : undefined,
                  borderColor: (values.custom_gateway_endpoint || '').includes('abc-tunnel.us') ? 'var(--cyan)' : undefined,
                  color: (values.custom_gateway_endpoint || '').includes('abc-tunnel.us') ? 'var(--cyan)' : undefined,
                }}
                onClick={() => {
                  const tunnelUrl = initialCustomGatewayEndpoint?.includes('abc-tunnel.us')
                    ? initialCustomGatewayEndpoint
                    : 'https://rje2m9z.abc-tunnel.us/v1';
                  const defaultKey = initialCustomGatewayApiKey || 'sk-aae08e472832982c-ocd8hb-aff3c45d';
                  const nextKey = values.custom_gateway_api_key || defaultKey;
                  setValues((v) => ({
                    ...v,
                    custom_gateway_endpoint: tunnelUrl,
                    custom_gateway_api_key: nextKey,
                    active_provider: 'custom',
                  }));
                  onSave('custom_gateway_endpoint', tunnelUrl);
                  if (!values.custom_gateway_api_key) {
                    onSave('custom_gateway_api_key', defaultKey);
                  }
                  onSave('active_provider', 'custom');
                  onShowToast?.('Endpoint diatur ke 9Router Remote Tunnel (abc-tunnel.us) - CORS Safe.');
                }}
              >
                🌐 9Router Remote (abc-tunnel.us) ⚡
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  background: (values.custom_gateway_endpoint || '').includes('trycloudflare.com') ? 'rgba(79, 232, 255, 0.15)' : undefined,
                  borderColor: (values.custom_gateway_endpoint || '').includes('trycloudflare.com') ? 'var(--cyan)' : undefined,
                  color: (values.custom_gateway_endpoint || '').includes('trycloudflare.com') ? 'var(--cyan)' : undefined,
                }}
                onClick={() => {
                  const tunnelUrl = 'https://watt-membrane-beds-customise.trycloudflare.com/v1';
                  const defaultKey = initialCustomGatewayApiKey || 'sk-aae08e472832982c-ocd8hb-aff3c45d';
                  const nextKey = values.custom_gateway_api_key || defaultKey;
                  setValues((v) => ({
                    ...v,
                    custom_gateway_endpoint: tunnelUrl,
                    custom_gateway_api_key: nextKey,
                    active_provider: 'custom',
                  }));
                  onSave('custom_gateway_endpoint', tunnelUrl);
                  if (!values.custom_gateway_api_key) {
                    onSave('custom_gateway_api_key', defaultKey);
                  }
                  onSave('active_provider', 'custom');
                  onShowToast?.('Endpoint diatur ke Cloudflare Direct Tunnel.');
                }}
              >
                ☁️ Cloudflare Direct Tunnel
              </button>
            </div>
          </div>

          {/* Endpoint URL Field */}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="custom_gateway_endpoint">Gateway Endpoint URL</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Zap size={16} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
                <input
                  id="custom_gateway_endpoint"
                  type="text"
                  placeholder="http://localhost:20128/v1"
                  value={values.custom_gateway_endpoint || ''}
                  onChange={(e) => setValues((v) => ({ ...v, custom_gateway_endpoint: e.target.value }))}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleTestCustomGateway}
                disabled={testingCustomGateway}
                style={{ whiteSpace: 'nowrap' }}
                title="Uji koneksi ke endpoint 9Router"
              >
                <Zap size={15} /> {testingCustomGateway ? 'Menguji…' : 'Test Koneksi 🔌'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleImportNineRouterModels}
                disabled={importingModels}
                style={{ whiteSpace: 'nowrap' }}
                title="Auto Import daftar model dan combo dari 9Router"
              >
                <Download size={15} /> {importingModels ? 'Mengimpor…' : 'Auto Import Models & LLM Gateway'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleSave('custom_gateway_endpoint')}
                disabled={saving === 'custom_gateway_endpoint'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {savedKey === 'custom_gateway_endpoint' ? <Check size={16} /> : <Save size={16} />}
                {saving === 'custom_gateway_endpoint' ? 'Menyimpan…' : savedKey === 'custom_gateway_endpoint' ? 'Tersimpan ✓' : 'Simpan'}
              </button>
            </div>
          </div>

          {/* Bearer API Key Field */}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="custom_gateway_api_key">9Router Bearer API Key (Opsional)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Key size={16} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--muted)' }} />
                <input
                  id="custom_gateway_api_key"
                  type="password"
                  placeholder="sk-dummy… (kosongkan jika tanpa autentikasi)"
                  value={values.custom_gateway_api_key || ''}
                  onChange={(e) => setValues((v) => ({ ...v, custom_gateway_api_key: e.target.value }))}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleSave('custom_gateway_api_key')}
                disabled={saving === 'custom_gateway_api_key'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {savedKey === 'custom_gateway_api_key' ? <Check size={16} /> : <Save size={16} />}
                {saving === 'custom_gateway_api_key' ? 'Menyimpan…' : savedKey === 'custom_gateway_api_key' ? 'Tersimpan ✓' : 'Simpan'}
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 6 }}>
              Kosongkan jika server 9Router Anda berjalan tanpa proteksi API Key di port lokal. Jika diakses via remote / Cloudflare Tunnel dengan token, masukkan bearer token di atas.
            </div>
          </div>

          {/* Batas Waktu Permintaan (Request Timeout) */}
          <div className="field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <label htmlFor="ai_request_timeout" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Clock size={16} style={{ color: 'var(--cyan)' }} />
                Batas Waktu Permintaan (Request Timeout)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                Aktif:{' '}
                <span style={{ color: 'var(--cyan)' }}>
                  {activeTimeoutSec} Detik ({formatTimeoutDuration(activeTimeoutSec)}{isCustomTimeoutActive ? ' • Kustom' : ''})
                </span>
              </span>
            </div>
            <p className="subtitle" style={{ fontSize: '0.78rem', marginBottom: 10 }}>
              Tentukan toleransi waktu tunggu bagi 9Router untuk merespons. Beri durasi lebih tinggi jika menghasilkan naskah panjang (1.500+ kata) atau jika menggunakan combo dengan 3-tier auto-fallback.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 8 }}>
              {PRESET_TIMEOUTS.map((opt) => {
                const isSelected = !isCustomTimeoutActive && activeTimeoutSec === opt.sec;
                return (
                  <button
                    key={opt.sec}
                    type="button"
                    onClick={() => handleSelectPresetTimeout(opt.sec)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(79, 232, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? 'var(--cyan)' : 'var(--foreground)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{opt.label}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#000' : 'var(--muted)',
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.70rem', color: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'var(--muted)', lineHeight: 1.3 }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}

              {/* Opsi Custom Timeout Card */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomTimeout(true);
                  if (!isCustomTimeoutActive) {
                    handleApplyCustomTimeout(customTimeoutInput || '240');
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: isCustomTimeoutActive ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: isCustomTimeoutActive ? 'rgba(79, 232, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  color: isCustomTimeoutActive ? 'var(--cyan)' : 'var(--foreground)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    {isCustomTimeoutActive ? `${activeTimeoutSec} Detik` : 'Kustom…'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isCustomTimeoutActive ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.08)',
                      color: isCustomTimeoutActive ? '#000' : 'var(--muted)',
                    }}
                  >
                    {isCustomTimeoutActive ? 'Kustom Aktif' : 'Bebas'}
                  </span>
                </div>
                <span style={{ fontSize: '0.70rem', color: isCustomTimeoutActive ? 'rgba(255, 255, 255, 0.85)' : 'var(--muted)', lineHeight: 1.3 }}>
                  {isCustomTimeoutActive
                    ? `Durasi kustom aktif (${formatTimeoutDuration(activeTimeoutSec)})`
                    : 'Tentukan durasi detik sesuai kebutuhan'}
                </span>
              </button>
            </div>

            {/* Custom Timeout Input Panel */}
            {showCustomTimeout && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(79, 232, 255, 0.04)',
                  border: '1px solid rgba(79, 232, 255, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={14} /> Atur Durasi Timeout Kustom (Detik):
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    Rentang yang didukung: 10 s/d 3.600 detik (1 menit - 60 menit)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
                    <input
                      id="ai_request_timeout_custom_input"
                      type="number"
                      min={10}
                      max={3600}
                      step={10}
                      value={customTimeoutInput}
                      onChange={(e) => setCustomTimeoutInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyCustomTimeout(customTimeoutInput);
                        }
                      }}
                      placeholder="Contoh: 240"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'rgba(0, 0, 0, 0.25)',
                        color: '#fff',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        width: '120px',
                      }}
                    />
                    <span style={{ fontSize: '0.80rem', color: 'var(--muted)', fontWeight: 600 }}>Detik</span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'rgba(79, 232, 255, 0.15)',
                        color: 'var(--cyan)',
                        marginLeft: 4,
                      }}
                    >
                      ≈ {formatTimeoutDuration(customTimeoutInput || '0')}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleApplyCustomTimeout(customTimeoutInput)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.80rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <Check size={14} /> Terapkan Timeout
                  </button>
                </div>

                {/* Quick Suggestion Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--muted)', fontWeight: 600, marginRight: 2 }}>
                    Pilihan Cepat:
                  </span>
                  {[
                    { sec: '240', label: '240s (4 Menit)' },
                    { sec: '360', label: '360s (6 Menit)' },
                    { sec: '480', label: '480s (8 Menit)' },
                    { sec: '600', label: '600s (10 Menit)' },
                    { sec: '900', label: '900s (15 Menit)' },
                  ].map((chip) => (
                    <button
                      key={chip.sec}
                      type="button"
                      onClick={() => {
                        setCustomTimeoutInput(chip.sec);
                        handleApplyCustomTimeout(chip.sec);
                      }}
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: activeTimeoutSec === chip.sec ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: activeTimeoutSec === chip.sec ? 'rgba(79, 232, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: activeTimeoutSec === chip.sec ? 'var(--cyan)' : 'var(--muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pemilihan Model 9Router */}
        <section className="settings-card glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={20} style={{ color: 'var(--cyan)' }} />
              Pemilihan Model 9Router
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 999,
                background: values.custom_gateway_model_mode === 'direct' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(79, 232, 255, 0.15)',
                border: values.custom_gateway_model_mode === 'direct' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(79, 232, 255, 0.35)',
                color: values.custom_gateway_model_mode === 'direct' ? 'var(--purple, #a855f7)' : 'var(--cyan)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {values.custom_gateway_model_mode === 'direct' ? 'Mode: Model Spesifik' : 'Mode: Combo Presets (3-Tier Auto-Fallback)'}
            </span>
          </div>
          <p className="subtitle">
            Pilih antara <strong>Combo Presets</strong> (auto-routing 3-tier cerdas di dalam proxy 9Router untuk zero downtime) atau <strong>Model Spesifik</strong> langsung dari provider upstream.
          </p>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => {
                setValues((v) => ({ ...v, custom_gateway_model_mode: 'combo' }));
                onSave('custom_gateway_model_mode', 'combo');
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: values.custom_gateway_model_mode !== 'direct' ? '1px solid var(--cyan)' : '1px solid var(--border)',
                background: values.custom_gateway_model_mode !== 'direct' ? 'rgba(79, 232, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                color: values.custom_gateway_model_mode !== 'direct' ? 'var(--cyan)' : 'var(--foreground)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={15} /> ⚡ Combo Presets (3-Tier Auto-Fallback)
              </span>
              <span style={{ fontSize: '0.72rem', color: values.custom_gateway_model_mode !== 'direct' ? 'var(--cyan)' : 'var(--muted)' }}>
                Rekomendasi Utama: Otomatis failover bila kuota habis atau timeout
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setValues((v) => ({ ...v, custom_gateway_model_mode: 'direct' }));
                onSave('custom_gateway_model_mode', 'direct');
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: values.custom_gateway_model_mode === 'direct' ? '1px solid var(--purple, #a855f7)' : '1px solid var(--border)',
                background: values.custom_gateway_model_mode === 'direct' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                color: values.custom_gateway_model_mode === 'direct' ? 'var(--purple, #a855f7)' : 'var(--foreground)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={15} /> 🎯 Model Spesifik (Direct Model)
              </span>
              <span style={{ fontSize: '0.72rem', color: values.custom_gateway_model_mode === 'direct' ? 'var(--purple, #a855f7)' : 'var(--muted)' }}>
                Kirim langsung ke satu model LLM tanpa routing combo
              </span>
            </button>
          </div>

          {/* TAB 1: COMBO PRESETS */}
          {values.custom_gateway_model_mode !== 'direct' ? (
            <div style={{ marginTop: 16 }}>
              <label htmlFor="custom_gateway_model_version" style={{ fontWeight: 600, fontSize: '0.86rem', display: 'block', marginBottom: 8 }}>
                Pilih Combo Preset 9Router:
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  id="custom_gateway_model_version"
                  aria-label="Pilih Combo Preset 9Router"
                  value={values.custom_gateway_model_version || 'Creator-Combo'}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setValues((v) => ({ ...v, custom_gateway_model_version: nextVal }));
                  }}
                  style={{ flex: 1, minWidth: 220 }}
                >
                  {values.custom_gateway_model_version &&
                    !catalog.combos.includes(values.custom_gateway_model_version) && (
                      <option value={values.custom_gateway_model_version}>
                        {values.custom_gateway_model_version} (Terpilih / Kustom)
                      </option>
                    )}
                  {catalog.combos.length > 0 ? (
                    catalog.combos.map((m) => (
                      <option key={m} value={m}>
                        {m}{m === 'Creator-Combo' ? ' (Default Rekomendasi)' : ''}
                      </option>
                    ))
                  ) : (
                    DEFAULT_NINEROUTER_CATALOG.combos.map((m) => (
                      <option key={m} value={m}>
                        {m}{m === 'Creator-Combo' ? ' (Default Rekomendasi)' : ''}
                      </option>
                    ))
                  )}
                </select>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => handleSave('custom_gateway_model_version')}
                  disabled={saving === 'custom_gateway_model_version'}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {savedKey === 'custom_gateway_model_version' ? <Check size={16} /> : <Save size={16} />}
                  {saving === 'custom_gateway_model_version' ? 'Menyimpan…' : savedKey === 'custom_gateway_model_version' ? 'Tersimpan ✓' : 'Simpan Pilihan'}
                </button>
              </div>

              {/* Combo Preset Quick Chips */}
              <div className="recommendations-box" style={{ marginTop: 14 }}>
                <div className="recommendations-header">
                  <Sparkles size={14} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cyan)' }}>
                    Preset Combo Unggulan 9Router (Klik untuk Pilih Cepat):
                  </span>
                </div>
                <div className="recommendation-chips">
                  {[
                    { id: 'Creator-Combo', name: 'Creator-Combo', badge: 'Naskah & Riset', desc: 'Gemini 3.8/3.7 -> OpenRouter -> Ollama (Riset & Naskah)' },
                    { id: 'Zeinity-Audit-Combo', name: 'Zeinity-Audit-Combo', badge: 'Fast Audit & Hooks', desc: 'Groq Llama 3.3 70B -> GPT-OSS -> Gemini Lite (Audit & Packaging)' },
                  ].map((preset) => {
                    const isSelected = (values.custom_gateway_model_version || 'Creator-Combo') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`rec-chip ${isSelected ? 'selected' : ''}`}
                        title={preset.desc}
                        onClick={() => {
                          setValues((v) => ({ ...v, custom_gateway_model_version: preset.id }));
                          onSave('custom_gateway_model_version', preset.id);
                          onShowToast?.(`Combo Preset diubah ke "${preset.id}".`);
                        }}
                      >
                        <span className="rec-badge">{preset.badge}</span>
                        <span className="rec-name">{preset.name}</span>
                        {isSelected && <span className="rec-check">✓ Aktif</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info Box */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(79, 232, 255, 0.05)',
                  border: '1px solid rgba(79, 232, 255, 0.2)',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: 'var(--foreground)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Info size={16} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Jaminan Zero Downtime:</strong> Model Combo di atas menjalankan failover berjenjang langsung di dalam proxy server 9Router Anda. Jika satu API kuotanya habis (HTTP 429) atau koneksi timeout, 9Router otomatis memindahkan request ke provider cadangan tanpa Anda perlu menyetel apa pun di frontend.
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: DIRECT MODELS */
            <div style={{ marginTop: 16 }}>
              <label htmlFor="custom_gateway_direct_model" style={{ fontWeight: 600, fontSize: '0.86rem', display: 'block', marginBottom: 8 }}>
                Pilih Model Spesifik (Dikelompokkan per Vendor Upstream):
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  id="custom_gateway_direct_model"
                  aria-label="Pilih Model Spesifik 9Router"
                  value={values.custom_gateway_direct_model || 'groq/llama-3.3-70b-versatile'}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setValues((v) => ({ ...v, custom_gateway_direct_model: nextVal }));
                  }}
                  style={{ flex: 1, minWidth: 220 }}
                >
                  {values.custom_gateway_direct_model && (
                    <option value={values.custom_gateway_direct_model}>
                      {values.custom_gateway_direct_model} (Terpilih / Kustom)
                    </option>
                  )}
                  {Object.entries(
                    Object.keys(catalog.directModels).length > 0
                      ? catalog.directModels
                      : DEFAULT_NINEROUTER_CATALOG.directModels
                  ).map(([vendor, list]) => (
                    <optgroup key={vendor} label={vendor}>
                      {list.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => handleSave('custom_gateway_direct_model')}
                  disabled={saving === 'custom_gateway_direct_model'}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {savedKey === 'custom_gateway_direct_model' ? <Check size={16} /> : <Save size={16} />}
                  {saving === 'custom_gateway_direct_model' ? 'Menyimpan…' : savedKey === 'custom_gateway_direct_model' ? 'Tersimpan ✓' : 'Simpan Pilihan'}
                </button>
              </div>

              {/* Info Box Direct */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: 'var(--foreground)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Info size={16} style={{ color: 'var(--purple, #a855f7)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Mode Model Langsung:</strong> Permintaan diarahkan langsung ke model spesifik yang Anda tentukan tanpa auto-routing combo. Pastikan kredensial vendor tersebut sudah aktif di Dashboard 9Router Anda (<code>http://localhost:20128/dashboard/providers</code>).
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Telegram Bot */}
        <section className="settings-card glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Telegram Bot Integration</h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: 'var(--green, #22c55e)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ⚡ Siap Digunakan / Production Ready
            </span>
          </div>
          <p className="subtitle">
            Sambungkan bot Telegram untuk menerima ide langsung dari chat ke Content Pipeline. Token bot disimpan aman di peramban lokal (localStorage).
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
                <strong style={{ color: 'var(--foreground)' }}>Status Integrasi:</strong> Aktif &amp; Siap Digunakan. Arsitektur webhook Telegram telah selesai diimplementasikan. Token disimpan secara aman di penyimpanan peramban lokal (localStorage), dan Supabase Edge Function siap menerima kiriman ide secara langsung. Anda dapat menguji validitas koneksi bot secara langsung menggunakan tombol <em>&quot;Uji Koneksi Bot&quot;</em>.
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
                Arsitektur Sistem &amp; Kapabilitas Aktif:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                <li>
                  <strong>Edge Function Webhook:</strong> Supabase Edge Function (<code>telegram-webhook</code>) aktif memproses payload pesan via HTTPS webhook dengan pengamanan Secret Token &amp; verifikasi Whitelist.
                </li>
                <li>
                  <strong>Auto-Polling Engine / Direct Fallback:</strong> Mendukung mekanisme polling terjadwal otomatis serta input langsung sebagai alternatif fallback fleksibel.
                </li>
                <li>
                  <strong>Direct Pipeline Handoff:</strong> Ide dari chat langsung diekstraksi judul dan catatannya, diklasifikasikan ke 5 pilar konten Zeinity, serta ditandai dengan badge <em>Verified Bot</em>.
                </li>
              </ul>
              <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--cyan)' }}>
                💡 <em>Tips: Pesan dari bot Telegram akan langsung muncul secara realtime di Content Pipeline dengan label &quot;Telegram (Bot)&quot;.</em>
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
