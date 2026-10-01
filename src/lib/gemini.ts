import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, CallAIResult, NineRouterCatalog, NineRouterModelItem, AlertDiagnostics, TitleRecommendationItem } from '@/types';

export type { AlertDiagnostics };

export interface ParsedAIErrorInfo {
  title: string;
  message: string;
  technicalDetails?: string;
  solution?: string;
  diagnostics?: AlertDiagnostics;
}

export const DEFAULT_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
];

export const DEFAULT_OPENROUTER_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
];

export const DEFAULT_OLLAMA_MODELS = [
  'llama3',
  'llama3.1',
  'mistral',
  'qwen2.5',
  'gemma2',
  'deepseek-coder-v2',
];

export const DEFAULT_CUSTOM_MODELS = [
  'Creator-Combo',
  'Zeinity-Audit-Combo',
  'groq/llama-3.3-70b-versatile',
  'gemini/gemini-3.8-flash',
  'openrouter/auto',
  'ollama-local/qwen3:8b',
];

export const NINEROUTER_CATALOG_STORAGE_KEY = 'zeinity_9router_catalog';

export const DEFAULT_NINEROUTER_CATALOG: NineRouterCatalog = {
  combos: [
    'Creator-Combo',
    'Zeinity-Audit-Combo',
  ],
  directModels: {
    'Groq': ['groq/llama-3.3-70b-versatile'],
    'Google Gemini': ['gemini/gemini-3.8-flash'],
    'OpenRouter': ['openrouter/auto'],
    'Ollama Local': ['ollama-local/qwen3:8b'],
  },
  allModels: [
    'Creator-Combo',
    'Zeinity-Audit-Combo',
    'groq/llama-3.3-70b-versatile',
    'gemini/gemini-3.8-flash',
    'openrouter/auto',
    'ollama-local/qwen3:8b',
  ],
};

export interface ModelRecommendation {
  id: string;
  name: string;
  badge: string;
  desc?: string;
  isFree: boolean;
}

/**
 * Menghasilkan daftar rekomendasi model terbaik dan gratis secara dinamis
 * berdasarkan provider yang dipilih dan model yang tersedia di sistem/API.
 */
export function getDynamicRecommendations(
  provider: AIProvider,
  currentModels: string[]
): ModelRecommendation[] {
  if (provider === 'openrouter') {
    const freeInList = currentModels.filter(
      (m) => m.endsWith(':free') || m === 'openrouter/free'
    );

    const baseRecs: ModelRecommendation[] = [
      {
        id: 'openrouter/free',
        name: 'Auto Free Router',
        badge: '⚡ Auto Free (0 Kredit)',
        isFree: true,
        desc: 'Otomatis dialihkan ke model gratis terbaik yang aktif',
      },
      {
        id: 'google/gemma-4-31b-it:free',
        name: 'Google Gemma 4 31B',
        badge: '⚡ Google (Gratis)',
        isFree: true,
        desc: 'Model Google open-weight berdaya nalar tinggi',
      },
      {
        id: 'qwen/qwen3.8-27b:free',
        name: 'Qwen 3.8 27B',
        badge: '⚡ Qwen (Gratis)',
        isFree: true,
        desc: 'Sangat handal untuk riset analitis & teks terstruktur',
      },
      {
        id: 'nvidia/nemotron-3.5-lightning:free',
        name: 'Nemotron 3.5 Lightning',
        badge: '⚡ NVIDIA (Gratis)',
        isFree: true,
        desc: 'Kecepatan ekstra tinggi untuk pemrosesan cepat',
      },
      {
        id: 'liquid/lfm-2.5-2.6b:free',
        name: 'Liquid LFM 2.5',
        badge: '⚡ Ringan & Cepat',
        isFree: true,
        desc: 'Latensi ultra-rendah untuk teks ringan',
      },
    ];

    // Tambahkan model gratis lain yang ditemukan secara dinamis dari API
    const seen = new Set(baseRecs.map((r) => r.id));
    const dynamicExtras: ModelRecommendation[] = [];

    for (const modelId of freeInList) {
      if (!seen.has(modelId)) {
        seen.add(modelId);
        const parts = modelId.replace(/:free$/, '').split('/');
        const cleanName = (parts[1] || parts[0]).toUpperCase();
        dynamicExtras.push({
          id: modelId,
          name: cleanName,
          badge: '⚡ Terdeteksi Gratis',
          isFree: true,
          desc: 'Model aktif dari OpenRouter API',
        });
      }
    }

    return [...baseRecs, ...dynamicExtras].slice(0, 6);
  }

  if (provider === 'gemini') {
    const flashModels = currentModels.filter((m) => m.includes('flash') || m.includes('lite'));
    const baseRecs: ModelRecommendation[] = [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        badge: '⚡ Flagship Speed & Context',
        isFree: true,
        desc: 'Model Google generasi terbaru dengan konteks 1M dan kecepatan tertinggi',
      },
      {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        badge: '⚡ Hybrid Reasoning',
        isFree: true,
        desc: 'Kemampuan penalaran adaptif dan penalaran kritis mendalam',
      },
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        badge: '⚡ Ultra Cepat & Hemat Kuota',
        isFree: true,
        desc: 'Model ringan efisien tinggi untuk respon instan dan kuota hemat',
      },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        badge: '⚡ Deep Analysis',
        isFree: true,
        desc: 'Pemahaman mendalam untuk sintesis data kompleks dan riset',
      },
    ];

    for (const m of flashModels) {
      if (!baseRecs.find((r) => r.id === m)) {
        baseRecs.push({
          id: m,
          name: m,
          badge: '⚡ Gemini Flash',
          isFree: true,
          desc: 'Terdeteksi aktif dari Google Generative Language API',
        });
      }
    }

    return baseRecs.slice(0, 5);
  }

  if (provider === 'ollama') {
    const installed = currentModels;
    const baseRecs: ModelRecommendation[] = [
      {
        id: 'llama3.1',
        name: 'Meta Llama 3.1',
        badge: '⚡ 100% Lokal & Bebas Kuota',
        isFree: true,
        desc: 'Model open-weight unggulan untuk penalaran umum',
      },
      {
        id: 'qwen2.5',
        name: 'Qwen 2.5',
        badge: '⚡ Handal Multibahasa',
        isFree: true,
        desc: 'Sangat baik untuk bahasa Indonesia & data terstruktur',
      },
      {
        id: 'mistral',
        name: 'Mistral 7B',
        badge: '⚡ Ringan & Efisien',
        isFree: true,
        desc: 'Konsumsi RAM ringan di komputer lokal',
      },
    ];

    // Highlight models actually installed in Ollama
    return baseRecs.map((rec) => {
      const isInstalled = installed.some((m) => m.startsWith(rec.id));
      return {
        ...rec,
        badge: isInstalled ? '⚡ Terpasang Lokal' : rec.badge,
      };
    });
  }

  if (provider === 'custom') {
    const baseRecs: ModelRecommendation[] = [
      {
        id: 'Creator-Combo',
        name: 'Creator-Combo',
        badge: '⚡ Naskah & Riset',
        isFree: true,
        desc: 'Rekomendasi utama riset & naskah utuh: Gemini 3.8 -> 3.7 -> OpenRouter -> Ollama',
      },
      {
        id: 'Zeinity-Audit-Combo',
        name: 'Zeinity-Audit-Combo',
        badge: '⚡ Fast Audit & Hooks',
        isFree: true,
        desc: 'Respon sub-2 detik untuk audit VO & hooks: Groq 70B -> GPT-OSS -> Gemini Lite -> Ollama',
      },
    ];

    const seen = new Set(baseRecs.map((r) => r.id));
    const dynamicExtras: ModelRecommendation[] = [];

    for (const modelId of currentModels) {
      if (!seen.has(modelId)) {
        seen.add(modelId);
        const parts = modelId.split('/');
        const cleanName = (parts[1] || parts[0]).toUpperCase();
        dynamicExtras.push({
          id: modelId,
          name: cleanName,
          badge: '⚡ 9Router Model',
          isFree: modelId.includes(':free') || modelId.includes('free'),
          desc: 'Terdeteksi dari endpoint 9Router /v1/models',
        });
      }
    }

    return [...baseRecs, ...dynamicExtras].slice(0, 6);
  }

  return [];
}

export async function fetchAvailableGeminiModels(apiKey: string): Promise<string[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key Google Gemini belum diatur.');
  }
  const cleanKey = apiKey.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // F-016: Kirim API key via header 'x-goog-api-key' dan hindari eksposur di query parameter (?key=...)
    // untuk mencegah kebocoran kunci di access log server, web proxy, maupun browser history.
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: {
        'x-goog-api-key': cleanKey,
      },
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const models = data.models
          .map((m: { name?: string }) => m.name?.replace(/^models\//, ''))
          .filter((name: unknown): name is string => typeof name === 'string' && name.includes('gemini'));
        if (models.length > 0) return Array.from(new Set(models));
      }
    } else {
      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${res.status}: Gagal memuat daftar model Google Gemini.`;
      throw new Error(errMsg);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Permintaan daftar model Google Gemini timeout (10 detik).');
    }
    if (err instanceof Error && (err.message.includes('HTTP ') || err.message.includes('API key') || err.message.includes('API_KEY') || err.message.includes('Gagal memuat'))) {
      throw err;
    }
    // Fallback if offline or network restricted
  } finally {
    clearTimeout(timer);
  }
  return DEFAULT_GEMINI_MODELS;
}

export async function fetchAvailableOpenRouterModels(apiKey?: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const headers: Record<string, string> = {};
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        // Pisahkan model gratis (dengan suffix :free atau pricing prompt 0 atau openrouter/free)
        const freeModels: string[] = [];
        const paidModels: string[] = [];

        data.data.forEach((m: { id?: string; pricing?: { prompt?: string } }) => {
          if (!m.id) return;
          const isFree =
            m.id.endsWith(':free') ||
            m.id === 'openrouter/free' ||
            (m.pricing && (m.pricing.prompt === '0' || m.pricing.prompt === '0.0'));
          if (isFree) {
            freeModels.push(m.id);
          } else {
            paidModels.push(m.id);
          }
        });

        // Selalu sertakan 'openrouter/free' di urutan pertama jika belum ada
        if (!freeModels.includes('openrouter/free')) {
          freeModels.unshift('openrouter/free');
        }

        // Cache daftar model gratis ke localStorage
        try {
          localStorage.setItem('zeinity_openrouter_free_models', JSON.stringify(freeModels));
        } catch { /* ignore */ }

        // Susun urutan: model gratis dahulu, lalu model populer
        const sorted = [...freeModels, ...paidModels.slice(0, 40)];
        if (sorted.length > 0) return Array.from(new Set(sorted));
      }
    }
  } catch {
    // Fallback if offline
  } finally {
    clearTimeout(timer);
  }
  return DEFAULT_OPENROUTER_MODELS;
}

export async function fetchAvailableOllamaModels(endpoint = 'http://localhost:11434'): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
    const res = await fetch(`${cleanEndpoint}/api/tags`, {
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const names = data.models.map((m: { name?: string }) => m.name).filter(Boolean);
        if (names.length > 0) return names;
      }
    }
  } catch {
    // Fallback if offline
  } finally {
    clearTimeout(timer);
  }
  return DEFAULT_OLLAMA_MODELS;
}

export function normalizeGatewayEndpoint(endpoint?: string): string {
  if (!endpoint || !endpoint.trim()) return 'http://localhost:20128/v1';
  const clean = endpoint.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/v1') && !clean.includes('/v1/')) {
    return `${clean}/v1`;
  }
  return clean;
}

// ─── 9Router / Custom Gateway Discovery & Provider Helpers ────────────────────

export function parseNineRouterModels(
  data?: Array<NineRouterModelItem | { id?: string; owned_by?: string } | string> | null
): NineRouterCatalog {
  if (!data || !Array.isArray(data)) {
    return {
      combos: [],
      directModels: {},
      allModels: [],
    };
  }

  const combos: string[] = [];
  const directModels: Record<string, string[]> = {};
  const allModels: string[] = [];

  for (const item of data) {
    if (!item) continue;
    const id = typeof item === 'string' ? item.trim() : (item.id || '').trim();
    if (!id) continue;
    allModels.push(id);

    const ownedBy = typeof item === 'object' && item.owned_by ? item.owned_by.trim() : '';
    if (ownedBy.toLowerCase() === 'combo') {
      combos.push(id);
    } else {
      let vendor = ownedBy;
      if (!vendor) {
        const lowerId = id.toLowerCase();
        if (lowerId.startsWith('groq/')) vendor = 'Groq';
        else if (lowerId.startsWith('google/') || lowerId.includes('gemini')) vendor = 'Google Gemini';
        else if (lowerId.startsWith('openrouter/') || lowerId.includes('anthropic') || lowerId.includes('openai')) vendor = 'OpenRouter';
        else if (lowerId.includes('llama') || lowerId.includes('mistral') || lowerId.includes('qwen')) vendor = 'Ollama Local';
        else vendor = 'Direct Models';
      }
      if (!directModels[vendor]) {
        directModels[vendor] = [];
      }
      directModels[vendor].push(id);
    }
  }

  return {
    combos,
    directModels,
    allModels,
  };
}

export async function fetchNineRouterCatalog(
  endpoint = 'http://localhost:20128/v1',
  apiKey?: string
): Promise<NineRouterCatalog> {
  const cleanEndpoint = normalizeGatewayEndpoint(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const headers: Record<string, string> = {};
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    const res = await fetch(`${cleanEndpoint}/models`, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data?.data)) {
      return parseNineRouterModels(data.data);
    } else if (Array.isArray(data)) {
      return parseNineRouterModels(data);
    }
    return { combos: [], directModels: {}, allModels: [] };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    if (rawMsg.includes('HTTP 401') || rawMsg.includes('401')) {
      throw new Error(
        `Akses ke 9Router di ${cleanEndpoint} ditolak (HTTP 401 Unauthorized). Pastikan 9Router Bearer API Key yang valid telah dimasukkan di Pengaturan.`
      );
    }
    if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
      throw new Error(
        `Gagal menjangkau 9Router di ${cleanEndpoint}. Jika mengakses remote tunnel, pastikan tunnel 9Router aktif dan gunakan endpoint abc-tunnel.us untuk kompatibilitas CORS peramban.`
      );
    }
    throw new Error(
      `Gagal terhubung ke 9Router di ${endpoint} (${rawMsg}). Pastikan 9Router sudah dijalankan di terminal Anda (perintah: 9router start).`
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAvailableCustomGatewayModels(
  endpoint = 'http://localhost:20128/v1',
  apiKey?: string
): Promise<string[]> {
  const catalog = await fetchNineRouterCatalog(endpoint, apiKey);
  return catalog.allModels;
}

export function getProviderLabel(provider: AIProvider): string {
  switch (provider) {
    case 'gemini':
      return 'Google Gemini';
    case 'openrouter':
      return 'OpenRouter';
    case 'custom':
      return '9Router Gateway';
    case 'ollama':
      return 'Ollama Local';
    default:
      return provider;
  }
}

// ─── Universal AI Router ─────────────────────────────────────────────────────

export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  modelVersion?: string;
  modelMode?: 'combo' | 'direct';
  endpoint?: string;
  ollamaEndpoint?: string;
  customEndpoint?: string;
  timeoutSeconds?: number;
  autoSwitchEnabled?: boolean;
  fallbackChain?: AIProvider[];
  allSettings?: Record<string, string>;
  onLog?: (message: string, severity?: 'info' | 'warn' | 'error' | 'success') => void;
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

export function getFallbackProviderConfig(
  targetProvider: AIProvider,
  baseConfig: ProviderConfig
): ProviderConfig {
  const all = baseConfig.allSettings || {};
  switch (targetProvider) {
    case 'gemini':
      return {
        ...baseConfig,
        provider: 'gemini',
        apiKey: (all.gemini_api_key || (baseConfig.provider === 'gemini' ? baseConfig.apiKey : '') || '').trim(),
        modelVersion: (all.gemini_model_version || (baseConfig.provider === 'gemini' ? baseConfig.modelVersion : undefined) || 'gemini-3.8-flash').trim(),
      };
    case 'openrouter':
      return {
        ...baseConfig,
        provider: 'openrouter',
        apiKey: (all.openrouter_api_key || (baseConfig.provider === 'openrouter' ? baseConfig.apiKey : '') || '').trim(),
        modelVersion: (all.openrouter_model_version || (baseConfig.provider === 'openrouter' ? baseConfig.modelVersion : undefined) || 'openrouter/auto').trim(),
      };
    case 'ollama':
      return {
        ...baseConfig,
        provider: 'ollama',
        endpoint: (baseConfig.ollamaEndpoint || all.ollama_endpoint || 'http://localhost:11434').trim(),
        ollamaEndpoint: (baseConfig.ollamaEndpoint || all.ollama_endpoint || 'http://localhost:11434').trim(),
        modelVersion: (all.ollama_model_version || (baseConfig.provider === 'ollama' ? baseConfig.modelVersion : undefined) || 'llama3').trim(),
      };
    case 'custom':
    default: {
      const isDirect = (baseConfig.modelMode === 'direct') || (all.custom_gateway_model_mode === 'direct');
      const model = (
        (isDirect ? all.custom_gateway_direct_model : all.custom_gateway_model_version) ||
        (baseConfig.provider === 'custom' ? baseConfig.modelVersion : undefined) ||
        'Creator-Combo'
      ).trim();
      const endpoint = normalizeGatewayEndpoint(
        all.custom_gateway_endpoint || baseConfig.customEndpoint || baseConfig.endpoint || 'http://localhost:20128/v1'
      );
      return {
        ...baseConfig,
        provider: 'custom',
        endpoint,
        customEndpoint: endpoint,
        apiKey: (all.custom_gateway_api_key || (baseConfig.provider === 'custom' ? baseConfig.apiKey : '') || '').trim(),
        modelVersion: model,
        modelMode: isDirect ? 'direct' : 'combo',
      };
    }
  }
}

/**
 * Smart Task-Based Routing Helper:
 * Mengarahkan eksekusi AI ke combo spesialis 9Router yang tepat sesuai beban task:
 * - 'script': Task berkonteks tebal & naskah utuh (Riset Brief, Kerangka Naskah, Penulisan Naskah Penuh) -> 'Creator-Combo'
 * - 'audit': Micro-task berlatensi kilat sub-2 detik (Audit Spoken & TTS, Visual Cues, Judul A/B, Thumbnail Hooks) -> 'Zeinity-Audit-Combo'
 *
 * Catatan penting:
 * Jika user secara eksplisit memilih mode direct model (modelMode === 'direct')
 * atau menggunakan direct external provider (gemini, openrouter, ollama), pilihan user tetap dihormati dan tidak ditimpa.
 */
export function resolveTargetModelForTask(
  taskType: 'script' | 'audit',
  config: ProviderConfig
): ProviderConfig {
  const isDirect =
    config.modelMode === 'direct' ||
    config.allSettings?.custom_gateway_model_mode === 'direct';

  if (isDirect || (config.provider && config.provider !== 'custom')) {
    return config;
  }

  const targetCombo = taskType === 'script' ? 'Creator-Combo' : 'Zeinity-Audit-Combo';

  const updatedSettings = config.allSettings
    ? {
        ...config.allSettings,
        custom_gateway_model_version: targetCombo,
        custom_gateway_model_mode: 'combo',
      }
    : undefined;

  return {
    ...config,
    provider: 'custom',
    modelVersion: targetCombo,
    modelMode: 'combo',
    allSettings: updatedSettings,
  };
}

/**
 * Memeriksa apakah konfigurasi provider AI sudah valid dan siap dijalankan:
 * - 'ollama' dan 'custom' (9Router local daemon) tidak mewajibkan API Key.
 * - 'gemini' dan 'openrouter' mewajibkan API Key yang tidak kosong.
 */
export function isProviderConfigured(config?: ProviderConfig | null): boolean {
  if (!config) return false;
  if (config.provider === 'ollama' || config.provider === 'custom') return true;
  return Boolean(config.apiKey?.trim());
}

/**
 * Ekstraksi objek JSON seimbang pertama dari teks acak/bercampur.
 */
export function extractFirstJsonObject(str: string): { parsed: unknown; raw: string } | null {
  const start = str.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const sub = str.substring(start, i + 1);
          try {
            return { parsed: JSON.parse(sub), raw: sub };
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Parser tangguh untuk respons /chat/completions (OpenAI-compatible).
 * Mendukung respons JSON tunggal, Server-Sent Events (SSE) streaming (data: {...}\n\ndata: ...),
 * dan NDJSON tanpa menimbulkan SyntaxError jika stream diaktifkan oleh provider/proxy.
 */
export function parseChatCompletionResponse(rawText: string): { content: string; error?: string } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { content: '', error: 'Respons kosong dari AI server.' };
  }

  // 1. Coba parse JSON standar jika berawalan '{' dan berakhiran '}'
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      if (data?.error) {
        const errorMsg = typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : String(data.error);
        return { content: '', error: errorMsg };
      }
      const msgObj = data.choices?.[0]?.message;
      const content = (msgObj?.content && msgObj.content.trim()) ? msgObj.content : (msgObj?.reasoning ?? '');
      return { content: (content || '').trim() };
    } catch {
      // Lanjut ke fallback parser di bawah jika gagal
    }
  }

  // 2. Format Server-Sent Events (SSE) streaming (data: {...}\n\ndata: ...)
  if (trimmed.includes('data:')) {
    const lines = trimmed.split('\n');
    let accumulatedContent = '';
    let errorMessage = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('data:')) continue;
      const dataPart = line.substring(5).trim();
      if (dataPart === '[DONE]') continue;

      try {
        const chunk = JSON.parse(dataPart);
        if (chunk?.error) {
          errorMessage = typeof chunk.error === 'object' ? (chunk.error.message || JSON.stringify(chunk.error)) : String(chunk.error);
        }
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          accumulatedContent += delta.content;
        } else if (chunk.choices?.[0]?.message?.content) {
          accumulatedContent += chunk.choices[0].message.content;
        }
      } catch {
        // Lewati baris SSE non-JSON
      }
    }

    if (errorMessage) {
      return { content: '', error: errorMessage };
    }
    if (accumulatedContent.trim()) {
      return { content: accumulatedContent.trim() };
    }
  }

  // 3. Fallback: Ekstraksi objek JSON seimbang pertama
  const extracted = extractFirstJsonObject(trimmed);
  if (extracted && typeof extracted.parsed === 'object' && extracted.parsed !== null) {
    const data = extracted.parsed as Record<string, unknown>;
    if (data?.error) {
      const errObj = data.error as Record<string, unknown>;
      const errorMsg = typeof data.error === 'object' && errObj !== null ? (String(errObj.message || JSON.stringify(data.error))) : String(data.error);
      return { content: '', error: errorMsg };
    }
    const choices = data.choices as Array<{ message?: { content?: string; reasoning?: string }; delta?: { content?: string; reasoning?: string } }> | undefined;
    const msgObj = choices?.[0]?.message || choices?.[0]?.delta;
    const content = (msgObj?.content && msgObj.content.trim()) ? msgObj.content : (msgObj?.reasoning ?? '');
    if (content) {
      return { content: content.trim() };
    }
  }

  return { content: '', error: `Format respons tidak valid dari AI Gateway: ${trimmed.slice(0, 200)}` };
}

/**
 * Mengeksekusi permintaan ke satu provider spesifik tanpa fallback chaining.
 */
export async function callSingleProvider(
  prompt: string,
  config: ProviderConfig,
  timeoutMs: number = 45000
): Promise<string> {
  const { provider, apiKey, modelVersion } = config;
  const timeoutSeconds = Math.round(timeoutMs / 1000);

  if (provider === 'gemini') {
    if (!apiKey?.trim()) throw new Error('Google Gemini API Key belum diatur di Settings.');
    const controller = new AbortController();
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel(
        { model: modelVersion?.trim() || 'gemini-3.8-flash' },
        { timeout: timeoutMs }
      );
      const callPromise = model.generateContent(prompt, { timeout: timeoutMs, signal: controller.signal });
      const timeoutPromise = new Promise<never>((_, reject) => {
        if (controller.signal.aborted) {
          reject(new Error(`Timeout: Permintaan ke Google Gemini melebihi batas waktu (${timeoutSeconds} detik).`));
          return;
        }
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Timeout: Permintaan ke Google Gemini melebihi batas waktu (${timeoutSeconds} detik).`));
        }, { once: true });
      });

      const result = await Promise.race([callPromise, timeoutPromise]);
      return result.response.text().trim();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (
        didTimeout ||
        controller.signal.aborted ||
        isAbort ||
        errMsg.toLowerCase().includes('timeout') ||
        errMsg.toLowerCase().includes('aborted')
      ) {
        throw new Error(
          `Batas waktu habis (${timeoutSeconds} detik): Google Gemini tidak merespons tepat waktu. Silakan periksa koneksi internet atau coba beberapa saat lagi.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  if (provider === 'openrouter') {
    if (!apiKey?.trim()) throw new Error('OpenRouter API Key belum diatur di Settings.');
    const model = modelVersion?.trim() || 'openrouter/auto';
    const controller = new AbortController();
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://zeinity.app',
          'X-Title': 'Zeinity Creator Assistant',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          stream: false,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenRouter error (${res.status}): ${errText.slice(0, 120)}`);
      }
      const rawText = await res.text();
      const parsedRes = parseChatCompletionResponse(rawText);
      if (parsedRes.error) {
        throw new Error(`OpenRouter error: ${parsedRes.error}`);
      }
      return parsedRes.content;
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (didTimeout || controller.signal.aborted || isAbort) {
        throw new Error(
          `Batas waktu habis (${timeoutSeconds} detik): Server OpenRouter tidak merespons. Silakan periksa koneksi internet atau pilih model alternatif.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  if (provider === 'custom') {
    const endpoint = normalizeGatewayEndpoint(
      config.endpoint ||
      config.customEndpoint ||
      config.allSettings?.custom_gateway_endpoint ||
      'http://localhost:20128/v1'
    );
    const isDirect = config.modelMode === 'direct' || config.allSettings?.custom_gateway_model_mode === 'direct';
    const model =
      config.modelVersion?.trim() ||
      (isDirect
        ? config.allSettings?.custom_gateway_direct_model?.trim()
        : config.allSettings?.custom_gateway_model_version?.trim()) ||
      'Creator-Combo';
    const apiKey = (config.apiKey || config.allSettings?.custom_gateway_api_key || '').trim();
    const controller = new AbortController();
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          stream: false,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`9Router/Gateway error (${res.status}): ${errText.slice(0, 120)}`);
      }
      const rawText = await res.text();
      const parsedRes = parseChatCompletionResponse(rawText);
      if (parsedRes.error) {
        throw new Error(`9Router error: ${parsedRes.error}`);
      }
      return parsedRes.content;
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (didTimeout || controller.signal.aborted || isAbort) {
        throw new Error(
          `Batas waktu habis (${timeoutSeconds} detik): Server 9Router/Gateway di "${endpoint}" tidak merespons. Pastikan gateway aktif di port tersebut.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  if (provider === 'ollama') {
    const endpoint = (config.ollamaEndpoint?.trim() || config.endpoint?.trim() || config.allSettings?.ollama_endpoint?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
    const model = config.modelVersion?.trim() || config.allSettings?.ollama_model_version?.trim() || 'llama3';
    const controller = new AbortController();
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            num_ctx: 16384,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama error (${res.status}): pastikan Ollama berjalan dan model "${model}" sudah ter-install.`);
      }
      const data = await res.json();
      return (data.response ?? '').trim();
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (didTimeout || controller.signal.aborted || isAbort) {
        throw new Error(
          `Batas waktu habis (${timeoutSeconds} detik): Layanan Ollama lokal di "${endpoint}" tidak merespons atau hang. Pastikan server Ollama aktif dan responsif.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Provider tidak dikenal: ${provider}`);
}

async function executeSingleProviderWithLogging(
  prompt: string,
  config: ProviderConfig,
  model: string,
  timeoutMs: number
): Promise<string> {
  const provider = config.provider || 'custom';
  const endpoint = normalizeGatewayEndpoint(
    config.endpoint ||
    config.customEndpoint ||
    config.allSettings?.custom_gateway_endpoint ||
    'http://localhost:20128/v1'
  );

  if (provider === 'custom') {
    config.onLog?.(`🚀 Mengirim permintaan ke 9Router Gateway (${model}) di ${endpoint}...`, 'info');
    try {
      const res = await callSingleProvider(prompt, { ...config, endpoint, modelVersion: model }, timeoutMs);
      config.onLog?.(`✓ Berhasil menerima respon dari 9Router (${model})!`, 'success');
      return res;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      config.onLog?.(`❌ Error 9Router: ${errMsg}`, 'error');
      throw err;
    }
  }

  const label = getProviderLabel(provider);
  config.onLog?.(`🚀 Mengirim permintaan ke ${label} (${model})...`, 'info');
  try {
    const res = await callSingleProvider(prompt, { ...config, modelVersion: model }, timeoutMs);
    config.onLog?.(`✓ Berhasil menerima respon dari ${label} (${model})!`, 'success');
    return res;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    config.onLog?.(`❌ Error ${label}: ${errMsg}`, 'error');
    throw err;
  }
}

/**
 * Universal Multi-Provider AI Caller dengan Failover Aktif:
 * Menjalankan permintaan AI dengan failover berurutan sesuai fallbackChain jika provider utama gagal/timeout.
 */
export async function callAIWithFallback(
  prompt: string,
  config: ProviderConfig,
  timeoutMs?: number
): Promise<CallAIResult> {
  const effectiveTimeoutMs =
    config.timeoutSeconds !== undefined
      ? config.timeoutSeconds * 1000
      : (timeoutMs ?? 60000);

  const primaryProvider: AIProvider = config.provider || 'custom';
  const autoSwitch = config.autoSwitchEnabled !== false;

  interface ExecutionCandidate {
    provider: AIProvider;
    config: ProviderConfig;
    isPrimary: boolean;
  }

  const candidates: ExecutionCandidate[] = [
    { provider: primaryProvider, config, isPrimary: true },
  ];

  if (autoSwitch) {
    const defaultChain: AIProvider[] = ['gemini', 'openrouter', 'custom', 'ollama'];
    const hasExplicitChain = Boolean(config.fallbackChain && config.fallbackChain.length > 0);
    const rawChain: AIProvider[] = hasExplicitChain
      ? config.fallbackChain!
      : (config.allSettings?.fallback_provider_order
          ? parseFallbackChain(config.allSettings.fallback_provider_order)
          : defaultChain);

    for (const p of rawChain) {
      const fbConfig = getFallbackProviderConfig(p, config);
      if (!isProviderConfigured(fbConfig)) {
        continue;
      }

      // Check against ALL existing candidates to prevent duplicate executions of identical provider/endpoint/model/key
      const isDuplicate = candidates.some((c) => {
        if (c.provider !== p) return false;
        if (p === 'custom' || p === 'ollama') {
          const cEp = normalizeGatewayEndpoint(c.config.endpoint || c.config.customEndpoint || c.config.ollamaEndpoint || '');
          const fbEp = normalizeGatewayEndpoint(fbConfig.endpoint || fbConfig.customEndpoint || fbConfig.ollamaEndpoint || '');
          const cMod = (c.config.modelVersion || '').trim();
          const fbMod = (fbConfig.modelVersion || '').trim();
          return cEp === fbEp && cMod === fbMod;
        }
        const cKey = (c.config.apiKey || '').trim();
        const fbKey = (fbConfig.apiKey || '').trim();
        const cMod = (c.config.modelVersion || '').trim();
        const fbMod = (fbConfig.modelVersion || '').trim();
        return cKey === fbKey && cMod === fbMod;
      });

      if (!isDuplicate) {
        candidates.push({ provider: p, config: fbConfig, isPrimary: false });
      }
    }
  }

  const errors: Array<{ provider: AIProvider; error: string }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const { provider: currentProvider, config: currentConfig, isPrimary } = candidates[i];

    const isDirect = currentConfig.modelMode === 'direct' || currentConfig.allSettings?.custom_gateway_model_mode === 'direct';
    const currentModel = (
      currentConfig.modelVersion?.trim() ||
      (currentProvider === 'custom'
        ? (isDirect
            ? currentConfig.allSettings?.custom_gateway_direct_model?.trim()
            : currentConfig.allSettings?.custom_gateway_model_version?.trim()) || 'Creator-Combo'
        : currentProvider === 'gemini'
        ? currentConfig.allSettings?.gemini_model_version || 'gemini-3.8-flash'
        : currentProvider === 'openrouter'
        ? currentConfig.allSettings?.openrouter_model_version || 'openrouter/auto'
        : currentConfig.allSettings?.ollama_model_version || 'llama3')
    ).trim();

    if (!isPrimary) {
      const prevCandidate = candidates[i - 1];
      const prevLabel = prevCandidate ? getProviderLabel(prevCandidate.provider) : getProviderLabel(primaryProvider);
      const prevErr = errors[errors.length - 1]?.error || 'Kegagalan koneksi';
      currentConfig.onLog?.(
        `⚠️ Provider ${prevLabel} mengalami kendala (${prevErr.slice(0, 60)}...). Mengalihkan ke provider cadangan: ${getProviderLabel(currentProvider)} (${currentModel})...`,
        'warn'
      );
    }

    try {
      const text = await executeSingleProviderWithLogging(prompt, currentConfig, currentModel, effectiveTimeoutMs);
      return {
        text,
        usedProvider: currentProvider,
        usedModel: currentModel,
        originalProvider: primaryProvider,
        wasSwitched: !isPrimary,
        switchReason: !isPrimary ? errors[0]?.error : undefined,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ provider: currentProvider, error: errMsg });

      const hasNext = i + 1 < candidates.length;
      if (!hasNext) {
        break;
      }
    }
  }

  // Jika semua kandidat gagal atau hanya provider utama yang dicoba
  if (errors.length <= 1) {
    throw new Error(errors[0]?.error || 'Permintaan AI gagal.');
  }

  const primaryErr = errors[0].error;
  const fallbackDetails = errors.slice(1).map((e) => `${getProviderLabel(e.provider)}: ${e.error}`).join('; ');
  throw new Error(`${primaryErr} (Failover cadangan juga gagal: ${fallbackDetails})`);
}

/**
 * Universal AI Caller (Helper cepat yang mengembalikan teks string langsung).
 * Mendukung failover multi-provider secara transparan.
 */
export async function callAI(
  prompt: string,
  config: ProviderConfig,
  timeoutMs: number = 60000
): Promise<string> {
  const result = await callAIWithFallback(prompt, config, timeoutMs);
  return result.text;
}

/**
 * Ekstraksi baris-baris data empiris, kronologi, angka, dan aset narasi penting dari bagian tengah teks
 * agar informasi krusial tidak hilang saat teks melebihi kapasitas context window.
 */
export function extractSalientMiddlePoints(text: string, maxChars: number): string {
  if (!text || maxChars <= 40) return '';

  // Pisahkan berdasarkan newline terlebih dahulu, namun jika terdapat paragraf sangat panjang (>250 karakter)
  // tanpa newline (misal salinan artikel web/PDF), pecah kalimat berdasarkan tanda baca (. ! ? ; •)
  const rawSegments = text.split('\n');
  const units: string[] = [];

  for (const rawSeg of rawSegments) {
    const trimmed = rawSeg.trim();
    if (!trimmed) continue;
    if (trimmed.length > 250) {
      const sentenceParts = trimmed.split(/(?<=[.!?;\u2022])\s+/);
      for (const sp of sentenceParts) {
        if (sp.trim()) units.push(sp.trim());
      }
    } else {
      units.push(trimmed);
    }
  }

  const empiricalRegex = /(?:[\u2022\u25cf\u25aa-]\s*|\b\d+(?:[.,]\d+)?%?|\b(?:19|20)\d{2}\b|\b(?:Rp|USD|\$|IDR|juta|miliar|triliun|persen|studi|riset|data|bukti|fakta|fact|kronologi|tahap|timeline|source|sumber|growth|pertumbuhan|survei)\b|[-*]\s+|\d+\.\s+|#+\s+|\|\s*)/i;

  const selectedLines: string[] = [];
  let currentLength = 0;

  for (const unit of units) {
    if (empiricalRegex.test(unit)) {
      const cleanLine = unit.length > 250 ? `${unit.substring(0, 247)}...` : unit;
      const addedLength = selectedLines.length > 0 ? cleanLine.length + 1 : cleanLine.length;
      if (currentLength + addedLength > maxChars) {
        break;
      }
      selectedLines.push(cleanLine);
      currentLength += addedLength;
    }
  }

  return selectedLines.join('\n');
}

/**
 * Ekstraksi cerdas konteks naskah/riset untuk AI actions.
 * Menghindari silent truncation sempit (seperti substring(0, 4000)).
 * Jika teks dalam batas maxTotal, seluruh teks dipertahankan secara utuh.
 * Jika teks melampaui maxTotal, bagian awal (Hook/Premis) dan bagian akhir (Resolusi/Stakes)
 * diekstrak secara proporsional, serta mengekstrak poin empiris, kronologis, dan angka dari bagian tengah
 * sehingga informasi inti tidak terbuang secara buta.
 * Output dijamin strictly <= maxTotal.
 */
export function extractSmartScriptContext(
  text: string,
  options?: {
    maxTotal?: number;
    headChars?: number;
    tailChars?: number;
  }
): string {
  if (!text) return '';
  const trimmed = text.trim();
  const maxTotal = options?.maxTotal ?? 20000;
  if (trimmed.length <= maxTotal) {
    return trimmed;
  }

  const NOTICE_PREFIX = '\n\n[... Bagian tengah diringkas untuk efisiensi konteks window (data empiris & poin kronologis penting dipertahankan):\n';
  const NOTICE_SUFFIX = '\n...]\n\n';
  const NOTICE_WRAPPER_LEN = NOTICE_PREFIX.length + NOTICE_SUFFIX.length; // 123 chars
  const NOTICE_EMPTY = '\n\n[... Bagian tengah diringkas untuk efisiensi konteks window ...]\n\n'; // 77 chars
  const NOTICE_MINIMAL = '\n\n[...]\n\n'; // 9 chars

  // Tentukan batas dasar head dan tail
  let headChars = options?.headChars ?? Math.floor(maxTotal * 0.4);
  let tailChars = options?.tailChars ?? Math.floor(maxTotal * 0.3);

  // Jika gabungan head + tail sudah mencakup seluruh teks, kembalikan teks utuh
  if (headChars + tailChars >= trimmed.length) {
    return trimmed;
  }

  // Sisakan ruang minimal untuk pemisah notice
  const minNoticeSpace = maxTotal > 120 ? NOTICE_EMPTY.length : NOTICE_MINIMAL.length;
  if (headChars + tailChars + minNoticeSpace > maxTotal) {
    const availableForHeadTail = Math.max(20, maxTotal - minNoticeSpace);
    const ratio = availableForHeadTail / (headChars + tailChars);
    headChars = Math.floor(headChars * ratio);
    tailChars = Math.floor(tailChars * ratio);
  }

  const head = trimmed.substring(0, headChars).trim();
  const tail = trimmed.substring(trimmed.length - tailChars).trim();

  // Ekstraksi data empiris, angka, dan kronologi dari bagian tengah jika masih ada alokasi budget
  const middleStartIndex = headChars;
  const middleEndIndex = trimmed.length - tailChars;
  const middleRaw = (middleStartIndex < middleEndIndex)
    ? trimmed.substring(middleStartIndex, middleEndIndex).trim()
    : '';

  const remainingBudget = maxTotal - head.length - tail.length;
  let middleNotice = remainingBudget >= NOTICE_EMPTY.length ? NOTICE_EMPTY : NOTICE_MINIMAL;

  if (remainingBudget >= NOTICE_WRAPPER_LEN + 30 && middleRaw.length > 0) {
    const maxSalientChars = remainingBudget - NOTICE_WRAPPER_LEN;
    const salientContent = extractSalientMiddlePoints(middleRaw, maxSalientChars);
    if (salientContent && salientContent.trim()) {
      middleNotice = `${NOTICE_PREFIX}${salientContent}${NOTICE_SUFFIX}`;
    }
  }

  const result = `${head}${middleNotice}${tail}`;
  if (result.length <= maxTotal) {
    return result;
  }
  // Hard guarantee: hasil akhir tidak pernah melampaui maxTotal
  return result.slice(0, maxTotal);
}

export async function generateResearchBriefPrompt(
  config: ProviderConfig,
  title: string,
  category: string,
  identityText: string,
  researchText?: string | null
): Promise<string> {
  const isOllama = config.provider === 'ollama';
  const boundedResearchText = researchText && researchText.trim()
    ? (isOllama
        ? extractSmartScriptContext(researchText.trim(), { maxTotal: 6000, headChars: 3000, tailChars: 3000 })
        : researchText.trim())
    : '';

  const initialNotesBlock = boundedResearchText
    ? `\n<initial_research_notes>\n${boundedResearchText}\n</initial_research_notes>`
    : '';

  const prompt = `Anda adalah **Senior Research AI Prompt Engineer & Argument Analyst**.
Tugas Anda adalah merancang instruksi (prompt siap salin) tingkat lanjut untuk pengguna ke LLM eksternal (ChatGPT/Claude/Gemini) untuk mengeksekusi "Deep Research & 10 Narrative Assets Extraction" yang berstandar tinggi.

<context>
<topic>${title}</topic>
<category>${category}</category>
<channel_identity>
${identityText}
</channel_identity>${initialNotesBlock}
</context>

<instructions>
Rancang prompt *Deep Research & Narrative Asset Extraction* dengan struktur Markdown yang sangat rapi, terarah, dan komprehensif:

1. **Peran, Pilar Konten, & Standar Riset**:
   - AI eksternal bertindak sebagai Research Editor & Argument Analyst untuk Zeinity.
   - 5 Pilar Konten Resmi Zeinity: 1. Internet & Social Media Culture | 2. AI & Technology Impact | 3. Digital Economy & Creator Economy | 4. Gaming & Digital Entertainment | 5. Modern Life & Digital Psychology.
   - Pilar kategori topik ini: "${category}".
   - Wajibkan eksplorasi mendalam, objektif, dan berbasis data empiris/studi kasus nyata untuk audiens digital natives / tech-savvy (18-35 tahun).
   - Bedakan secara tegas antara FACT (dapat diverifikasi), COMMUNITY SIGNAL (persepsi komunitas), INFERENCE (kesimpulan logis), dan JUDGMENT (penilaian editorial).
   - Jika terdapat <initial_research_notes>, sertakan catatan awal ide / sudut pandang kreator tersebut ke dalam prompt riset sebagai konteks penting atau hipotesis awal yang wajib dieksplorasi, diuji, dan diperdalam dengan bukti empiris.

2. **Ekstraksi 10 NARRATIVE ASSETS (Wajib Disiapkan untuk Naskah)**:
   Instruksikan AI eksternal untuk mengekstrak dan menyajikan 10 Narrative Assets secara eksplisit:
   (1) Strongest Opening Evidence: Bukti atau data tercepat yang membuktikan bahwa topik/judul ini nyata dan layak diperhatikan (untuk Provocative Evidence Hook 20-30 detik).
   (2) Central Contradiction: Dua fakta, kondisi, atau tren yang terasa bertentangan satu sama lain.
   (3) Obvious Answer: Jawaban umum atau dugaan awal yang kemungkinan besar dipikirkan penonton, untuk kemudian diuji dengan bukti.
   (4) Mechanism: Cara kerja sistem, insentif, algoritma, desain, atau psikologi yang sebenarnya berjalan di balik fenomena.
   (5) Escalation Evidence: Bukti atau data bahwa masalah/fenomena ini lebih besar atau berbeda dari dugaan awal.
   (6) Hidden Incentive / Hidden Cost: Motif ekonomi, bisnis, retensi platform, atau psikologis tersembunyi yang didukung data.
   (7) Best Counterargument: Argumen atau bukti terbaik dari sudut pandang berlawanan yang menguji premis awal.
   (8) Analogy Candidate: Analogi dunia nyata sederhana jika ada konsep teknis rumit yang butuh visualisasi pemikiran.
   (9) Bigger Picture: Hubungan atau implikasi fenomena ini terhadap ekosistem digital, industri, kreator, atau perilaku manusia modern.
   (10) Unresolved Question: Hal atau pertanyaan penting yang belum dapat dipastikan tanpa mengarang.

3. **Batasan Klaim & Integritas Data (Fact Verification)**:
   - Wajibkan AI eksternal menandai data yang rumpang, belum terkonfirmasi, atau spekulatif dengan tanda tegas: [PERLU VERIFIKASI].
   - Dilarang mengarang atau mengasumsikan data hanya agar riset terlihat lengkap.
   - Jangan menulis naskah pada tahap ini. Fokus 100% pada bukti empiris, argumen sebab-akibat, dan 10 Narrative Assets.

4. **Format Output Riset**:
   Instruksikan AI eksternal untuk menyajikan hasil riset dalam format:
   - Pertanyaan Utama Video
   - Ringkasan Eksekutif & Temuan Inti
   - Fakta & Konteks Empiris (dengan sumber/data)
   - 10 Narrative Assets (Lengkap 1-10)
   - Counter-Evidence & Sudut Pandang Alternatif
   - Hal yang Belum Dapat Dipastikan [PERLU VERIFIKASI]
   - Rekomendasi Alur Naskah (5 Tahap Zeinity)
   - Daftar Sumber Rujukan
</instructions>

<negative_constraints>
- JANGAN sertakan kalimat basa-basi seperti "Berikut adalah prompt yang bisa Anda gunakan:".
- Kembalikan HANYA teks prompt siap salin dalam format Markdown yang terstruktur rapi dengan heading ### dan bullet points.
</negative_constraints>`.trim();

  const res = await callAI(prompt, config);
  return formatStructuredPrompt(res);
}

export function formatStructuredPrompt(text?: string | null): string {
  if (!text) return '';
  let s = text.replace(/\\n/g, '\n').replace(/\\t/g, '  ');

  // Bersihkan pembungkus markdown codeblock jika output AI terbungkus ```markdown ... ```
  s = s.replace(/^```(?:markdown)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Bersihkan tag pembungkus XML sistem yang kadang terbawa pada output AI
  s = s.replace(/<\/?(?:instructions|negative_constraints|input_topic|channel_identity(?:_and_strategy)?|strategic_framework|initial_research_notes|research_notes|research_data|script_draft|draft_script|context|rules|prompt|output_format|boundary|dimensi_audit|panduan_tags|aturan_judul|never|topic|category|content_context|naskah(?:_untuk_diaudit)?|script_snippet)[^>]*>/gi, '');

  // Tangani teks yang terkompresi dalam satu paragraf tanpa jeda baris ganda
  if (!s.includes('\n\n') && s.length > 80) {
    s = s.replace(/([^\n])\s*(###+ )/g, '$1\n\n$2');
    s = s.replace(/([^\n])\s*(NARRATIVE ENGINE ZEINITY[^:]*:)/gi, '$1\n\n### NARRATIVE ENGINE ZEINITY (Logika Narasi Dinamis):\n');
    s = s.replace(/([^\n])\s*(Gunakan 5 Tahap Strategic Framework Zeinity[^:]*:)/gi, '$1\n\n### STRUKTUR WAJIB (5 TAHAP ZEINITY):\n');
    s = s.replace(/([^\n])\s*(Struktur wajib:)/gi, '$1\n\n### STRUKTUR WAJIB (5 TAHAP ZEINITY):\n');
    s = s.replace(/([^\n])\s*([1-5]\s+(?:Hook|Click Validation|Obvious Answer|Hidden Mechanism|Complication|Synthesis)[^,.)]*)/gi, '$1\n- **$2**');
    s = s.replace(/([^\n])\s*([1-5]\s+(?:Phenomenon|Mechanism|Incentive|Human Impact|Counter View)[^,.)]*)/gi, '$1\n- **$2**');
    s = s.replace(/([^\n])\s*(\[[1-5]\]\s+[^:\n]+:)/gi, '$1\n- **$2**');
    s = s.replace(/([^\n])\s*(Setiap tahap harus memuat:)/gi, '$1\n\n### ELEMEN SETIAP TAHAP:\n- ');
    s = s.replace(/([^\n])\s*(Wajib masukkan Hook[^.]*\.)/gi, '$1\n\n### HOOK PEMBUKA (5 DETIK):\n- $2');
    s = s.replace(/([^\n])\s*(Naskah harus dimulai dengan Hook[^.]*\.)/gi, '$1\n\n### HOOK PEMBUKA (5 DETIK):\n- $2');
    s = s.replace(/([^\n])\s*(Wajib masukkan Call-to-Action[^.]*\.|Akhiri dengan Call-to-Action[^.]*\.)/gi, '$1\n\n### CALL-TO-ACTION (CTA):\n- $2');
    s = s.replace(/([^\n])\s*(Gaya bahasa:)/gi, '$1\n\n### GAYA BAHASA & TONE OF VOICE:\n- ');
    s = s.replace(/([^\n])\s*(Gunakan data riset berikut:|Jelaskan konsep)/gi, '$1\n\n### DATA RISET PENDUKUNG:\n- ');
    s = s.replace(/([^\n])\s*(Sertakan transisi antar tahap[^.]*\.)/gi, '$1\n- $2');
    s = s.replace(/([^\n])\s*(Dilarang sensasi murahan[^.]*\.|Dilarang keras[^.]*\.)/gi, '$1\n\n### PANTANGAN & LARANGAN (DON\'TS):\n- $2');
    s = s.replace(/([^\n])\s*(Outline harus[^.]*\.)/gi, '$1\n\n### PRINSIP OUTLINE:\n- $2');
    s = s.replace(/([^\n])\s*(Output hanya [^.\n]+)/gi, '$1\n\n### FORMAT OUTPUT:\n- $2');
  }

  // Pastikan heading markdown memiliki jeda baris ganda di depannya
  s = s.replace(/([^\n])\s*(###+ )/g, '$1\n\n$2');
  s = s.replace(/([^\n])\s*(## )/g, '$1\n\n$2');

  // Pastikan poin bernomor atau tahapan [1], [2], dll memiliki baris baru
  s = s.replace(/([^\n])\s*(\[[1-5]\]\s+)/g, '$1\n$2');

  // Format poin kunci audit secara bersih dan idempoten (tanpa merusak tanda bintang ganda markdown)
  s = s.replace(/(?:^|\n)\s*(?:\*\*)?\s*BAGIAN ASLI:\s*(?:\*\*)?\s*/gi, '\n\n**BAGIAN ASLI:** ');
  s = s.replace(/(?:^|\n)\s*(?:\*\*)?\s*MASALAH:\s*(?:\*\*)?\s*/gi, '\n**MASALAH:** ');
  s = s.replace(/(?:^|\n)\s*(?:\*\*)?\s*REVISI:\s*(?:\*\*)?\s*/gi, '\n**REVISI:** ');
  s = s.replace(/(?:^|\n)\s*(?:\*\*)?\s*ALASAN:\s*(?:\*\*)?\s*/gi, '\n**ALASAN:** ');

  // Format label seksi File B secara bersih dan idempoten
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*Fungsi bagian:\s*(?:\*\*)?\s*/gi, '\n- **Fungsi bagian:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*Isi utama:\s*(?:\*\*)?\s*/gi, '\n- **Isi utama:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*Argumen:\s*(?:\*\*)?\s*/gi, '\n- **Argumen:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*Bukti\/contoh:\s*(?:\*\*)?\s*/gi, '\n- **Bukti/contoh:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*Arah transisi:\s*(?:\*\*)?\s*/gi, '\n- **Arah transisi:** ');

  // Format opsi output thumbnail
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*OPSI\s*([1-3]):?\s*(?:\*\*)?\s*/gi, '\n\n**OPSI $1:**');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*TEKS:\s*(?:\*\*)?\s*/gi, '\n- **TEKS:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*ALASAN EMOSIONAL:\s*(?:\*\*)?\s*/gi, '\n- **ALASAN EMOSIONAL:** ');
  s = s.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*KONSEP VISUAL:\s*(?:\*\*)?\s*/gi, '\n- **KONSEP VISUAL:** ');

  // Rapikan baris kosong berlebih
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

export function parseJsonResponse<T>(raw: string): Partial<T> {
  let cleaned = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1) {
    cleaned = cleaned.substring(first, last + 1);
  }

  // Stage 1: Clean trailing commas before object/array close and attempt standard JSON.parse
  const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(withoutTrailingCommas) as T;
  } catch {
    // Stage 2: Normalize literal unescaped newlines and tabs inside string literals
    try {
      let inString = false;
      let escaped = false;
      let sanitized = '';
      for (let i = 0; i < withoutTrailingCommas.length; i++) {
        const char = withoutTrailingCommas[i];
        if (escaped) {
          sanitized += char;
          escaped = false;
          continue;
        }
        if (char === '\\') {
          sanitized += char;
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          sanitized += char;
          continue;
        }
        if (inString) {
          if (char === '\n') {
            sanitized += '\\n';
            continue;
          }
          if (char === '\r') {
            continue;
          }
          if (char === '\t') {
            sanitized += '\\t';
            continue;
          }
        }
        sanitized += char;
      }
      return JSON.parse(sanitized) as T;
    } catch {
      // Stage 3: Robust key-by-key pattern extraction for corrupted/malformed JSON with internal quotes
      try {
        const result: Record<string, string> = {};
        const knownKeys = ['findings', 'revisedDraft', 'summary', 'annotatedScript', 'titleA', 'titleB', 'explanation'];
        const otherKeysPattern = (currentKey: string) =>
          knownKeys.filter((k) => k !== currentKey).join('|');

        for (const key of knownKeys) {
          const others = otherKeysPattern(key);
          const regex = new RegExp(
            `"${key}"\\s*:\\s*"([\\s\\S]*?)(?=(?:"\\s*,\\s*"(?:${others})"\\s*:|"(?:\\s*,)?\\s*}\\s*$))`,
            'i'
          );
          const match = cleaned.match(regex);
          if (match && match[1] !== undefined) {
            result[key] = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .trim();
          }
        }
        return result as Partial<T>;
      } catch {
        return {} as Partial<T>;
      }
    }
  }
}

export async function generateScriptwriterHandoff(
  config: ProviderConfig,
  title: string,
  researchOutput: string,
  identityText: string
): Promise<string> {
  const prompt = `Anda adalah Executive YouTube Producer & Chief Content Strategist (Zeinity).
Tugas Anda: susun SATU "Scriptwriter Handoff Document" yang siap dikirimkan langsung ke AI Scriptwriter eksternal. Dokumen ini menggabungkan:
  1. KERANGKA NASKAH spesifik berdasarkan hasil riset (bukan template generik)
  2. PANDUAN SCRIPTWRITER lengkap (Spoken-First + TTS-Aware + aturan Zeinity)

<context>
<topic>${title}</topic>
<research_data>
${extractSmartScriptContext(researchOutput, config.provider === 'ollama' ? { maxTotal: 12000, headChars: 6000, tailChars: 6000 } : { maxTotal: 40000, headChars: 20000, tailChars: 20000 })}
</research_data>
<channel_identity_and_strategy>
${identityText}
</channel_identity_and_strategy>
</context>

<instructions_bagian_1_kerangka>
Buat kerangka naskah video analitis 8–12 menit menggunakan 5 Tahap Zeinity Framework.
Alur Narasi Wajib (5 Tahap Zeinity Framework: Phenomenon -> Mechanism -> Incentive -> Human Impact -> Counter View):
Gunakan Narrative Engine Zeinity (Logika Narasi Dinamis) secara fleksibel tanpa terasa mengisi template administratif:
  I. HOOK & CLICK VALIDATION (0–30 Detik): Provocative Evidence Hook langsung membuktikan janji judul memanfaatkan Strongest Opening Evidence dari data riset. Validasi langsung alasan penonton harus peduli.
  II. OBVIOUS ANSWER VS REALITY: Broken assumption — uji jawaban awam (Obvious Answer) yang paling umum dipikirkan penonton vs Central Contradiction dari bukti riset.
  III. THE HIDDEN MECHANISM: Bedah mekanisme teknis sistemik dan hidden incentive atau hidden cost di balik layar. Jelaskan mesin sebelum membuat penilaian (Mechanism before Judgment).
  IV. COMPLICATION & ESCALATION: Masukkan bukti eskalasi dampak nyata (Human Impact & Escalation Evidence) dan argumen tandingan terkuat (Best Counterargument) yang menguji analisis.
  V. SYNTHESIS & BIGGER PICTURE: Tarik benang merah analitis tanpa ketergesaan (Delayed Judgment), Bigger Picture ke ekosistem/industri, dan pertanyaan reflektif penutup.

Wajibkan konsumsi 10 Narrative Assets dari research_data: Strongest Opening Evidence, Central Contradiction, Obvious Answer, Mechanism, Escalation Evidence, Hidden Cost/Incentive, Best Counterargument, Analogy Candidate, Bigger Picture, Unresolved Question.
Aturan Evidence Safety: Klaim berlabel [PERLU VERIFIKASI] DILARANG KERAS disajikan sebagai fakta terbukti dalam kerangka; hanya boleh diangkat sebagai pertanyaan terbuka atau spekulasi yang belum terverifikasi.

Kerangka HARUS kontekstual — gunakan temuan spesifik dari research_data di atas (jangan buat outline generik).
Setiap bagian wajib memuat 5 elemen:
  * Fungsi Bagian: misi psikologis segmen bagi penonton
  * Isi Utama: poin pembahasan spesifik dari riset
  * Argumen: posisi analitis yang disampaikan
  * Bukti / Data: fakta aktual dari riset (kutip data jika ada)
  * Arah Transisi: jembatan alami ke segmen berikutnya
</instructions_bagian_1_kerangka>

<instructions_bagian_2_scriptwriter>
Setelah kerangka, sertakan panduan scriptwriter lengkap (standar SPOKEN-FIRST + TTS-AWARE + DYNAMIC SENTENCE LENGTH):
- Persona & Filosofi: Diskusi dengan teman sebaya yang kebetulan sudah melakukan riset lebih dulu. Bukan artikel ensiklopedia, bukan presentasi formal, bukan pembacaan berita. Penonton diajak berpikir bersama. Selaraskan dengan 5 Pilar Konten Resmi Zeinity (Internet & Social Media Culture, AI & Technology Impact, Digital Economy & Creator Economy, Gaming & Digital Entertainment, Modern Life & Digital Psychology).
- Panjang Kalimat Dinamis: Jangan buat semua kalimat pendek seperti trailer. Biarkan kalimat mengalir mengikuti satu unit pemikiran utuh secara organik. Kalimat pendek hanya untuk punchline atau penekanan.
- Punctuation sebagai Prosodi Audio: Koma (,) untuk jeda napas ringan saat ide berlanjut. Titik (.) untuk gagasan selesai. JANGAN gunakan rentetan titik berlebihan yang merusak intonasi AI TTS. JANGAN gunakan line break sebagai pengganti koma.
- Pantangan Keras (Negative Constraints Lengkap):
  * DILARANG KERAS menggunakan em dash (—) dan tanda titik dua (:) dalam narasi voice-over.
  * DILARANG ragam tulis ensiklopedia / akademis / artikel kaku: "Hal tersebut menunjukkan bahwa...", "Dapat disimpulkan bahwa...", "Dalam konteks ini...", "Lebih lanjut...", "Pada akhirnya, dapat dikatakan...".
  * DILARANG transisi formal kaku: "Selanjutnya, mari kita membahas...", "Di sisi lain, terdapat aspek lain...", "Selain itu...".
  * DILARANG spam filler kata tutur: melarang kata "nah", "tapi", "masalahnya", "jadi", "cuma" berulang di awal setiap kalimat atau paragraf.
  * DILARANG rentetan rhetorical question (pertanyaan retoris) bertubi-tubi.
  * DILARANG memakai pola frasa klise AI: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "Tidak cuma X, tetapi juga Y", "dan BOOM", "eh bentar deh".
  * DILARANG kalimat pembuka klise ("Di era digital yang serba cepat ini...").
  * DILARANG menambahkan fakta di luar data riset. Klaim berlabel [PERLU VERIFIKASI] tidak boleh disajikan sebagai fakta terbukti.
- Visual Cue inline: Sertakan arahan visual fungsional [BUKTI], [JELASKAN], [KONTEKS], [TEKANKAN], [RITME] pada baris terpisah tanpa titik dua setelah nama tag.
</instructions_bagian_2_scriptwriter>

<output_format>
Kembalikan teks dokumen handoff dalam format Markdown yang rapi dengan heading ### dan bullet points.
Mulai langsung dengan "## SCRIPTWRITER HANDOFF — ${title}" tanpa kalimat basa-basi pengantar seperti "Berikut adalah dokumennya:".
</output_format>`.trim();

  const res = await callAI(prompt, config);
  return formatStructuredPrompt(res);
}

// ─── In-App AI Scriptwriter & Dual-Track Helpers ─────────────────────────────

export function calculateTargetWords(
  duration?: string | null,
  customMode?: 'words' | 'minutes',
  customVal?: number | string | null
): number {
  if (!duration) return 1200;
  const d = duration.trim().replace(/[\u2013\u2014]/g, '-').toLowerCase();
  if (d.includes('60s')) return 150;
  if (d.includes('1-3m')) return 350;
  if (d.includes('5-8m')) return 1200;
  if (d.includes('8-12m')) return 1600;
  if (d.startsWith('custom')) {
    let num: number = NaN;
    if (typeof customVal === 'number') {
      num = customVal;
    } else if (typeof customVal === 'string') {
      const trimmed = customVal.trim();
      if (customMode === 'words') {
        const normalized = /^\d{1,3}[.,]\d{3}$/.test(trimmed)
          ? trimmed.replace(/[.,]/g, '')
          : trimmed.replace(/[^\d.-]/g, '');
        num = Number(normalized);
      } else {
        const normalized = trimmed.replace(',', '.').replace(/[^\d.-]/g, '');
        num = Number(normalized);
      }
    }

    if (!Number.isNaN(num) && num > 0) {
      if (customMode === 'minutes') {
        return Math.round(num * 150);
      }
      if (customMode === 'words') {
        return Math.round(num);
      }
    }
    return 1200;
  }
  return 1200;
}

export async function generateZeinityOutline(
  config: ProviderConfig,
  title: string,
  researchOutput: string,
  category?: string | null,
  initialNotes?: string | null,
  angleNotes?: string | null,
  targetWords?: number | null,
  targetDuration?: string | null,
  revisionNotes?: string | null
): Promise<string> {
  const isOllama = config.provider === 'ollama';
  const boundedResearch = extractSmartScriptContext(
    researchOutput || '',
    isOllama
      ? { maxTotal: 12000, headChars: 6000, tailChars: 6000 }
      : { maxTotal: 40000, headChars: 20000, tailChars: 20000 }
  );

  const durationStr = targetDuration?.trim() || '5-8m';
  const wordsTarget = targetWords || 1200;

  const notesSection = initialNotes && initialNotes.trim()
    ? `\n<initial_notes>\n${initialNotes.trim()}\n</initial_notes>`
    : '';

  const angleSection = angleNotes && angleNotes.trim()
    ? `\n<angle_khusus>\n${angleNotes.trim()}\n</angle_khusus>`
    : '';

  const revisionSection = revisionNotes && revisionNotes.trim()
    ? `\n<catatan_revisi_kreator>\nPERHATIAN: Kreator meminta revisi kerangka sebelumnya dengan catatan berikut:\n${revisionNotes.trim()}\nWajib perbarui kerangka 5 babak di bawah sesuai arahan koreksi ini.\n</catatan_revisi_kreator>`
    : '';

  const prompt = `Anda adalah Senior Executive Content Strategist & Story Architect (Zeinity).
Tugas Anda: susun KERANGKA NASKAH NARRATIVE ENGINE 5 TAHAP ZEINITY (Logika Narasi Dinamis) yang presisi, mendalam, dan berbasis data riset aktual untuk video analitis (Target Durasi: ${durationStr} | Estimasi: ~${wordsTarget} Kata).

<context>
<topic>${title}</topic>
<category>${category || 'Umum'}</category>${notesSection}${angleSection}${revisionSection}
<research_data>
${boundedResearch}
</research_data>
</context>

<instructions>
Susun kerangka naskah menggunakan Narrative Engine Zeinity (5 Beat Dinamis, hindari template administratif yang kaku):
1. I. HOOK & CLICK VALIDATION (0–30s): Provocative Evidence Hook yang langsung membuktikan janji judul memanfaatkan Strongest Opening Evidence dari data riset. Validasi langsung mengapa penonton harus peduli sekarang tanpa latar belakang umum yang bertele-tele.
2. II. OBVIOUS ANSWER VS REALITY: Broken assumption — hadapkan dugaan awam/jawaban umum penonton (Obvious Answer) dengan realita paradoksal dan keanehan (Central Contradiction) berdasarkan bukti riset.
3. III. THE HIDDEN MECHANISM & INCENTIVES: Bedah mekanisme teknis sistemik, algoritma, atau arsitektur insentif ekonomi/psikologi yang bekerja di balik layar (Hidden Mechanism & Hidden Incentive/Cost). Jelaskan mekanisme sebelum memberi penghakiman (Mechanism before Judgment).
4. IV. COMPLICATION & HUMAN IMPACT: Eskalasi dampak nyata bagi manusia/kreator/industri (Human Impact), bukti eskalasi (Escalation Evidence), serta masukkan Best Counterargument (argumen tandingan terkuat) yang menguji analisis.
5. V. SYNTHESIS & BIGGER PICTURE: Delayed judgment, benang merah analitis yang mencerahkan dan proporsional dengan evidence, Bigger Picture yang menghubungkan fenomena ke pola industri/perilaku digital yang lebih luas, dan pertanyaan reflektif penutup.

${angleNotes && angleNotes.trim() ? `PENTING: Wajib integrasikan sudut pandang khusus dari <angle_khusus> di atas ("${angleNotes.trim()}") ke dalam alur babak yang relevan.\n` : ''}

Wajib Manfaatkan 10 NARRATIVE ASSETS dari riset:
(1) Strongest Opening Evidence, (2) Central Contradiction, (3) Obvious Answer, (4) Mechanism, (5) Escalation Evidence, (6) Hidden Incentive/Cost, (7) Best Counterargument, (8) Analogy Candidate, (9) Bigger Picture, (10) Unresolved Question.

ATURAN KETAT EVIDENCE SAFETY:
- Klaim atau data yang berlabel [PERLU VERIFIKASI] DILARANG KERAS dijadikan fakta mutlak dalam kerangka.
- Bagian tersebut HANYA boleh diangkat sebagai pertanyaan terbuka (Unresolved Question) atau spekulasi yang belum terbukti.

Setiap babak WAJIB memuat 5 elemen terstruktur:
- Fungsi Bagian: misi psikologis segmen bagi penonton
- Isi Utama: poin pembahasan spesifik dari riset
- Argumen: posisi analitis yang disampaikan
- Bukti / Data: kutipan fakta atau data aktual dari riset
- Arah Transisi: jembatan alami ke segmen berikutnya
</instructions>

<negative_constraints>
- JANGAN gunakan framework bernama sebagai template kaku administratif. Buat alur narasi dinamis yang didorong rasa ingin tahu (curiosity) dan rantai pertanyaan (question chaining).
- JANGAN buat outline generik atau mengarang data di luar <research_data>.
- JANGAN sertakan kalimat basa-basi pengantar ("Berikut adalah kerangkanya...").
- Outputkan langsung dokumen kerangka Markdown terstruktur rapi dengan heading ### dan bullet points.
</negative_constraints>`.trim();

  const res = await callAI(prompt, config);
  return formatStructuredPrompt(res);
}

export async function generateZeinityFullScript(
  config: ProviderConfig,
  title: string,
  approvedOutline: string,
  researchOutput: string,
  identityText: string,
  targetWords?: number | null,
  angleNotes?: string | null,
  category?: string | null,
  initialNotes?: string | null
): Promise<string> {
  const isOllama = config.provider === 'ollama';
  const boundedResearch = extractSmartScriptContext(
    researchOutput || '',
    isOllama
      ? { maxTotal: 10000, headChars: 5000, tailChars: 5000 }
      : { maxTotal: 30000, headChars: 15000, tailChars: 15000 }
  );

  const targetWordCount = targetWords || 1200;

  const categorySection = category && category.trim()
    ? `\n<category>${category.trim()}</category>`
    : '';

  const notesSection = initialNotes && initialNotes.trim()
    ? `\n<initial_notes>\n${initialNotes.trim()}\n</initial_notes>`
    : '';

  const angleSection = angleNotes && angleNotes.trim()
    ? `\n<angle_khusus>\n${angleNotes.trim()}\n</angle_khusus>`
    : '';

  const prompt = `Anda adalah Lead Spoken-First Scriptwriter & Executive Narrator untuk channel YouTube Zeinity.
Tugas Anda: Tulis NASKAH VIDEO LENGKAP UTUH yang siap dibacakan langsung oleh voice-over talent / AI TTS, berdasarkan Kerangka Dinamis Narrative Engine 5 Tahap Zeinity yang telah disetujui kreator dan data riset empiris.
Target Panjang Naskah: Sekitar ${targetWordCount} Kata.

<context>
<topic>${title}</topic>${categorySection}${notesSection}
<approved_outline>
${approvedOutline}
</approved_outline>
<research_data>
${boundedResearch}
</research_data>
<channel_identity_and_voice>
${identityText || '(Identitas Zeinity: Analitis, lugas, santai elegan)'}
</channel_identity_and_voice>${angleSection}
</context>

<spoken_first_and_tts_rules>
1. TONE OF VOICE (SPOKEN-FIRST):
   - Seperti sedang berdiskusi dengan teman sebaya yang cerdas dan setara, yang kebetulan sudah meriset topik ini lebih dulu. Penonton diajak ikut berpikir dan menemukan mekanismenya, bukan sedang diajari atau diberi kuliah.
   - BUKAN artikel koran/ensiklopedia, BUKAN presentasi seminar formal, BUKAN pembacaan berita televisi.
   - Naskah mengalir alami saat diucapkan dengan keras (breathe-friendly). Kompleksitas ada di pemikiran, bukan di pilihan kosakata.

2. NARRATIVE ENGINE & KONSUMSI 10 NARRATIVE ASSETS:
   - Gerakkan narasi secara dinamis: Click Validation (Opening 20-30 detik membayar janji judul dengan Strongest Opening Evidence) -> Curiosity & Broken Assumption (Obvious Answer vs Central Contradiction) -> The Hidden Mechanism (Mechanism before Judgment & Hidden Incentive) -> Complication & Human Impact (Escalation Evidence & Best Counterargument) -> Synthesis & Bigger Picture (Delayed Judgment & refleksi penutup).
   - Manfaatkan secara aktif 10 Narrative Assets yang tersedia dalam research_data.

3. ATURAN KETAT EVIDENCE SAFETY:
   - Semua fakta, angka, kronologi, dan data teknis WAJIB bersumber dari <research_data>.
   - Data atau klaim berlabel [PERLU VERIFIKASI] DILARANG KERAS disajikan sebagai fakta yang terbukti. Bagian ini HANYA boleh diangkat sebagai pertanyaan terbuka atau spekulasi yang belum dapat dipastikan.
   - DILARANG mengarang fakta, pengalaman pribadi creator fiktif, dialog rekaan, atau reaksi komunitas yang tidak ada di riset.

4. PANJANG KALIMAT DINAMIS (DYNAMIC SENTENCE LENGTH):
   - Jangan seragamkan semua kalimat menjadi pendek seperti trailer atau copywriting.
   - Jangan membuat semua kalimat berukuran sama. Biarkan kalimat mengalir mengikuti satu unit pemikiran utuh secara organik.
   - Gunakan kalimat pendek untuk penekanan, punchline, atau pergeseran pemikiran.

5. TANDA BACA & PROSODI AUDIO TTS:
   - Tanda koma (,) untuk jeda napas ringan di mana ide berlanjut.
   - Tanda titik (.) untuk gagasan selesai yang menyebabkan intonasi turun secara natural.
   - JANGAN gunakan rentetan titik berlebihan (...) yang merusak prosodi AI TTS.
   - JANGAN gunakan enter / line break tunggal sebagai pengganti koma. Pemisah baris hanya dipakai untuk pergantian gagasan/paragraf, bukan setiap kali ingin jeda bicara.

6. PANTANGAN KERAS (NEGATIVE CONSTRAINTS LENGKAP):
   - DILARANG KERAS menggunakan em dash (—) dalam teks narasi voice-over (ganti koma atau titik).
   - DILARANG menggunakan tanda titik dua (:) di dalam kalimat narasi voice-over.
   - DILARANG ragam tulis ensiklopedia / akademis / artikel kaku:
     * "Hal tersebut menunjukkan bahwa..."
     * "Dapat disimpulkan bahwa..."
     * "Dalam konteks ini..."
     * "Lebih lanjut..."
     * "Pada akhirnya, dapat dikatakan..."
   - DILARANG transisi formal kaku:
     * "Selanjutnya, mari kita membahas..."
     * "Di sisi lain, terdapat aspek lain..."
     * "Selain itu..."
   - DILARANG spam filler kata tutur: kata "nah", "tapi", "masalahnya", "jadi", "cuma" dilarang dipakai secara berulang-ulang di awal setiap paragraf/kalimat monoton.
   - DILARANG rentetan rhetorical question (pertanyaan retoris) bertubi-tubi.
   - DILARANG memakai pola kalimat klise AI: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "Tidak cuma X, tetapi juga Y", "dan BOOM", "eh bentar deh".
   - DILARANG kalimat pembuka klise seperti "Di era digital yang serba cepat ini...".
   - DILARANG mengarang fakta di luar data riset.

7. VISUAL CUE INLINE:
   - Sisipkan arahan visual ringkas fungsional [BUKTI ...], [JELASKAN ...], [KONTEKS ...], [TEKANKAN ...], [RITME ...] pada baris tersendiri tanpa tanda titik dua setelah nama tag.
</spoken_first_and_tts_rules>

<output_instructions>
- Tulis naskah lengkap dari Babak I hingga Babak V secara utuh tanpa terpotong.
- Target kuantitatif: Dekati sekitar ${targetWordCount} kata.
- Mulai langsung dengan kalimat pertama narasi pembuka (tanpa salam pembuka klise, tanpa pengantar seperti "Berikut naskahnya:").
</output_instructions>`.trim();

  const res = await callAI(prompt, config);
  const formatted = formatStructuredPrompt(res);
  return formatted.replace(/—/g, ', ');
}

export type ScriptBeatNumber = 1 | 2 | 3 | 4 | 5;

export interface ScriptBeatInfo {
  beatNumber: ScriptBeatNumber;
  id: string;
  name: string;
  shortName: string;
  stageName: string;
  description: string;
  targetRatio: number;
}

export const SCRIPT_BEATS: ScriptBeatInfo[] = [
  {
    beatNumber: 1,
    id: 'beat_1',
    name: 'Babak 1: Hook & Click Validation',
    shortName: 'Babak 1: Hook',
    stageName: 'HOOK & CLICK VALIDATION',
    description: 'Opening 20-30 detik membuktikan janji judul dengan Strongest Opening Evidence empiris riset.',
    targetRatio: 0.15,
  },
  {
    beatNumber: 2,
    id: 'beat_2',
    name: 'Babak 2: Curiosity & Broken Assumption',
    shortName: 'Babak 2: Curiosity',
    stageName: 'OBVIOUS ANSWER VS REALITY',
    description: 'Uji jawaban awam (Obvious Answer) vs realita paradoksal dan anomali (Central Contradiction).',
    targetRatio: 0.20,
  },
  {
    beatNumber: 3,
    id: 'beat_3',
    name: 'Babak 3: The Hidden Mechanism',
    shortName: 'Babak 3: Core Mechanism',
    stageName: 'THE HIDDEN MECHANISM & INCENTIVES',
    description: 'Bedah mekanisme sistemik, struktur insentif, dan dinamika tersembunyi sebelum memberi judgement.',
    targetRatio: 0.30,
  },
  {
    beatNumber: 4,
    id: 'beat_4',
    name: 'Babak 4: Complication & Human Escalation',
    shortName: 'Babak 4: Human Escalation',
    stageName: 'COMPLICATION & HUMAN IMPACT',
    description: 'Eskalasi dampak nyata bagi manusia/kreator/industri & argumen tandingan terkuat.',
    targetRatio: 0.20,
  },
  {
    beatNumber: 5,
    id: 'beat_5',
    name: 'Babak 5: Synthesis & Bigger Picture',
    shortName: 'Babak 5: Synthesis',
    stageName: 'SYNTHESIS & BIGGER PICTURE',
    description: 'Delayed judgment, sintesis analitis yang proporsional dengan bukti, dan pertanyaan reflektif penutup.',
    targetRatio: 0.15,
  },
];

export function getScriptBeatInfo(beatNumber: ScriptBeatNumber): ScriptBeatInfo {
  const found = SCRIPT_BEATS.find((b) => b.beatNumber === beatNumber);
  return found || SCRIPT_BEATS[0];
}

export function calculateBeatTargetWords(beatNumber: ScriptBeatNumber, totalWords: number): number {
  const info = getScriptBeatInfo(beatNumber);
  const words = Math.round(totalWords * info.targetRatio);
  return Math.max(words, 80);
}

export function getBeatHeadingPattern(beatNumber: ScriptBeatNumber): RegExp {
  const romanMap: Record<ScriptBeatNumber, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
  };
  const roman = romanMap[beatNumber];
  return new RegExp(
    `(^|\\n)(?:#{1,4}\\s*|\\*{1,2}\\s*)?(?:(?:BABAK|Babak|Stage|Tahap)\\s*(?:${beatNumber}|${roman})\\b|(?:#{1,4}\\s*|\\*{1,2}\\s*)(?:${beatNumber}|${roman})\\.)[:\\s\\-\\.\\)\\*]`,
    'i'
  );
}

export function extractBeatFromScript(script: string, beatNumber: ScriptBeatNumber): string | null {
  if (!script || !script.trim()) return null;
  const currentRegex = getBeatHeadingPattern(beatNumber);
  const matchCurrent = script.search(currentRegex);
  if (matchCurrent === -1) return null;

  const contentAfterCurrent = script.slice(matchCurrent);
  let nextStartIndex = -1;
  for (let next = (beatNumber + 1) as ScriptBeatNumber; next <= 5; next = (next + 1) as ScriptBeatNumber) {
    const nextRegex = getBeatHeadingPattern(next);
    const matchNext = contentAfterCurrent.slice(1).search(nextRegex);
    if (matchNext !== -1) {
      nextStartIndex = matchNext + 1;
      break;
    }
  }

  if (nextStartIndex !== -1) {
    return contentAfterCurrent.slice(0, nextStartIndex).trim();
  }
  return contentAfterCurrent.trim();
}

export function replaceBeatInScript(
  script: string,
  beatNumber: ScriptBeatNumber,
  newBeatContent: string
): string {
  const trimmedNewBeat = newBeatContent.trim();
  if (!script || !script.trim()) {
    return trimmedNewBeat;
  }

  const currentRegex = getBeatHeadingPattern(beatNumber);
  const matchCurrent = script.search(currentRegex);

  if (matchCurrent === -1) {
    // If beat is missing, look for any later beat so we can insert chronologically before it
    let nextBeatIndex = -1;
    for (let next = (beatNumber + 1) as ScriptBeatNumber; next <= 5; next = (next + 1) as ScriptBeatNumber) {
      const nextRegex = getBeatHeadingPattern(next);
      const matchNext = script.search(nextRegex);
      if (matchNext !== -1) {
        nextBeatIndex = matchNext;
        break;
      }
    }

    if (nextBeatIndex !== -1) {
      const before = script.slice(0, nextBeatIndex).trimEnd();
      const after = script.slice(nextBeatIndex).trimStart();
      if (before && after) {
        return `${before}\n\n${trimmedNewBeat}\n\n${after}`;
      } else if (after) {
        return `${trimmedNewBeat}\n\n${after}`;
      }
    }

    return script.trim() ? `${script.trim()}\n\n${trimmedNewBeat}` : trimmedNewBeat;
  }

  const beforeBeat = script.slice(0, matchCurrent).trimEnd();
  const contentFromBeat = script.slice(matchCurrent);

  let nextStartIndex = -1;
  for (let next = (beatNumber + 1) as ScriptBeatNumber; next <= 5; next = (next + 1) as ScriptBeatNumber) {
    const nextRegex = getBeatHeadingPattern(next);
    const matchNext = contentFromBeat.slice(1).search(nextRegex);
    if (matchNext !== -1) {
      nextStartIndex = matchNext + 1;
      break;
    }
  }

  const afterBeat = nextStartIndex !== -1 ? contentFromBeat.slice(nextStartIndex).trimStart() : '';

  if (beforeBeat && afterBeat) {
    return `${beforeBeat}\n\n${trimmedNewBeat}\n\n${afterBeat}`;
  } else if (beforeBeat) {
    return `${beforeBeat}\n\n${trimmedNewBeat}`;
  } else if (afterBeat) {
    return `${trimmedNewBeat}\n\n${afterBeat}`;
  }
  return trimmedNewBeat;
}

export async function generateZeinityBeatScript(
  config: ProviderConfig,
  beatNumber: ScriptBeatNumber,
  title: string,
  approvedOutline: string,
  researchOutput: string,
  identityText: string,
  options?: {
    totalTargetWords?: number | null;
    targetWords?: number | null;
    angleNotes?: string | null;
    category?: string | null;
    initialNotes?: string | null;
    currentScript?: string | null;
    revisionNotes?: string | null;
  }
): Promise<string> {
  const beatInfo = getScriptBeatInfo(beatNumber);
  const totalWords = options?.totalTargetWords || 1200;
  const beatWords = options?.targetWords || calculateBeatTargetWords(beatNumber, totalWords);

  const isOllama = config.provider === 'ollama';
  const boundedResearch = extractSmartScriptContext(
    researchOutput || '',
    isOllama
      ? { maxTotal: 10000, headChars: 5000, tailChars: 5000 }
      : { maxTotal: 30000, headChars: 15000, tailChars: 15000 }
  );

  const categorySection = options?.category && options.category.trim()
    ? `\n<category>${options.category.trim()}</category>`
    : '';

  const notesSection = options?.initialNotes && options.initialNotes.trim()
    ? `\n<initial_notes>\n${options.initialNotes.trim()}\n</initial_notes>`
    : '';

  const angleSection = options?.angleNotes && options.angleNotes.trim()
    ? `\n<angle_khusus>\n${options.angleNotes.trim()}\n</angle_khusus>`
    : '';

  const currentScriptContext = options?.currentScript && options.currentScript.trim()
    ? `\n<existing_script_context>\nBerikut adalah naskah babak lain yang sudah ada saat ini untuk menjaga konsistensi nada tutur, ritme narasi, dan kesinambungan:\n${options.currentScript.trim().slice(0, 5000)}\n</existing_script_context>`
    : '';

  const revisionSection = options?.revisionNotes && options.revisionNotes.trim()
    ? `\n<catatan_revisi_khusus_babak_${beatNumber}>\n${options.revisionNotes.trim()}\n</catatan_revisi_khusus_babak_${beatNumber}>`
    : '';

  const prompt = `Anda adalah Lead Spoken-First Scriptwriter & Executive Narrator untuk channel YouTube Zeinity.
Tugas Anda: Tulis KHUSUS ${beatInfo.name.toUpperCase()} (${beatInfo.stageName}) untuk video analitis Zeinity, tanpa mengubah atau menulis ulang babak lainnya.
Target Panjang Khusus Babak Ini: Sekitar ${beatWords} Kata (dari total naskah ~${totalWords} kata).

<context>
<topic>${title}</topic>${categorySection}${notesSection}
<target_beat>
Nomor Babak: ${beatInfo.beatNumber}
Nama Babak: ${beatInfo.name}
Fokus Panggung: ${beatInfo.stageName}
Deskripsi Peran: ${beatInfo.description}
</target_beat>
<approved_outline>
${approvedOutline}
</approved_outline>
<research_data>
${boundedResearch}
</research_data>
<channel_identity_and_voice>
${identityText || '(Identitas Zeinity: Analitis, lugas, santai elegan)'}
</channel_identity_and_voice>${angleSection}${currentScriptContext}${revisionSection}
</context>

<spoken_first_and_tts_rules>
1. TONE OF VOICE (SPOKEN-FIRST):
   - Seperti sedang berdiskusi dengan teman sebaya yang cerdas dan setara. Breathe-friendly.
   - BUKAN artikel koran/ensiklopedia, BUKAN presentasi formal.
2. ATURAN EVIDENCE SAFETY:
   - Wajib bersumber dari <research_data>.
   - Dilarang menyajikan [PERLU VERIFIKASI] sebagai fakta terbukti.
   - Dilarang halusinasi data.
3. PANTANGAN KERAS:
   - DILARANG KERAS menggunakan em dash (—) dalam teks narasi voice-over (ganti koma atau titik).
   - DILARANG menggunakan tanda titik dua (:) di dalam kalimat narasi voice-over.
   - DILARANG kalimat klise: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM", "Di era digital yang serba cepat ini...".
   - DILARANG transisi kaku: "Selanjutnya, mari kita membahas...", "Di sisi lain...".
4. VISUAL CUE INLINE:
   - Sisipkan arahan visual ringkas fungsional [BUKTI ...], [JELASKAN ...] pada baris tersendiri tanpa tanda titik dua.
</spoken_first_and_tts_rules>

<output_instructions>
- Berikan judul babak di baris pertama berupa: "### BABAK ${beatInfo.beatNumber}: ${beatInfo.stageName}"
- Lanjutkan langsung dengan teks narasi voice-over untuk babak ini.
- Dekati sekitar ${beatWords} kata.
- Jangan menyertakan salam pembuka atau kalimat pengantar di luar naskah.
</output_instructions>`.trim();

  const res = await callAI(prompt, config);
  const formatted = formatStructuredPrompt(res);
  return formatted.replace(/—/g, ', ');
}

export function formatExternalBeatPrompt(
  beatNumber: ScriptBeatNumber,
  title: string,
  approvedOutline: string,
  researchOutput: string,
  identityText: string,
  totalTargetWords?: number | null,
  angleNotes?: string | null,
  revisionNotes?: string | null
): string {
  const beatInfo = getScriptBeatInfo(beatNumber);
  const totalWords = totalTargetWords || 1200;
  const beatWords = calculateBeatTargetWords(beatNumber, totalWords);

  const revisionBlock = revisionNotes && revisionNotes.trim()
    ? `### CATATAN REVISI KHUSUS UNTUK BABAK INI:\n${revisionNotes.trim()}\n\n`
    : '';

  const angleBlock = angleNotes && angleNotes.trim()
    ? `### FOKUS / ANGLE TAMBAHAN:\n${angleNotes.trim()}\n\n`
    : '';

  return `Anda adalah Senior YouTube Scriptwriter & Spoken-First Voice Narrator untuk channel Zeinity.
Tugas Anda: Tulis KHUSUS ${beatInfo.name.toUpperCase()} (${beatInfo.stageName}) untuk naskah video analitis berikut.
Target Panjang Khusus Babak Ini: Sekitar ${beatWords} Kata (dari estimasi total naskah ~${totalWords} kata).

### INFORMASI PROJEK
- **Topik / Judul**: ${title}
- **Babak yang Ditulis**: ${beatInfo.name} (${beatInfo.stageName})
- **Misi Psikologis Babak**: ${beatInfo.description}
${angleBlock}${revisionBlock}### KERANGKA LENGKAP YANG TELAH DISETUJUI
${approvedOutline && approvedOutline.trim() ? approvedOutline.trim() : '(Kerangka 5 Babak Zeinity)'}

### DATA RISET EMPIRIS
${researchOutput && researchOutput.trim() ? researchOutput.trim() : '(Data riset topik)'}

### IDENTITAS & SUARA CHANNEL ZEINITY
${identityText || 'Analitis, lugas, santai elegan. Penonton diajak berpikir bersama menemukan mekanisme.'}

### ATURAN SPOKEN-FIRST & TTS
1. Naskah langsung dibacakan dengan vokal alami (spoken-first).
2. DILARANG KERAS menggunakan em dash (—) dalam teks narasi. Ganti koma atau titik.
3. DILARANG menggunakan tanda titik dua (:) dalam kalimat narasi voice-over.
4. DILARANG pola klise AI: "Bukan X, melainkan Y", "Di era digital yang serba cepat ini...", "dan BOOM".
5. Semua data angka dan fakta wajib bersumber dari data riset.

### FORMAT OUTPUT:
Tulis HANYA naskah narasi untuk babak ini dengan diawali:
### BABAK ${beatInfo.beatNumber}: ${beatInfo.stageName}
(Lanjutkan langsung naskah narasi tanpa pengantar basa-basi)`.trim();
}


export function formatExternalOutlinePrompt(
  title: string,
  researchOutput: string,
  category?: string | null,
  initialNotes?: string | null,
  angleNotes?: string | null,
  targetWords?: number | null,
  targetDuration?: string | null
): string {
  const durationStr = targetDuration?.trim() || '5-8m';
  const wordsTarget = targetWords || 1200;

  return `Anda adalah Senior Executive Content Strategist & Story Architect (Zeinity).
Tugas Anda: susun KERANGKA NASKAH NARRATIVE ENGINE 5 TAHAP ZEINITY untuk video analitis (Target Durasi: ${durationStr} | Estimasi: ~${wordsTarget} Kata).

### INFORMASI PROJEK
- **Topik / Judul**: ${title}
- **Pilar Kategori**: ${category || 'Umum'}
${initialNotes && initialNotes.trim() ? `- **Catatan Ide Awal**: ${initialNotes.trim()}\n` : ''}${angleNotes && angleNotes.trim() ? `- **Fokus / Angle Khusus**: ${angleNotes.trim()}\n` : ''}
### DATA RISET
${researchOutput && researchOutput.trim() ? researchOutput.trim() : '(Gunakan data riset pendukung)'}

### NARRATIVE ENGINE ZEINITY (Logika Narasi Dinamis - 5 Tahap Zeinity):
I. HOOK & CLICK VALIDATION (0–30s): Provocative Evidence Hook membuktikan janji judul dengan fakta/angka/kontradiksi empiris riset (Strongest Opening Evidence).
II. OBVIOUS ANSWER VS REALITY: Uji jawaban awam (Obvious Answer) vs realita paradoksal dan anomali (Central Contradiction) berdasarkan bukti.
III. THE HIDDEN MECHANISM & INCENTIVES: Bedah mekanisme sistemik dan hidden incentives/costs di balik layar. Jelaskan mekanisme sebelum memberi judgement.
IV. COMPLICATION & HUMAN IMPACT: Eskalasi dampak nyata bagi manusia/kreator/industri (Escalation Evidence) & argumen tandingan terkuat (Best Counterargument).
V. SYNTHESIS & BIGGER PICTURE: Delayed judgment, benang merah analitis yang proporsional dengan bukti, dan pertanyaan reflektif penutup.

### ATURAN EVIDENCE SAFETY & 10 NARRATIVE ASSETS:
- Wajib konsumsi 10 Narrative Assets dari riset jika tersedia.
- Klaim bertanda [PERLU VERIFIKASI] DILARANG KERAS disajikan sebagai fakta mutlak (hanya boleh sebagai pertanyaan terbuka atau dugaan spekulatif).

### ELEMEN SETIAP TAHAP:
- **Fungsi bagian**: misi psikologis segmen bagi penonton
- **Isi utama**: poin pembahasan spesifik
- **Argumen**: posisi analitis yang disampaikan
- **Bukti/contoh**: kutipan fakta atau data aktual dari riset
- **Arah transisi**: jembatan alami ke segmen berikutnya

### FORMAT OUTPUT:
Kembalikan HANYA teks kerangka terstruktur rapi dalam format Markdown tanpa kalimat basa-basi pengantar.`.trim();
}

export function formatExternalScriptingPrompt(
  title: string,
  approvedOutline: string,
  researchOutput: string,
  identityText: string,
  targetWords?: number | null,
  angleNotes?: string | null
): string;
export function formatExternalScriptingPrompt(
  title: string,
  approvedOutline: string,
  identityText: string,
  targetWords?: number | null,
  angleNotes?: string | null
): string;
export function formatExternalScriptingPrompt(
  title: string,
  approvedOutline: string,
  researchOutputOrIdentity: string,
  identityOrTargetWords?: string | number | null,
  targetWordsOrAngleNotes?: number | string | null,
  angleNotesParam?: string | null
): string {
  // Support both 5-param legacy call (title, outline, identityText, targetWords, angleNotes)
  // and 6-param call (title, outline, researchOutput, identityText, targetWords, angleNotes)
  let researchText = '';
  let identityText = '';
  let wordsTarget = 1200;
  let angleNotes = '';

  if (angleNotesParam !== undefined) {
    // Explicit 6-argument call
    researchText = researchOutputOrIdentity || '';
    identityText = typeof identityOrTargetWords === 'string' ? identityOrTargetWords : '';
    wordsTarget =
      (typeof targetWordsOrAngleNotes === 'number'
        ? targetWordsOrAngleNotes
        : Number(targetWordsOrAngleNotes)) || 1200;
    angleNotes = angleNotesParam || '';
  } else if (
    typeof targetWordsOrAngleNotes === 'number' ||
    (typeof targetWordsOrAngleNotes === 'string' && /^\d+$/.test(targetWordsOrAngleNotes.trim()))
  ) {
    // 5 arguments passed for 6-arg signature: (title, outline, research, identity, targetWords)
    researchText = researchOutputOrIdentity || '';
    identityText = typeof identityOrTargetWords === 'string' ? identityOrTargetWords : '';
    wordsTarget = Number(targetWordsOrAngleNotes) || 1200;
    angleNotes = '';
  } else if (
    typeof identityOrTargetWords === 'number' ||
    (typeof identityOrTargetWords === 'string' && /^\d+$/.test(identityOrTargetWords.trim()))
  ) {
    // 5-arg legacy signature with numeric words: (title, outline, identity, targetWords, angleNotes)
    researchText = '';
    identityText = researchOutputOrIdentity || '';
    wordsTarget = Number(identityOrTargetWords) || 1200;
    angleNotes = typeof targetWordsOrAngleNotes === 'string' ? targetWordsOrAngleNotes : '';
  } else if (
    (identityOrTargetWords === null || identityOrTargetWords === undefined) &&
    typeof targetWordsOrAngleNotes === 'string'
  ) {
    // 5-arg legacy signature with null targetWords: (title, outline, identity, null, angleNotes)
    researchText = '';
    identityText = researchOutputOrIdentity || '';
    wordsTarget = 1200;
    angleNotes = targetWordsOrAngleNotes;
  } else if (
    typeof identityOrTargetWords === 'string' &&
    !/^\d+$/.test(identityOrTargetWords.trim())
  ) {
    // 6-arg signature without angleNotes: (title, outline, research, identity)
    researchText = researchOutputOrIdentity || '';
    identityText = identityOrTargetWords;
    wordsTarget = 1200;
    angleNotes = '';
  } else {
    // Default fallback
    researchText = researchOutputOrIdentity || '';
    identityText = typeof identityOrTargetWords === 'string' ? identityOrTargetWords : '';
    wordsTarget = 1200;
    angleNotes = '';
  }

  const researchSection = researchText.trim()
    ? `### DATA RISET EMPIRIS LENGKAP (SUMBER KEBENARAN FAKTA & 10 NARRATIVE ASSETS)
<data_riset_empiris_lengkap>
${researchText.trim()}
</data_riset_empiris_lengkap>\n\n`
    : '';

  return `Anda adalah Lead Spoken-First Scriptwriter & Executive Narrator (Zeinity).
Tugas Anda: Tulis NASKAH VIDEO LENGKAP UTUH yang siap dibacakan langsung oleh voice-over talent / AI TTS berdasarkan kerangka yang telah disetujui dan data riset empiris di bawah.
Target Panjang Naskah: Sekitar ${wordsTarget} Kata.

### INFORMASI PROJEK
- **Topik / Judul**: ${title}
- **Target Panjang**: ~${wordsTarget} Kata
${angleNotes && angleNotes.trim() ? `- **Fokus / Angle Khusus**: ${angleNotes.trim()}\n` : ''}
### IDENTITAS & PRINSIP CHANNEL (ZEINITY)
${identityText || '(Identitas Zeinity: Analitis, lugas, santai elegan)'}

### KERANGKA NASKAH YANG TELAH DISETUJUI
${approvedOutline}

${researchSection}### ATURAN SPOKEN-FIRST & TTS (KETAT):
1. Gaya tutur lisan: diskusikan topik seperti teman sebaya yang cerdas dan sudah riset duluan. Bukan artikel formal, bukan pembacaan koran/ensiklopedia. Tulis apa yang ingin diucapkan, bukan apa yang ingin dibaca.
2. Panjang kalimat dinamis: variasikan panjang kalimat secara organik (pendek, sedang, panjang) mengikuti unit pemikiran. Jangan seragamkan semua kalimat menjadi pendek seperti trailer. Kalimat pendek hanya untuk punchline atau penekanan.
3. Prosodi TTS: Koma (,) untuk jeda napas saat ide berlanjut, titik (.) untuk gagasan tuntas. Hindari titik beruntun (...). JANGAN gunakan line break/enter tunggal sebagai pengganti koma.
4. Integritas Data & Evidence Safety:
   - Semua fakta, angka, dan bukti WAJIB bersumber dari data riset. DILARANG mengarang data fiktif.
   - Klaim bertanda [PERLU VERIFIKASI] DILARANG disajikan sebagai fakta terbukti (hanya boleh sebagai pertanyaan terbuka atau spekulasi belum terverifikasi).
5. PANTANGAN KERAS (NEGATIVE CONSTRAINTS LENGKAP):
   - DILARANG KERAS menggunakan em dash (—) dalam teks narasi voice-over (ganti koma atau titik).
   - DILARANG tanda titik dua (:) dalam narasi VO.
   - DILARANG ragam tulis ensiklopedia/artikel kaku: "Hal tersebut menunjukkan bahwa...", "Dapat disimpulkan bahwa...", "Dalam konteks ini...", "Lebih lanjut...", "Pada akhirnya, dapat dikatakan...".
   - DILARANG transisi formal kaku: "Selanjutnya, mari kita membahas...", "Di sisi lain, terdapat aspek lain...", "Selain itu...".
   - DILARANG spam filler kata tutur: kata "nah", "tapi", "masalahnya", "jadi", "cuma" berulang di awal kalimat/paragraf.
   - DILARANG rentetan pertanyaan retoris (rhetorical question) bertubi-tubi.
   - DILARANG frasa klise AI: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "Tidak cuma X, tetapi juga Y", "dan BOOM", "eh bentar deh".
   - DILARANG kalimat pembuka klise ("Di era digital yang serba cepat ini...").
6. Sisipkan tag visual fungsional [BUKTI ...], [JELASKAN ...], [KONTEKS ...], [TEKANKAN ...], [RITME ...] pada baris terpisah tanpa titik dua setelah nama tag.

### FORMAT OUTPUT:
Tulis langsung naskah narasi lengkap dari awal hingga akhir, siap dibacakan, tanpa pengantar basa-basi.`.trim();
}

export function formatExternalAuditPrompt(scriptText: string): string {
  return `Anda adalah Lead Voice-Over Director & AI TTS Audio Prosody Auditor untuk Zeinity.
TUGAS Anda: Lakukan audit evaluasi naskah berikut khusus pada kelayakan tutur lisan (spoken-first) dan pembacaan AI TTS.
Jangan mengubah substansi pokok, tesis, atau fakta.

<naskah_untuk_diaudit>
${scriptText}
</naskah_untuk_diaudit>

### ASPEK YANG WAJIB DIPERIKSA:
A. Struktur Kalimat: kalimat terpecah-pecah tanpa alasan kuat, kalimat terlalu panjang hingga kehabisan napas, panjang kalimat seragam/monoton. Satukan klausa yang merupakan satu pemikiran utuh.
B. Punctuation & Prosodi TTS:
   - Penempatan koma (jeda napas ringan saat ide berlanjut) vs titik (pemikiran tuntas).
   - Hindari deretan titik beruntun (...) yang memicu penurunan intonasi berulang.
   - Jangan gunakan line break / enter tunggal sebagai pengganti koma.
C. Naturalitas Lisan & Pantangan AI:
   - Frasa ensiklopedia/artikel kaku ("Hal tersebut menunjukkan bahwa...", "Dapat disimpulkan bahwa...", "Dalam konteks ini...", "Lebih lanjut...", "Pada akhirnya, dapat dikatakan...").
   - Transisi formal kaku ("Selanjutnya, mari kita membahas...", "Di sisi lain...", "Selain itu...").
   - Spam filler kata tutur ("nah", "tapi", "masalahnya", "jadi", "cuma" repetitif di awal setiap paragraf).
   - Rentetan pertanyaan retoris berturut-turut.
   - Pola frasa klise AI ("Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "Tidak cuma X, tetapi juga Y", "dan BOOM", "eh bentar deh", "Di era digital yang serba cepat ini...").
D. Larangan Voice-Over:
   - 100% DILARANG menggunakan em dash (—) dan tanda titik dua (:) dalam narasi VO.

### FORMAT OUTPUT:
Jangan langsung mengedit keseluruhan naskah. Cantumkan temuan dalam format persis:

**BAGIAN ASLI:**
[Kutipan kalimat asal]

**MASALAH:**
[Paparkan kendala lisan / TTS]

**REVISI:**
[Bentuk tuturan yang luwes]

**ALASAN:**
[Uraikan ringkas kenapa revisi ini lebih pas untuk bahasa tutur]

Jika tidak ditemukan kendala berarti, sampaikan persis:
**Tidak ditemukan kendala spoken/TTS yang berarti.**`.trim();
}

export function formatExternalFinalRevisionPrompt(
  originalScript: string,
  auditFindings: string,
  revisionNotes?: string | null
): string {
  const notesBlock = revisionNotes && revisionNotes.trim()
    ? `### PETUNJUK REVISI TAMBAHAN DARI KREATOR:\n${revisionNotes.trim()}\n\n`
    : '';

  return `Anda adalah Senior YouTube Scriptwriter & Voice-Over Polisher untuk Zeinity.
Tugas Anda: Perbaiki naskah video berikut berdasarkan catatan hasil evaluasi audit spoken & TTS serta petunjuk tambahan kreator.

### NASKAH ASLI:
<naskah_asli>
${originalScript}
</naskah_asli>

### HASIL EVALUASI AUDIT SPOKEN & TTS:
<hasil_audit>
${auditFindings}
</hasil_audit>

${notesBlock}### ATURAN REVISI:
- Pertahankan: tesis utama, alur argumentasi, fakta riset yang ada, kerangka utama, tone pembawaan, dan persona teman diskusi Zeinity.
- Sempurnakan: keluwesan bahasa tutur, variasi panjang kalimat, tanda baca koma dan titik untuk prosodi TTS, serta hilangkan seluruh em dash (—), titik dua (:), frasa artikel kaku, dan klise AI.
- Jangan berasumsi setiap kalimat harus dirombak. Jika suatu seksi sudah terasa luwes, pertahankan bentuk aslinya. Tujuan revisi adalah meningkatkan mutu.

### FORMAT OUTPUT:
Serahkan script final lengkap yang telah direvisi secara utuh, siap dibacakan, tanpa menyertakan analisis tambahan kecuali diminta.`.trim();
}

export function formatExternalTitlePrompt(
  title: string,
  category: string,
  researchOrScriptSnippet?: string | null
): string {
  const contextSnippet = researchOrScriptSnippet && researchOrScriptSnippet.trim()
    ? `### KONTEKS / RINGKASAN MATERI:\n${researchOrScriptSnippet.trim().slice(0, 4000)}\n\n`
    : '';

  return `Anda adalah YouTube Title Packaging Specialist & CTR Strategist untuk Zeinity.
Tugas Anda: Buat tepat 5 rekomendasi judul video alternatif berdasarkan 5 Formula Hook Resmi Zeinity (Dokumen Strategi Channel):

### TOPIK / JUDUL SEMENTARA:
${title}

### PILAR KATEGORI:
${category || 'Umum'}

${contextSnippet}### 5 PANDUAN FORMULA HOOK ZEINITY:
1. **Formula 1 — Curiosity Gap (Pertanyaan Universal)**: Memancing rasa ingin tahu alami penonton dengan pertanyaan universal ("Kenapa [X]?", "Kenapa Kita [X]?").
2. **Formula 2 — Paradoks & Kontradiksi (Membongkar Ilusi)**: Membuka ketegangan antara asumsi penonton vs kenyataan ("[X] Tidak Seperti yang Kamu Kira", "Ada Sesuatu yang Aneh dengan [X]").
3. **Formula 3 — Mekanisme Tersembunyi (Invisible Mechanism)**: Menjelaskan apa yang terjadi di balik layar sistemik ("Alasan Sebenarnya Kenapa [X]", "Di Balik Layar [X]").
4. **Formula 4 — SEO Keyword & Otoritas (High-Intent Search)**: Lugas, jelas, kaya kata kunci pencarian YouTube ("Bagaimana [X] Bekerja: Penjelasan Analitis").
5. **Formula 5 — Dampak Manusia & Perilaku Digital**: Menyoroti dampak langsung ke kehidupan dan psikologi penonton ("Kita Semua Mulai Melakukan [X]").

### ATURAN KETAT JUDUL:
- Panjang judul WAJIB persis 5 sampai 8 kata (agar aman dan tidak terpotong di aplikasi mobile YouTube).
- Tone: Kritis analitis, berwibawa, tanpa basa-basi, dan DILARANG clickbait murahan ("Wajib Nonton", "Bikin Syok", tanda seru berlebih).

### FORMAT OUTPUT:
Sajikan tepat 5 rekomendasi judul dengan format Markdown:
### 1. Curiosity Gap: [Judul 5-8 kata]
*Penjelasan alasan singkat*

### 2. Paradoks & Kontradiksi: [Judul 5-8 kata]
*Penjelasan alasan singkat*

### 3. Mekanisme Tersembunyi: [Judul 5-8 kata]
*Penjelasan alasan singkat*

### 4. SEO Keyword & Otoritas: [Judul 5-8 kata]
*Penjelasan alasan singkat*

### 5. Dampak Manusia: [Judul 5-8 kata]
*Penjelasan alasan singkat*`.trim();
}

export async function runSpokenAudit(
  config: ProviderConfig,
  title: string,
  scriptText: string
): Promise<{ findings: string; revisedDraft: string; summary: string }> {
  const auditContext = extractSmartScriptContext(scriptText, config.provider === 'ollama'
    ? { maxTotal: 12000, headChars: 6000, tailChars: 6000 }
    : { maxTotal: 60000, headChars: 30000, tailChars: 30000 }
  );

  const prompt = `Anda adalah Lead Voice-Over Director & AI TTS Audio Prosody Auditor untuk channel YouTube Zeinity.
TUGAS Anda: LANGSUNG AUDIT naskah berikut. JANGAN buat instruksi audit — LAKUKAN auditnya sekarang.

<naskah_untuk_diaudit>
${auditContext}
</naskah_untuk_diaudit>

<dimensi_audit>
A. Struktur Kalimat: kalimat terlalu terpecah/pendek (trailer-style), terlalu panjang (kehabisan napas), pola ritme monoton. Satukan atau pecah menjadi unit pemikiran yang wajar diucapkan manusia.
B. Punctuation & Prosodi TTS: evaluasi penempatan koma vs titik, titik berlebihan (...) yang merusak intonasi AI TTS, hilangkan baris tunggal yang menggantikan koma, hindari penurunan intonasi berulang.
C. Naturalitas Lisan & AI Tropes:
   - Deteksi bahasa kaku artikel/ensiklopedia ("Hal tersebut menunjukkan bahwa", "Dapat disimpulkan bahwa", "Dalam konteks ini", "Lebih lanjut", "Pada akhirnya, dapat dikatakan").
   - Deteksi transisi kaku ("Selanjutnya, mari kita membahas", "Di sisi lain", "Selain itu").
   - Deteksi spam filler ("nah", "tapi", "masalahnya" repetitif di awal setiap paragraf).
   - Deteksi rentetan pertanyaan retoris bertubi-tubi.
   - Deteksi pola frasa klise AI ("Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "Tidak cuma X, tetapi juga Y", "dan BOOM", "eh bentar deh", "Di era digital yang serba cepat ini").
D. Larangan Voice-Over: hilangkan 100% em dash (—) dan tanda titik dua (:) dalam narasi VO.
</dimensi_audit>

<boundary>
TIDAK BOLEH mengubah substansi cerita, pokok gagasan, tesis, atau data fakta yang ada. Fokus 100% pada bahasa tutur lisan dan prosodi TTS.
</boundary>

<output_format>
Kembalikan HANYA JSON valid (tanpa markdown wrapper):
{
  "findings": "Laporan temuan dengan format persis:\\n\\n**BAGIAN ASLI:**\\n[kutipan asli]\\n\\n**MASALAH:**\\n[deskripsi masalah lisan/TTS]\\n\\n**REVISI:**\\n[bentuk tuturan yang luwes]\\n\\n**ALASAN:**\\n[alasan revisi]\\n\\n(Ulangi untuk setiap temuan. Jika naskah sudah sangat luwes dan tidak ada kendala, tulis: 'Tidak ditemukan kendala spoken/TTS yang berarti.')",
  "revisedDraft": "Naskah narasi lengkap yang sudah direvisi secara menyeluruh sesuai semua temuan audit di atas",
  "summary": "Ringkasan temuan singkat 1 kalimat, contoh: 'Ditemukan 4 temuan: 2 em dash, 1 frasa ensiklopedia, 1 AI trope.'"
}
</output_format>`.trim();

  const raw = await callAI(prompt, config);
  const parsed = parseJsonResponse<{ findings: string; revisedDraft: string; summary: string }>(raw);
  return {
    findings: formatStructuredPrompt(parsed.findings || ''),
    revisedDraft: (parsed.revisedDraft || scriptText).replace(/—/g, ', '),
    summary: parsed.summary || 'Audit selesai.',
  };
}

export async function generateThumbnailPrompt(
  config: ProviderConfig,
  title: string,
  scriptOutput: string
): Promise<string> {

  const prompt = `Anda adalah **YouTube CTR Specialist & Thumbnail Packaging Strategist (Zeinity)**.
Tugas Anda adalah merumuskan instruksi prompt (*Thumbnail Copy Prompt*) tingkat lanjut yang siap disalin oleh kreator ke LLM eksternal (ChatGPT/Claude/Gemini) untuk menghasilkan konsep teks thumbnail dan arahan visual berkonversi tinggi (CTR tinggi).

<context>
<topic>${title}</topic>
<script_snippet>
${extractSmartScriptContext(scriptOutput, config.provider === 'ollama' ? { maxTotal: 10000, headChars: 5000, tailChars: 5000 } : { maxTotal: 20000, headChars: 5000, tailChars: 5000 })}
</script_snippet>
</context>

<instructions>
Rancang prompt Thumbnail Copy mandiri yang mengadopsi standar **Thumbnail Packaging Strategy** Zeinity:

1. **Peran & Filosofi CTR Zeinity**:
   - AI eksternal bertindak sebagai YouTube CTR Specialist untuk Zeinity.
   - Prinsip Utama: Judul membawa pertanyaan atau misteri; Thumbnail membawa stakes, emosi, konsekuensi, atau konflik visual (bukan sekadar mengulang judul).

2. **Batasan Keras (Strict Constraints)**:
   - Teks thumbnail maksimal 2 sampai 4 kata saja (huruf kapital / UPPERCASE).
   - DILARANG mengulang kata-kata yang sudah ada di judul.
   - Teks harus mudah dibaca sekilas di layar mobile/HP tanpa tanda titik di akhir kata.

3. **Format Output yang Diminta**:
   Instruksikan AI eksternal menyajikan 3 opsi konsep teks kontras tinggi beserta alasan emosional singkat dan konsep visual pendukung:
   - OPSI 1 / 2 / 3:
     * TEKS: [2-4 Kata Huruf Kapital]
     * ALASAN EMOSIONAL: [Mengapa penonton terdorong untuk klik / stakes yang diangkat]
     * KONSEP VISUAL: [1 Subjek Utama + 1 Konflik/Stakes Visual + 1 Focal Cue]
</instructions>

<negative_constraints>
- JANGAN sertakan kalimat basa-basi seperti "Berikut adalah promptnya:".
- Kembalikan HANYA teks prompt siap salin dalam format Markdown yang rapi dengan heading ### dan bullet points.
</negative_constraints>`.trim();

  const res = await callAI(prompt, config);
  return formatStructuredPrompt(res);
}

export interface TitleRecommendationsResult {
  titles: TitleRecommendationItem[];
  titleA: string;
  titleB: string;
  explanation?: string;
}

export type AlternativeTitlesResult = TitleRecommendationsResult;

export async function generateAlternativeTitles(
  config: ProviderConfig,
  currentTitle: string,
  category: string,
  contentSnippet?: string | null
): Promise<TitleRecommendationsResult> {
  const isOllama = config.provider === 'ollama';
  const contextOpts = isOllama
    ? { maxTotal: 6000, headChars: 3000, tailChars: 3000 }
    : { maxTotal: 15000, headChars: 7500, tailChars: 7500 };

  const snippetSection = contentSnippet && contentSnippet.trim()
    ? `\n<content_context>\n${extractSmartScriptContext(contentSnippet, contextOpts)}\n</content_context>`
    : '';

  const prompt = `Anda adalah **YouTube Title Packaging Specialist & CTR Strategist** untuk Zeinity.
Tugas Anda: buat tepat 5 rekomendasi judul video alternatif berdasarkan 5 Formula Hook Resmi Zeinity (Bab 12 & Bab 32 Dokumen Strategi Channel):

<topic>${currentTitle}</topic>
<category>${category}</category>${snippetSection}

<panduan_5_formula_zeinity>
1. **Formula 1 — Curiosity Gap (Pertanyaan Universal) [Mode A (Curiosity & Mobile Optimized)]**:
   - Menggunakan pintu masuk rasa ingin tahu dan masalah universal (contoh: "Kenapa [X]?", "Kenapa Kita [X]?").
2. **Formula 2 — Paradoks & Kontradiksi (Membongkar Ilusi)**:
   - Membuka ketegangan antara asumsi penonton vs kenyataan (contoh: "[X] Tidak Seperti yang Kamu Kira", "Ada Sesuatu yang Aneh dengan [X]").
3. **Formula 3 — Mekanisme Tersembunyi (Invisible Mechanism)**:
   - Menjelaskan apa yang terjadi di balik layar sistemik (contoh: "Alasan Sebenarnya Kenapa [X]", "Di Balik Layar [X]").
4. **Formula 4 — SEO Keyword & Otoritas (High-Intent Search) [Mode B (Keyword & Authority Focused)]**:
   - Lugas, jelas, kaya kata kunci pencarian YouTube (contoh: "Bagaimana [X] Bekerja: Penjelasan Analitis").
5. **Formula 5 — Dampak Manusia & Perilaku Digital**:
   - Menyoroti dampak langsung ke kehidupan dan psikologi penonton biasa (contoh: "Kita Semua Mulai Melakukan [X]").
</panduan_5_formula_zeinity>

<aturan_ketat_judul>
- Panjang judul WAJIB persis 5 sampai 8 kata (agar aman dan tidak terpotong di aplikasi mobile YouTube).
- Tone: Kritis analitis, berwibawa, tanpa basa-basi, dan DILARANG clickbait murahan ("Wajib Nonton", "Bikin Syok", tanda seru berlebih).
- Pastikan relevan 100% dengan topik dan konteks naskah di atas.
</aturan_ketat_judul>

<output_format>
Kembalikan HANYA format JSON valid tanpa pembungkus markdown:
{
  "titles": [
    {
      "id": "formula_1",
      "formulaName": "Curiosity Gap (Pertanyaan Universal)",
      "title": "Judul 5-8 kata formula 1",
      "explanation": "Alasan singkat pemilihan formula ini"
    },
    {
      "id": "formula_2",
      "formulaName": "Paradoks & Kontradiksi (Membongkar Ilusi)",
      "title": "Judul 5-8 kata formula 2",
      "explanation": "Alasan singkat pemilihan formula ini"
    },
    {
      "id": "formula_3",
      "formulaName": "Mekanisme Tersembunyi (Invisible Mechanism)",
      "title": "Judul 5-8 kata formula 3",
      "explanation": "Alasan singkat pemilihan formula ini"
    },
    {
      "id": "formula_4",
      "formulaName": "SEO Keyword & Otoritas (High-Intent Search)",
      "title": "Judul 5-8 kata formula 4",
      "explanation": "Alasan singkat pemilihan formula ini"
    },
    {
      "id": "formula_5",
      "formulaName": "Dampak Manusia & Perilaku Digital",
      "title": "Judul 5-8 kata formula 5",
      "explanation": "Alasan singkat pemilihan formula ini"
    }
  ],
  "titleA": "Salinan judul formula 1",
  "titleB": "Salinan judul formula 4",
  "explanation": "Ringkasan strategi 5 formula hook"
}
</output_format>`.trim();

  const raw = await callAI(prompt, config);
  const parsed = parseJsonResponse<{
    titles?: Array<{ id?: string; formulaName?: string; title?: string; explanation?: string }>;
    titleA?: string;
    titleB?: string;
    explanation?: string;
  }>(raw);

  const FORMULAS_DEF = [
    {
      id: 'formula_1',
      name: 'Formula 1 — Curiosity Gap (Pertanyaan Universal)',
      getFallback: (topic: string) => `Kenapa ${topic}?`,
      desc: 'Formula Curiosity Gap untuk memicu klik alami penonton dengan pertanyaan universal.',
    },
    {
      id: 'formula_2',
      name: 'Formula 2 — Paradoks & Kontradiksi (Membongkar Ilusi)',
      getFallback: (topic: string) => `${topic} Tidak Seperti yang Kamu Kira`,
      desc: 'Formula Paradoks & Intrigue untuk membongkar ilusi asumsi penonton.',
    },
    {
      id: 'formula_3',
      name: 'Formula 3 — Mekanisme Tersembunyi (Invisible Mechanism)',
      getFallback: (topic: string) => `Alasan Sebenarnya Kenapa ${topic}`,
      desc: 'Formula Mekanisme Tersembunyi untuk mengungkap sistem di balik layar.',
    },
    {
      id: 'formula_4',
      name: 'Formula 4 — SEO Keyword & Otoritas (High-Intent Search)',
      getFallback: (topic: string) => `Bagaimana ${topic} Bekerja: Penjelasan Lengkap`,
      desc: 'Formula SEO Keyword & Otoritas untuk visibilitas penelusuran YouTube.',
    },
    {
      id: 'formula_5',
      name: 'Formula 5 — Dampak Manusia & Perilaku Digital',
      getFallback: (topic: string) => `Kita Semua Mulai Mengalami ${topic}`,
      desc: 'Formula Dampak Manusia & Perilaku untuk menyentuh psikologi penonton.',
    },
  ];

  const normalizedTitles: TitleRecommendationItem[] = [];

  if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
    parsed.titles.forEach((item, idx) => {
      if (idx >= 5) return;
      const def = FORMULAS_DEF[idx] || { id: `formula_${idx + 1}`, name: item.formulaName || `Formula ${idx + 1}` };
      const titleStr = (item.title || '').trim();
      if (!titleStr) return;
      const words = titleStr.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      normalizedTitles.push({
        id: item.id || def.id,
        formulaName: item.formulaName || def.name,
        title: titleStr,
        wordCount,
        isMobileSafe: wordCount >= 5 && wordCount <= 8,
        explanation: (item.explanation || '').trim() || (FORMULAS_DEF[idx]?.desc || ''),
      });
    });
  }

  // Lengkapi jika jumlah rekomendasi kurang dari 5 (misal model hanya mengembalikan 2 atau 3 judul, atau parse parsial)
  if (normalizedTitles.length < 5) {
    const cleanTopic = currentTitle
      .replace(/^(kenapa|bagaimana|alasan|apa yang terjadi dengan|cara)\s+/i, '')
      .replace(/\?+$/, '')
      .trim() || currentTitle;

    for (let idx = normalizedTitles.length; idx < 5; idx++) {
      const def = FORMULAS_DEF[idx];
      let fallbackTitle = def.getFallback(cleanTopic);
      if (idx === 0 && parsed.titleA?.trim()) fallbackTitle = parsed.titleA.trim();
      if (idx === 3 && parsed.titleB?.trim()) fallbackTitle = parsed.titleB.trim();

      const words = fallbackTitle.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      normalizedTitles.push({
        id: def.id,
        formulaName: def.name,
        title: fallbackTitle,
        wordCount,
        isMobileSafe: wordCount >= 5 && wordCount <= 8,
        explanation: def.desc,
      });
    }
  }

  const titleA = normalizedTitles[0]?.title || parsed.titleA?.trim() || currentTitle;
  const titleB = normalizedTitles[3]?.title || normalizedTitles[1]?.title || parsed.titleB?.trim() || currentTitle;

  return {
    titles: normalizedTitles,
    titleA,
    titleB,
    explanation: parsed.explanation?.trim() || '5 Formula Hook Zeinity siap digunakan.',
  };
}


export interface UpstreamErrorInfo {
  upstreamModel?: string;
  statusCode?: number | string;
  upstreamMessage?: string;
  rawJson?: unknown;
}

/**
 * Membedah struktur error dari 9Router Gateway atau provider hulu (upstream).
 * Format khas 9Router:
 * "[gemini/gemini-3.8-flash] [401]: {\"error\":{\"code\":401,\"message\":\"...\"}}"
 * atau
 * "[groq/llama-3.3-70b-versatile] [404]: {\"error\":{\"message\":\"...\"}}"
 */

export function extractUpstreamErrorInfo(errStr: string): UpstreamErrorInfo | null {
  if (!errStr || typeof errStr !== 'string') return null;

  // 1. Ekstrak pola bracket [provider/model] [HTTP_STATUS]: payload
  const match = errStr.match(/\[([^\]\s]+(?:\/[^\]\s]+)*)\]\s*\[(\d+)\]:\s*([\s\S]+)/);
  if (match) {
    const upstreamModel = match[1].trim();
    const statusCode = parseInt(match[2], 10);
    let rawRest = match[3].trim();

    // Jika JSON di dalam string mengandung escape quotes \"
    if (rawRest.includes('\\"')) {
      rawRest = rawRest.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    let cleanMessage = rawRest;
    let rawJson: unknown = null;

    const extracted = extractFirstJsonObject(rawRest);
    if (extracted && typeof extracted.parsed === 'object' && extracted.parsed !== null) {
      rawJson = extracted.parsed;
      const casted = rawJson as Record<string, unknown>;
      const errRecord = casted.error as Record<string, unknown> | undefined;
      if (errRecord && typeof casted.error === 'object' && errRecord.message) {
        cleanMessage = String(errRecord.message);
      } else if (casted.error && typeof casted.error === 'string') {
        cleanMessage = casted.error;
      } else if (casted.message) {
        cleanMessage = String(casted.message);
      }
    }

    return {
      upstreamModel,
      statusCode,
      upstreamMessage: cleanMessage.trim(),
      rawJson,
    };
  }

  // 2. Format JSON error standar dari 9Router: {"error":{"message":"..."}}
  const outerExtracted = extractFirstJsonObject(errStr);
  if (outerExtracted && typeof outerExtracted.parsed === 'object' && outerExtracted.parsed !== null) {
    const parsed = outerExtracted.parsed as Record<string, unknown>;
    if (parsed.error) {
      const errRecord = parsed.error as Record<string, unknown> | undefined;
      const msg = typeof parsed.error === 'object' && errRecord !== null ? String(errRecord?.message || JSON.stringify(parsed.error)) : String(parsed.error);
      const nested = extractUpstreamErrorInfo(msg);
      if (nested) return nested;
      return {
        upstreamMessage: msg.trim(),
        rawJson: parsed,
      };
    }
  }

  return null;
}

export function parseAIError(
  rawError: unknown,
  context?: {
    model?: string;
    provider?: string;
    endpoint?: string;
  }
): ParsedAIErrorInfo {
  const errStr = rawError instanceof Error ? rawError.message : String(rawError || 'Terjadi kesalahan sistem.');
  const lower = errStr.toLowerCase();

  const upstream = extractUpstreamErrorInfo(errStr);

  // Deteksi target model
  const modelMatch = errStr.match(/(?:Gateway\s*\[|model\s*"|model\s*')([^\s"'\]]+)/i);
  const detectedModel = context?.model || upstream?.upstreamModel || (modelMatch ? modelMatch[1] : undefined);

  // Deteksi endpoint
  const endpointMatch = errStr.match(/https?:\/\/[^\s"')]+/i);
  const detectedEndpoint = context?.endpoint || (endpointMatch ? endpointMatch[0] : undefined);

  // Deteksi provider / gateway
  const detectedProvider =
    context?.provider ||
    (errStr.includes('9Router') || (detectedEndpoint && detectedEndpoint.includes('20128'))
      ? `9Router Gateway (${detectedEndpoint || 'http://localhost:20128/v1'})`
      : errStr.includes('OpenRouter')
      ? 'OpenRouter API'
      : errStr.includes('Ollama')
      ? 'Ollama Local'
      : errStr.includes('Gemini')
      ? 'Google Gemini API'
      : undefined);

  // 0. Timeout / Aborted
  if (lower.includes('batas waktu') || lower.includes('timeout') || lower.includes('aborted')) {
    const secMatch = errStr.match(/(\d+)\s*detik/i);
    const seconds = secMatch ? secMatch[1] : '120';
    return {
      title: 'Permintaan AI Melebihi Batas Waktu (Timeout)',
      message: errStr,
      technicalDetails: errStr,
      solution:
        `Server AI membutuhkan waktu lebih dari ${seconds} detik untuk merespons. Anda dapat memperpanjang toleransi batas waktu di menu Settings > Batas Waktu Permintaan (tersedia opsi Custom Timeout hingga 3.600 detik), atau periksa koneksi internet dan pilih model alternatif yang lebih cepat.`,
      diagnostics: {
        targetModel: detectedModel || 'Creator-Combo',
        provider: detectedProvider || '9Router Gateway (http://localhost:20128/v1)',
        endpoint: detectedEndpoint || 'http://localhost:20128/v1',
        statusCode: `Timeout (${seconds}s)`,
        rootCause:
          'Daemon 9Router atau provider upstream yang dipanggil mengalami socket hang / antrean tak terhingga. Kemungkinan model cloud upstream (seperti provider gratis atau lokal) tidak mengirimkan respon tepat waktu sebelum batas timeout terlampaui.',
        upstreamError: errStr,
      },
    };
  }

  // 1. Upstream 401: Unauthorized / Invalid API Key
  if (
    upstream?.statusCode === 401 ||
    lower.includes('belum diatur') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('unauthorized')
  ) {
    const providerName = upstream?.upstreamModel ? upstream.upstreamModel.split('/')[0] : 'upstream';
    const upstreamCause = upstream?.upstreamMessage
      ? `Kunci API provider "${providerName}" ditolak oleh server hulu: ${upstream.upstreamMessage}`
      : 'Kunci API provider AI ditolak (401 Unauthorized) atau belum valid.';
    return {
      title: 'Kunci API Belum Dikonfigurasi / Tidak Valid',
      message: 'Sistem tidak dapat terhubung ke AI karena API Key belum dimasukkan atau sudah tidak valid.',
      technicalDetails: errStr,
      solution: 'Buka menu Settings, masukkan API Key yang valid untuk provider yang Anda pilih, lalu klik Simpan.',
      diagnostics: {
        targetModel: upstream?.upstreamModel || detectedModel,
        provider: detectedProvider || (upstream?.upstreamModel?.split('/')[0] ?? 'AI Provider'),
        endpoint: detectedEndpoint,
        statusCode: upstream?.statusCode || 401,
        rootCause: upstreamCause,
        upstreamError: upstream?.upstreamMessage || errStr,
      },
    };
  }

  // 2. Upstream 404: Not Found / Deprecated / Model Tidak Diizinkan
  if (
    upstream?.statusCode === 404 ||
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('model_not_found') ||
    lower.includes('deprecated') ||
    lower.includes('does not exist or you do not have access')
  ) {
    const upstreamCause = upstream?.upstreamMessage
      ? `Model tidak ditemukan atau tidak diizinkan pada akun upstream: "${upstream.upstreamMessage}"`
      : 'Versi model yang digunakan saat ini sudah tidak tersedia atau dinonaktifkan oleh provider penyedia AI.';
    return {
      title: 'Model AI Tidak Ditemukan / Deprecated (Error 404)',
      message: 'Versi model yang digunakan saat ini sudah tidak tersedia atau dinonaktifkan oleh provider penyedia AI.',
      technicalDetails: errStr,
      solution: 'Buka menu Settings lalu klik tombol "Auto Import Models" untuk memperbarui daftar model yang aktif, atau pilih dari daftar Rekomendasi Model Gratis.',
      diagnostics: {
        targetModel: upstream?.upstreamModel || detectedModel,
        provider: detectedProvider || (upstream?.upstreamModel?.split('/')[0] ?? 'AI Provider'),
        endpoint: detectedEndpoint,
        statusCode: upstream?.statusCode || 404,
        rootCause: upstreamCause,
        upstreamError: upstream?.upstreamMessage || errStr,
      },
    };
  }

  // 3. Upstream 402: Payment Required (OpenRouter)
  if (
    upstream?.statusCode === 402 ||
    lower.includes('402') ||
    lower.includes('requires more credits') ||
    lower.includes('insufficient credits') ||
    lower.includes('credit')
  ) {
    return {
      title: 'OpenRouter: Model Berbayar Terdeteksi (Error 402)',
      message: 'Model yang Anda pilih memerlukan saldo akun berbayar pada layanan OpenRouter.',
      technicalDetails: errStr,
      solution: 'Gunakan model berlabel ":free" (seperti "openrouter/free", "google/gemma-4-31b-it:free", atau "qwen/qwen3.8-27b:free") pada opsi Rekomendasi Model Gratis di menu Settings.',
      diagnostics: {
        targetModel: upstream?.upstreamModel || detectedModel,
        provider: detectedProvider || 'OpenRouter',
        endpoint: detectedEndpoint,
        statusCode: 402,
        rootCause: 'Saldo kredit OpenRouter tidak mencukupi untuk model berbayar yang diminta.',
        upstreamError: upstream?.upstreamMessage || errStr,
      },
    };
  }

  // 4. Upstream 429: Rate Limit
  if (
    upstream?.statusCode === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('quota')
  ) {
    const upstreamCause = upstream?.upstreamMessage
      ? `Batas kuota/rate-limit provider upstream tercapai: "${upstream.upstreamMessage}"`
      : 'Permintaan ke AI melebihi kuota per menit atau batas limit harian dari provider.';
    return {
      title: 'Batas Kuota / Rate Limit Terlampaui (Error 429)',
      message: 'Permintaan ke AI melebihi kuota per menit atau batas limit harian dari provider.',
      technicalDetails: errStr,
      solution: 'Tunggu sekitar 30-60 detik lalu coba ulangi, atau beralih ke provider alternatif (OpenRouter / Ollama Lokal) di menu Settings.',
      diagnostics: {
        targetModel: upstream?.upstreamModel || detectedModel,
        provider: detectedProvider || (upstream?.upstreamModel?.split('/')[0] ?? 'AI Provider'),
        endpoint: detectedEndpoint,
        statusCode: upstream?.statusCode || 429,
        rootCause: upstreamCause,
        upstreamError: upstream?.upstreamMessage || errStr,
      },
    };
  }

  // 5. Upstream 500 / 502 / 503 Provider Gateway Failure
  if (
    upstream?.statusCode === 500 ||
    upstream?.statusCode === 502 ||
    upstream?.statusCode === 503 ||
    lower.includes('502') ||
    lower.includes('503')
  ) {
    const status = upstream?.statusCode || 503;
    return {
      title: `Kegagalan Server Upstream AI (Error ${status})`,
      message: `Provider upstream mengembalikan respons kesalahan (${status}).`,
      technicalDetails: errStr,
      solution: 'Provider AI sedang mengalami gangguan sementara. Tunggu sejenak atau ganti model ke provider lain di Settings.',
      diagnostics: {
        targetModel: upstream?.upstreamModel || detectedModel,
        provider: detectedProvider || (upstream?.upstreamModel?.split('/')[0] ?? 'AI Provider'),
        endpoint: detectedEndpoint,
        statusCode: status,
        rootCause: upstream?.upstreamMessage || `Layanan upstream mengembalikan respons error ${status} (Bad Gateway / Service Unavailable).`,
        upstreamError: upstream?.upstreamMessage || errStr,
      },
    };
  }

  // 6. Ollama offline
  if (lower.includes('ollama') && (lower.includes('econnrefused') || lower.includes('failed to fetch'))) {
    return {
      title: 'Server Ollama Lokal Tidak Terhubung',
      message: 'Tidak dapat menjangkau endpoint Ollama di komputer lokal Anda.',
      technicalDetails: errStr,
      solution: 'Pastikan aplikasi Ollama sedang berjalan di komputer Anda (`ollama serve`) dan endpoint di Settings sudah sesuai (default: http://localhost:11434).',
      diagnostics: {
        targetModel: detectedModel,
        provider: 'Ollama Local',
        endpoint: detectedEndpoint || 'http://localhost:11434',
        statusCode: 'ECONNREFUSED',
        rootCause: 'Layanan Ollama lokal tidak aktif atau port 11434 tidak dapat diakses.',
        upstreamError: errStr,
      },
    };
  }

  // 7. General Gateway Offline / Connection Refused
  if (lower.includes('econnrefused') || lower.includes('failed to fetch')) {
    return {
      title: 'Gateway 9Router Tidak Terhubung',
      message: 'Tidak dapat menjangkau gateway 9Router di port lokal komputer Anda.',
      technicalDetails: errStr,
      solution: 'Pastikan daemon 9Router aktif dengan menjalankan perintah "9router start" di terminal.',
      diagnostics: {
        targetModel: detectedModel,
        provider: '9Router Gateway',
        endpoint: detectedEndpoint || 'http://localhost:20128/v1',
        statusCode: 'ECONNREFUSED',
        rootCause: 'Koneksi ke port gateway lokal 20128 gagal. Layanan 9Router kemungkinan belum dinyalakan.',
        upstreamError: errStr,
      },
    };
  }

  // 8. Stream / JSON Parsing Syntax Error
  if (
    lower.includes('unexpected non-whitespace character') ||
    lower.includes('unexpected token') ||
    lower.includes('is not valid json') ||
    lower.includes('format respons tidak valid')
  ) {
    return {
      title: 'Kesalahan Format Aliran Data (Streaming/SSE)',
      message: 'Server AI mengembalikan aliran respons streaming (SSE) atau format data yang tidak sesuai dengan JSON tunggal.',
      technicalDetails: errStr,
      solution: 'Sistem telah memperbarui parser otomatis untuk mendukung perakitan streaming chunks. Silakan ulangi permintaan Anda.',
      diagnostics: {
        targetModel: detectedModel,
        provider: detectedProvider || '9Router Gateway',
        endpoint: detectedEndpoint || 'http://localhost:20128/v1',
        statusCode: 'PARSING_ERROR',
        rootCause: `Format data respons tidak dapat diparsing sebagai JSON tunggal (${errStr}). Server mengembalikan potongan stream (SSE / Newline Delimited JSON).`,
        upstreamError: errStr,
      },
    };
  }

  // General fallback
  const fallbackStatus = upstream?.statusCode || (errStr.match(/\b(4\d\d|5\d\d)\b/) ? errStr.match(/\b(4\d\d|5\d\d)\b/)![0] : 'ERROR');
  return {
    title: 'Terjadi Kegagalan AI',
    message: errStr.length > 250 ? 'AI mengembalikan respons kesalahan saat memproses data.' : errStr,
    technicalDetails: errStr,
    solution: 'Periksa koneksi internet Anda atau periksa pilihan model AI dan API Key di menu Settings.',
    diagnostics: {
      targetModel: detectedModel,
      provider: detectedProvider,
      endpoint: detectedEndpoint,
      statusCode: fallbackStatus,
      rootCause: upstream?.upstreamMessage || errStr,
      upstreamError: upstream?.upstreamMessage || errStr,
    },
  };
}

