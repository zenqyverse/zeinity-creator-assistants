import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import type { AIProvider } from '../types.ts';

export const SETTINGS_STORAGE_KEY = 'zeinity_settings';
export const CHANNEL_IDENTITY_STORAGE_KEY = 'zeinity_channel_identity';
export const SENSITIVE_STORAGE_KEY = 'zeinity_secure_keys';

// Kunci API sensitif yang HANYA disimpan di peramban lokal (localStorage) dan DILARANG disimpan ke tabel publik Supabase
export const SENSITIVE_SETTINGS_KEYS = ['gemini_api_key', 'openrouter_api_key', 'custom_gateway_api_key', 'telegram_token'] as const;
export const SENSITIVE_KEYS_SET = new Set<string>(SENSITIVE_SETTINGS_KEYS);

// Format standar Telegram Bot API: ID bot 7-10 digit : 35 karakter acak [A-Za-z0-9_-]
export const TELEGRAM_TOKEN_REGEX = /^[0-9]{7,10}:[A-Za-z0-9_-]{35}$/;

// Validasi format token bot Telegram
export function isValidTelegramToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return TELEGRAM_TOKEN_REGEX.test(token.trim());
}

export interface TelegramBotInfo {
  id: number;
  username: string;
  firstName: string;
  isBot: boolean;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
  supportsInlineQueries?: boolean;
}

export interface TelegramVerificationResult {
  success: boolean;
  botInfo?: TelegramBotInfo;
  error?: string;
  isCorsBlocked?: boolean;
}

/**
 * F-007: Memverifikasi validitas token Telegram Bot langsung ke server Telegram API
 * via endpoint https://api.telegram.org/bot<TOKEN>/getMe.
 * Dilengkapi dengan AbortController timeout untuk mencegah hanging request saat offline / latency tinggi.
 */
export async function verifyTelegramBotToken(
  token: string,
  timeoutMs: number = 8000
): Promise<TelegramVerificationResult> {
  const cleanToken = typeof token === 'string' ? token.trim() : '';
  if (!cleanToken) {
    return { success: false, error: 'Token Telegram tidak boleh kosong.' };
  }
  if (!isValidTelegramToken(cleanToken)) {
    return {
      success: false,
      error: 'Format token belum valid (harus sesuai standar BotFather, misal: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678).',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok && data?.result) {
      return {
        success: true,
        botInfo: {
          id: Number(data.result.id),
          username: String(data.result.username || ''),
          firstName: String(data.result.first_name || ''),
          isBot: Boolean(data.result.is_bot),
          canJoinGroups: data.result.can_join_groups,
          canReadAllGroupMessages: data.result.can_read_all_group_messages,
          supportsInlineQueries: data.result.supports_inline_queries,
        },
      };
    }

    const desc =
      data?.description ||
      (res.status === 401
        ? 'Unauthorized: Token bot tidak valid atau telah direvokasi oleh @BotFather.'
        : `HTTP ${res.status}`);
    return {
      success: false,
      error: `Verifikasi gagal: ${desc}`,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      const seconds = Math.max(1, Math.round(timeoutMs / 1000));
      return { success: false, error: `Koneksi ke Telegram API timeout (melebihi batas waktu ${seconds} detik).` };
    }
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isNetworkOrCors =
      err instanceof TypeError ||
      rawMsg.includes('Failed to fetch') ||
      rawMsg.includes('NetworkError') ||
      rawMsg.includes('fetch') ||
      rawMsg.includes('CORS');

    if (isNetworkOrCors) {
      return {
        success: false,
        isCorsBlocked: true,
        error:
          'Pengujian langsung dari browser dibatasi oleh kebijakan keamanan CORS Telegram. Token Anda telah disimpan di peramban dan integrasi Bot Telegram tetap aktif.',
      };
    }

    return {
      success: false,
      error: `Gagal menghubungi Telegram API: ${rawMsg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Helper function terpusat untuk membersihkan / menyaring kunci sensitif dari objek settings (F-002 & F-011)
export function filterNonSensitiveSettings(rawSettings: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawSettings)) {
    if (!SENSITIVE_KEYS_SET.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Simpan settings non-sensitif secara aman ke SETTINGS_STORAGE_KEY (mencegah kebocoran kunci sensitif)
export function saveNonSensitiveSettings(rawSettings: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    const nonSensitive = filterNonSensitiveSettings(rawSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nonSensitive));
  } catch (err) {
    console.error('Failed to persist non-sensitive settings to localStorage:', err);
  }
}

export const DEFAULT_CHANNEL_IDENTITY = `DOKUMEN STRATEGI & IDENTITAS CHANNEL YOUTUBE ZEINITY

Positioning Utama:
"Membahas fenomena dunia digital, teknologi, gaming, dan perilaku manusia modern secara analitis, mendalam, dan membumi."
Benang Merah: "Sebenarnya, apa yang sedang terjadi di balik semua ini?"

Filosofi Inti:
"Diskusi dengan teman sebaya yang kebetulan sudah melakukan riset lebih dulu. Bukan artikel ensiklopedia, bukan presentasi ilmiah formal, dan bukan pembacaan berita."
Kompleksitas berada di pemikiran dan kedalaman wawasan, bukan di kerumitan pilihan kata atau istilah kaku.

5 Pilar Konten Resmi Zeinity:
1. Internet & Social Media Culture (Platform dynamics, algoritma, tren kultur web, dinamika komunitas)
2. AI & Technology Impact (Perkembangan AI, otomatisasi, komputasi, implikasi teknologi terhadap kreator dan masa depan)
3. Digital Economy & Creator Economy (Monetisasi, model bisnis digital, mikrotransaksi, creator economy, pola konsumsi digital)
4. Gaming & Digital Entertainment (Analisis industri game, mekanik gameplay, psikologi pemain, trade-off developer)
5. Modern Life & Digital Psychology (Interaksi manusia di era layar, produktivitas, psikologi digital, fenomena sosial modern)

Target Audiens:
Usia 18–35 tahun (digital natives, tech-savvy/curious, profesional muda, gamer, dan kreator kritis yang haus wawasan bermakna). Penonton cerdas yang ingin memahami mekanisme di balik fenomena digital sehari-hari.

Standar Spoken-First & Prosodi TTS (Voice-Over Rules):
1. Prinsip Pokok: Spoken-First + TTS-Aware + Dynamic Sentence Length. Tulis apa yang diucapkan manusia, bukan apa yang dibaca di layar.
2. Prosodi Tanda Baca:
   - Koma (,) adalah jeda napas ringan saat aliran pemikiran masih berlanjut.
   - Titik (.) menandakan pemikiran selesai dan memicu penurunan intonasi alami.
   - Tanda tanya (?) mempertahankan atau menaikkan intonasi penasaran.
   - JANGAN menggunakan deretan titik berlebihan hanya untuk efek dramatis visual (bisa membuat intonasi TTS anjlok monoton).
   - JANGAN menggunakan jeda baris (line break) sebagai pengganti fungsi koma.
3. Unit Pemikiran & Ritme Dinamis:
   - Tulis berdasarkan unit pemikiran, bukan batas jumlah kata kaku. Jika satu ide membutuhkan beberapa klausa untuk tuntas, satukan secara alami.
   - Kalimat pendek hanya dipakai jika memiliki alasan kuat (punchline, penekanan poin, pergeseran pemikiran, atau emotional beat).
   - Variasikan panjang kalimat secara organik (pendek, sedang, panjang) seperti orang berbicara sungguhan.
4. Naturalitas Percakapan vs Artikel Kaku:
   - Hindari bahasa kaku ala artikel: "Hal tersebut menunjukkan bahwa...", "Dapat disimpulkan bahwa...", "Dalam konteks ini...", "Lebih lanjut...".
   - Gunakan jembatan tutur lisan yang natural: "Nah, di titik ini masalahnya mulai kelihatan.", "Kalau dipikir-pikir, situasi ini agak aneh.", "Tapi persoalannya tidak berhenti sampai di situ.", "Dan justru bagian inilah yang paling sering terlewatkan."

Aturan & Pantangan Keras Narasi (Do's & Don'ts):
- WAJIB (DO'S):
  * Provocative Evidence Hook: 20-30 detik awal langsung buktikan janji judul (Click Validation) dengan fakta atau kontradiksi paling ganjil dari riset, tanpa basa-basi perkenalan diri.
  * Setiap klaim harus didukung oleh data riset empiris atau mekanisme yang solid.
  * Sertakan arahan visual cue fungsional [BUKTI], [JELASKAN], [KONTEKS], [TEKANKAN], [RITME] di sela narasi.
  * Ending harus terasa earned dari argumen video dan ditutup pertanyaan pemantik diskusi reflektif.
- PANTANGAN KERAS (DON'TS):
  * DILARANG KERAS menggunakan em dash (—) dan tanda titik dua (:) di dalam narasi voice-over (merusak prosodi TTS).
  * DILARANG mengulang struktur pola AI klise ("Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM", "eh bentar deh").
  * DILARANG kalimat pembuka klise AI ("Di era digital yang serba cepat ini...").
  * DILARANG clickbait murahan atau sensasionalisme yang tidak dibayar isi video.
  * DILARANG CTA generik mengemis like/subscribe secara murahan.
  * DILARANG mengarang fakta, angka, kronologi, atau kesimpulan di luar data riset.

5 Tahap Strategic Framework Zeinity:
[1] Hook & Phenomenon: Provocative Evidence Hook (20-30s) dan pengenalan fenomena/kontradiksi nyata di dunia digital.
[2] Mechanism: Cara kerja teknis dan sistematis di balik layar (mengapa dan bagaimana fenomena itu terjadi).
[3] Incentive: Motif ekonomi, bisnis, algoritma, atau psikologis aktor terkait (hidden incentives & trade-offs).
[4] Human Impact: Dampak nyata terhadap pengguna biasa, kreator, gamer, atau masyarakat luas.
[5] Counter View & Synthesis: Sudut pandang alternatif/berimbang, delayed judgment, dan sintesis konklusif yang earned.`;

// F-015: Penanganan anggun (graceful fallback) untuk ketiadaan VITE_GEMINI_API_KEY.
// Jika variabel VITE_GEMINI_API_KEY tidak dikonfigurasi pada file .env atau runtime Vite,
// sistem secara aman menggunakan string kosong ('') tanpa menyebabkan uncaught error atau crash.
// Prioritas resolusi kunci API Gemini:
// 1. Kunci yang disimpan pengguna di peramban lokal (localStorage: SENSITIVE_STORAGE_KEY)
// 2. Kunci dari environment variable (import.meta.env.VITE_GEMINI_API_KEY)
// 3. String kosong ('') yang meminta pengguna mengisinya di halaman Settings.
export const initialGeminiApiKey: string =
  typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.VITE_GEMINI_API_KEY === 'string'
    ? (import.meta.env.VITE_GEMINI_API_KEY as string).trim()
    : '';

/**
 * F-005: Mem-parsing daftar Chat ID / User ID Telegram yang diizinkan (whitelist).
 * Mengembalikan array string ID unik yang bersih dari spasi dan tanda koma.
 */
export function parseAllowedChatIds(rawAllowed?: string | null): string[] {
  if (!rawAllowed || typeof rawAllowed !== 'string') return [];
  return rawAllowed
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * F-005: Memeriksa apakah Chat ID atau User ID tertentu diizinkan dalam whitelist.
 * Jika whitelist kosong, mengembalikan false (kebijakan keamanan default: hanya ID terdaftar).
 */
export function isChatIdAllowed(
  chatIdOrUserId: string | number | undefined | null,
  rawAllowed?: string | null
): boolean {
  if (!chatIdOrUserId) return false;
  const allowedList = parseAllowedChatIds(rawAllowed);
  if (allowedList.length === 0) return false;
  const target = String(chatIdOrUserId).trim().toLowerCase();
  return allowedList.some((allowed) => {
    const clean = allowed.trim().toLowerCase();
    return clean === target || clean === `@${target}` || `@${clean}` === target;
  });
}

export function parseFallbackChain(rawChain?: string | null): AIProvider[] {
  const defaultChain: AIProvider[] = ['gemini', 'openrouter', 'custom', 'ollama'];
  if (!rawChain || typeof rawChain !== 'string') return defaultChain;
  const parts = rawChain.split(',').map((p) => p.trim() as AIProvider);
  const valid = parts.filter((p): p is AIProvider =>
    ['gemini', 'openrouter', 'custom', 'ollama'].includes(p)
  );
  const result: AIProvider[] = [...valid];
  for (const p of defaultChain) {
    if (!result.includes(p)) result.push(p);
  }
  return result;
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  active_provider: 'custom',
  gemini_api_key: initialGeminiApiKey,
  gemini_model_version: 'gemini-1.5-flash',
  openrouter_api_key: '',
  openrouter_model_version: 'openrouter/free',
  ollama_endpoint: 'http://localhost:11434',
  ollama_model_version: 'llama3',
  custom_gateway_endpoint: 'http://localhost:20128/v1',
  custom_gateway_api_key: '',
  custom_gateway_model_version: 'Creator-Combo',
  custom_gateway_model_mode: 'combo',
  custom_gateway_direct_model: 'groq/llama-3.3-70b-versatile',
  auto_switch_enabled: 'true',
  ai_request_timeout: '90',
  fallback_provider_order: 'custom,gemini,openrouter,ollama',
  skip_quick_switch_confirm: 'false',
  telegram_token: '',
  telegram_allowed_chat_ids: '',
  channel_identity: DEFAULT_CHANNEL_IDENTITY,
};

// Baca kunci-kunci sensitif dari penyimpanan lokal aman
export function getStoredSensitiveKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SENSITIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return {};
}

// Simpan kunci sensitif secara terlindung di localStorage pengguna (SENSITIVE_STORAGE_KEY)
export function setStoredSensitiveKey(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredSensitiveKeys();
    current[key] = value;
    localStorage.setItem(SENSITIVE_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to persist sensitive key locally:', err);
  }
}

// Hapus kunci sensitif dari penyimpanan lokal aman (SENSITIVE_STORAGE_KEY) & residu peninggalan lama
export function removeStoredSensitiveKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredSensitiveKeys();
    if (key in current) {
      delete current[key];
      localStorage.setItem(SENSITIVE_STORAGE_KEY, JSON.stringify(current));
    }
    // Pastikan juga residu peninggalan di SETTINGS_STORAGE_KEY dibersihkan jika pernah ada
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && key in parsed) {
        delete parsed[key];
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.error('Failed to remove sensitive key locally:', err);
  }
}

// Memuat snapshot lengkap settings lokal peramban (menyaring kunci sensitif dari SETTINGS_STORAGE_KEY)
export function loadLocalSettings(): Record<string, string> {
  const merged = { ...DEFAULT_SETTINGS };
  if (typeof window === 'undefined') return merged;

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const nonSensitive = filterNonSensitiveSettings(parsed);
        Object.assign(merged, nonSensitive);
      }
    }
  } catch {
    // Ignore
  }

  // Kunci sensitif lokal selalu mengambil prioritas utama dari SENSITIVE_STORAGE_KEY
  const sensitive = getStoredSensitiveKeys();
  for (const k of SENSITIVE_SETTINGS_KEYS) {
    if (sensitive[k] !== undefined && sensitive[k] !== '') {
      merged[k] = sensitive[k];
    }
  }

  return merged;
}

// Sync fallback function for synchronous operations (like AI prompt generation)
export function getChannelIdentity(): string {
  if (typeof window === 'undefined') return DEFAULT_CHANNEL_IDENTITY;
  try {
    const dedicated = localStorage.getItem(CHANNEL_IDENTITY_STORAGE_KEY);
    if (dedicated && dedicated.trim().length > 0) return dedicated.trim();

    const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (typeof parsed?.channel_identity === 'string' && parsed.channel_identity.trim().length > 0) {
        return parsed.channel_identity.trim();
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return DEFAULT_CHANNEL_IDENTITY;
}

// Sync fallback writer
export function setChannelIdentity(text: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = text.trim();
    localStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, trimmed);
    
    // Asynchronously push to Supabase as well if configured
    if (isSupabaseConfigured) {
      supabase
        .from('settings')
        .upsert({ key: 'channel_identity', value: trimmed }, { onConflict: 'key' })
        .then();
    }
  } catch (err) {
    console.error('Failed to persist channel identity:', err);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(() => loadLocalSettings());
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const local = loadLocalSettings();
        setSettings(local);
        return;
      }

      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;

      const loadedSettings = { ...DEFAULT_SETTINGS };

      if (data && data.length > 0) {
        data.forEach((row: { key: string; value: string }) => {
          // JANGAN PERNAH mengambil kunci sensitif dari tabel publik Supabase
          if (!SENSITIVE_KEYS_SET.has(row.key)) {
            loadedSettings[row.key] = row.value;
          } else {
            // PROAKTIF: Jika sebelumnya kunci sensitif pernah tersimpan di Supabase,
            // selamatkan ke localStorage (jika user belum punya lokal) dan segera bersihkan dari Supabase
            if (row.value && row.value.trim()) {
              const currentLocal = getStoredSensitiveKeys();
              if (!currentLocal[row.key]) {
                setStoredSensitiveKey(row.key, row.value);
                loadedSettings[row.key] = row.value;
              }
            }
            // Hapus dari tabel publik Supabase agar tidak terekspos lagi
            supabase.from('settings').delete().eq('key', row.key).then();
          }
        });
        if (loadedSettings.channel_identity) {
          localStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, loadedSettings.channel_identity);
        }
      } else {
        // Seed default settings non-sensitif jika tabel settings kosong
        const seedData = Object.entries(DEFAULT_SETTINGS)
          .filter(([key]) => !SENSITIVE_KEYS_SET.has(key))
          .map(([key, value]) => ({ key, value }));
        await supabase.from('settings').upsert(seedData, { onConflict: 'key' });
      }

      // Kunci sensitif dibaca secara ketat dari localStorage lokal peramban
      const sensitive = getStoredSensitiveKeys();
      for (const k of SENSITIVE_SETTINGS_KEYS) {
        if (sensitive[k] !== undefined && sensitive[k] !== '') {
          loadedSettings[k] = sensitive[k];
        } else {
          // Periksa apakah sebelumnya ada di SETTINGS_STORAGE_KEY
          const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed[k]) {
                loadedSettings[k] = parsed[k];
                setStoredSensitiveKey(k, parsed[k]);
              }
            } catch { /* ignore */ }
          }
        }
      }

      setSettings(loadedSettings);
      saveNonSensitiveSettings(loadedSettings);
    } catch (err) {
      console.error('Error fetching settings from Supabase:', err);
      // Fallback ke penyimpanan lokal jika Supabase gagal
      const local = loadLocalSettings();
      setSettings(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Realtime subscription hanya jika Supabase terkonfigurasi
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('schema-db-changes-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const upsertSetting = useCallback(async (key: string, value: string): Promise<boolean> => {
    try {
      if (SENSITIVE_KEYS_SET.has(key)) {
        // 1. Simpan HANYA di penyimpanan lokal browser, JANGAN kirim ke database Supabase publik
        const cleanVal = typeof value === 'string' ? value.trim() : '';
        if (!cleanVal) {
          removeStoredSensitiveKey(key);
        } else {
          setStoredSensitiveKey(key, value);
        }

        setSettings((prev) => {
          const updated = { ...prev, [key]: value };
          saveNonSensitiveSettings(updated);
          return updated;
        });

        // 2. Jika sebelumnya pernah tersimpan secara plaintext di Supabase, hapus dari tabel Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase.from('settings').delete().eq('key', key);
          } catch {
            // Abaikan kesalahan pembersihan
          }
        }

        return true;
      }

      // Kunci non-sensitif disinkronkan ke Supabase jika terkonfigurasi
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value }, { onConflict: 'key' });

        if (error) throw error;
      }

      // Optimistic update
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        saveNonSensitiveSettings(updated);
        if (key === 'channel_identity') {
          localStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, value);
        }
        return updated;
      });

      return true;
    } catch (err) {
      console.error('Error upserting setting to Supabase:', err);
      // Fallback simpan lokal jika gagal simpan ke cloud
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        saveNonSensitiveSettings(updated);
        return updated;
      });
      return false;
    }
  }, []);

  const deleteSetting = useCallback(async (key: string): Promise<boolean> => {
    try {
      if (SENSITIVE_KEYS_SET.has(key)) {
        removeStoredSensitiveKey(key);
        setSettings((prev) => {
          const updated = { ...prev, [key]: '' };
          saveNonSensitiveSettings(updated);
          return updated;
        });

        if (isSupabaseConfigured) {
          try {
            await supabase.from('settings').delete().eq('key', key);
          } catch {
            // Abaikan kesalahan pembersihan
          }
        }
        return true;
      }

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('settings').delete().eq('key', key);
          if (error) {
            console.warn(`Supabase delete setting "${key}" error (cached locally):`, error);
          }
        } catch (supabaseErr) {
          console.warn(`Supabase network error deleting setting "${key}":`, supabaseErr);
        }
      }

      setSettings((prev) => {
        const updated = { ...prev, [key]: DEFAULT_SETTINGS[key] || '' };
        saveNonSensitiveSettings(updated);
        if (key === 'channel_identity') {
          localStorage.removeItem(CHANNEL_IDENTITY_STORAGE_KEY);
        }
        return updated;
      });

      return true;
    } catch (err) {
      console.error(`Error deleting setting "${key}":`, err);
      // Fallback lokal jika ada unhandled exception
      setSettings((prev) => {
        const updated = { ...prev, [key]: DEFAULT_SETTINGS[key] || '' };
        saveNonSensitiveSettings(updated);
        return updated;
      });
      return false;
    }
  }, []);

  const resetTelegramToken = useCallback(async (): Promise<boolean> => {
    return deleteSetting('telegram_token');
  }, [deleteSetting]);

  return {
    settings,
    loading,
    fetchSettings,
    upsertSetting,
    deleteSetting,
    removeSetting: deleteSetting,
    resetTelegramToken,
    getChannelIdentity,
    setChannelIdentity,
  };
}
