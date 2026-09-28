import { GoogleGenerativeAI } from '@google/generative-ai';

export const DEFAULT_GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b',
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
  provider: 'gemini' | 'openrouter' | 'ollama',
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
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        badge: '⚡ Kuota Gratis Stabil',
        isFree: true,
        desc: 'Kecepatan tinggi dan kuota gratis harian besar di AI Studio',
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Exp',
        badge: '⚡ Next-Gen 2.0',
        isFree: true,
        desc: 'Generasi terbaru dengan pemahaman kontekstual lebih dalam',
      },
      {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash 8B',
        badge: '⚡ Ultra Cepat',
        isFree: true,
        desc: 'Model ringan hemat token dengan respon kilat',
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

// ─── Universal AI Router ─────────────────────────────────────────────────────

export interface ProviderConfig {
  provider: 'gemini' | 'openrouter' | 'ollama';
  apiKey?: string;
  modelVersion?: string;
  ollamaEndpoint?: string;
}

/**
 * Memanggil model AI sesuai provider yang dipilih user.
 * Mendukung: Google Gemini, OpenRouter (OpenAI-compat), dan Ollama (lokal).
 * Dilengkapi AbortController & batas waktu timeout (default 60 detik) untuk mencegah UI hang.
 */
export async function callAI(
  prompt: string,
  config: ProviderConfig,
  timeoutMs: number = 60000
): Promise<string> {
  const { provider, apiKey, modelVersion, ollamaEndpoint } = config;
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
        { model: modelVersion?.trim() || 'gemini-1.5-flash' },
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
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter error (${res.status}): ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      return (data.choices?.[0]?.message?.content ?? '').trim();
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

  if (provider === 'ollama') {
    const endpoint = (ollamaEndpoint?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
    const model = modelVersion?.trim() || 'llama3';
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

/**
 * Ekstraksi cerdas konteks naskah/riset untuk AI actions.
 * Menghindari silent truncation sempit (seperti substring(0, 4000)).
 * Jika teks dalam batas maxTotal, seluruh teks dipertahankan secara utuh.
 * Jika teks melampaui maxTotal, bagian awal (Hook/Premis) dan bagian akhir (Resolusi/Stakes)
 * diekstrak secara proporsional.
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
  let headChars = options?.headChars ?? Math.floor(maxTotal * 0.5);
  let tailChars = options?.tailChars ?? Math.floor(maxTotal * 0.5);

  // Jika gabungan head + tail sudah mencakup seluruh teks, kembalikan teks utuh tanpa potongan
  if (headChars + tailChars >= trimmed.length) {
    return trimmed;
  }

  // Jika gabungan head + tail melebihi maxTotal, skalakan secara proporsional agar tidak melebihi batas
  if (headChars + tailChars > maxTotal) {
    const ratio = maxTotal / (headChars + tailChars);
    headChars = Math.floor(headChars * ratio);
    tailChars = maxTotal - headChars;
  }

  const head = trimmed.substring(0, headChars).trim();
  const tail = trimmed.substring(trimmed.length - tailChars).trim();
  return `${head}\n\n[... Bagian tengah diringkas untuk efisiensi konteks window ...]\n\n${tail}`;
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
    s = s.replace(/([^\n])\s*(Gunakan 5 Tahap Strategic Framework Zeinity[^:]*:)/gi, '$1\n\n### STRUKTUR WAJIB (5 TAHAP ZEINITY):\n');
    s = s.replace(/([^\n])\s*(Struktur wajib:)/gi, '$1\n\n### STRUKTUR WAJIB (5 TAHAP ZEINITY):\n');
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
  I. HOOK & CLICK VALIDATION (0–30 Detik): Provocative Evidence Hook langsung membuktikan janji judul dengan fakta atau kontradiksi dari data riset.
  II. OBVIOUS ANSWER VS REALITY: Uji jawaban awam yang paling umum dipikirkan penonton vs realita dari data riset.
  III. THE HIDDEN MECHANISM: Bedah mekanisme teknis sistemik dan hidden incentive di balik layar.
  IV. COMPLICATION & ESCALATION: Masukkan bukti eskalasi dampak nyata (Human Impact) dan argumen tandingan terkuat (Best Counterargument).
  V. SYNTHESIS & BIGGER PICTURE: Tarik benang merah analitis, delayed judgment, dan pertanyaan reflektif.

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
- Pantangan Keras (Negative Constraints):
  * DILARANG KERAS menggunakan em dash (—) dan tanda titik dua (:) dalam narasi voice-over.
  * DILARANG memakai pola frasa klise AI: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM", "eh bentar deh".
  * DILARANG kalimat pembuka klise ("Di era digital yang serba cepat ini...").
  * DILARANG menambahkan fakta di luar data riset.
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
Tugas Anda: susun KERANGKA NASKAH 5 TAHAP ZEINITY yang presisi, mendalam, dan berbasis data riset aktual untuk video analitis (Target Durasi: ${durationStr} | Estimasi: ~${wordsTarget} Kata).

<context>
<topic>${title}</topic>
<category>${category || 'Umum'}</category>${notesSection}${angleSection}${revisionSection}
<research_data>
${boundedResearch}
</research_data>
</context>

<instructions>
Susun kerangka naskah menggunakan Strategic Framework 5 Tahap Zeinity:
1. I. HOOK & CLICK VALIDATION (0–30s): Provocative Evidence Hook yang langsung membuktikan janji judul dengan fakta, angka, atau kontradiksi empiris dari data riset. Validasi mengapa penonton harus peduli sekarang.
2. II. OBVIOUS ANSWER VS REALITY: Hadapkan dugaan awam/jawaban umum penonton dengan realita paradoksal berdasarkan bukti riset.
3. III. THE HIDDEN MECHANISM & INCENTIVES: Bedah mekanisme sistemik, algoritma, arsitektur insentif ekonomi/psikologi yang bekerja di balik layar.
4. IV. COMPLICATION & HUMAN IMPACT: Eskalasi dampak nyata bagi manusia/kreator/industri, serta masukkan Best Counterargument (argumen tandingan terkuat) yang menguji analisis.
5. V. SYNTHESIS & BIGGER PICTURE: Delayed judgment, benang merah analitis yang mencerahkan, dan pertanyaan reflektif penutup yang membekas.

${angleNotes && angleNotes.trim() ? `PENTING: Wajib integrasikan sudut pandang khusus dari <angle_khusus> di atas ("${angleNotes.trim()}") ke dalam alur babak yang relevan.\n` : ''}
Setiap babak WAJIB memuat 5 elemen terstruktur:
- Fungsi Bagian: misi psikologis segmen bagi penonton
- Isi Utama: poin pembahasan spesifik dari riset
- Argumen: posisi analitis yang disampaikan
- Bukti / Data: kutipan fakta atau data aktual dari riset
- Arah Transisi: jembatan alami ke segmen berikutnya
</instructions>

<negative_constraints>
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
Tugas Anda: Tulis NASKAH VIDEO LENGKAP UTUH yang siap dibacakan langsung oleh voice-over talent / AI TTS, berdasarkan Kerangka 5 Tahap Zeinity yang telah disetujui kreator.
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
   - Seperti sedang berdiskusi dengan teman sebaya yang cerdas dan setara, yang kebetulan sudah meriset topik ini lebih dulu.
   - BUKAN artikel koran/ensiklopedia, BUKAN presentasi seminar formal, BUKAN pembacaan berita televisi.
   - Naskah mengalir alami saat diucapkan dengan keras (breathe-friendly).

2. PANJANG KALIMAT DINAMIS (DYNAMIC SENTENCE LENGTH):
   - Jangan seragamkan semua kalimat menjadi pendek seperti teaser film.
   - Biarkan kalimat mengalir mengikuti satu unit pemikiran utuh.
   - Gunakan kalimat pendek untuk penekanan atau punchline.

3. TANDA BACA & PROSODI AUDIO TTS:
   - Tanda koma (,) untuk jeda napas ringan di mana ide berlanjut.
   - Tanda titik (.) untuk gagasan selesai.
   - JANGAN gunakan rentetan titik (...) berlebihan yang merusak intonasi AI TTS.
   - JANGAN gunakan enter/line break sebagai pengganti koma.

4. PANTANGAN KERAS (NEGATIVE CONSTRAINTS):
   - DILARANG KERAS menggunakan em dash (—) dalam teks narasi voice-over (ganti koma atau titik).
   - DILARANG menggunakan tanda titik dua (:) di dalam kalimat narasi VO.
   - DILARANG memakai pola kalimat klise AI: "Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM", "eh bentar deh".
   - DILARANG kalimat pembuka klise seperti "Di era digital yang serba cepat ini...".
   - DILARANG mengarang fakta di luar data riset.

5. VISUAL CUE INLINE:
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
Tugas Anda: susun KERANGKA NASKAH 5 TAHAP ZEINITY untuk video analitis (Target Durasi: ${durationStr} | Estimasi: ~${wordsTarget} Kata).

### INFORMASI PROJEK
- **Topik / Judul**: ${title}
- **Pilar Kategori**: ${category || 'Umum'}
${initialNotes && initialNotes.trim() ? `- **Catatan Ide Awal**: ${initialNotes.trim()}\n` : ''}${angleNotes && angleNotes.trim() ? `- **Fokus / Angle Khusus**: ${angleNotes.trim()}\n` : ''}
### DATA RISET
${researchOutput && researchOutput.trim() ? researchOutput.trim() : '(Gunakan data riset pendukung)'}

### STRUKTUR WAJIB (5 TAHAP ZEINITY):
I. HOOK & CLICK VALIDATION (0–30s): Provocative Evidence Hook membuktikan janji judul dengan fakta/angka/kontradiksi empiris riset.
II. OBVIOUS ANSWER VS REALITY: Jawaban awam vs realita paradoksal berdasarkan bukti.
III. THE HIDDEN MECHANISM & INCENTIVES: Mekanisme sistemik dan hidden incentives di balik layar.
IV. COMPLICATION & HUMAN IMPACT: Eskalasi dampak nyata bagi manusia/kreator/industri & argumen tandingan terkuat (counterargument).
V. SYNTHESIS & BIGGER PICTURE: Delayed judgment, benang merah analitis, dan pertanyaan reflektif penutup.

### ELEMEN SETIAP TAHAP:
- **Fungsi bagian**: misi psikologis segmen
- **Isi utama**: poin pembahasan spesifik
- **Argumen**: posisi analitis yang disampaikan
- **Bukti/contoh**: kutipan fakta atau data aktual dari riset
- **Arah transisi**: jembatan alami ke segmen berikutnya

### FORMAT OUTPUT:
Kembalikan HANYA teks kerangka terstruktur rapi dalam format Markdown tanpa kalimat basa-basi.`.trim();
}

export function formatExternalScriptingPrompt(
  title: string,
  approvedOutline: string,
  identityText: string,
  targetWords?: number | null,
  angleNotes?: string | null
): string {
  const wordsTarget = targetWords || 1200;

  return `Anda adalah Lead Spoken-First Scriptwriter & Executive Narrator (Zeinity).
Tugas Anda: Tulis NASKAH VIDEO LENGKAP UTUH yang siap dibacakan langsung oleh voice-over talent / AI TTS berdasarkan kerangka yang telah disetujui.
Target Panjang Naskah: Sekitar ${wordsTarget} Kata.

### INFORMASI PROJEK
- **Topik / Judul**: ${title}
- **Target Panjang**: ~${wordsTarget} Kata
${angleNotes && angleNotes.trim() ? `- **Fokus / Angle Khusus**: ${angleNotes.trim()}\n` : ''}
### IDENTITAS & PRINSIP CHANNEL (ZEINITY)
${identityText}

### KERANGKA NASKAH YANG TELAH DISETUJUI
${approvedOutline}

### ATURAN SPOKEN-FIRST & TTS (KETAT):
1. Gaya tutur lisan: diskusikan topik seperti teman sebaya yang cerdas. Bukan artikel formal, bukan pembacaan ensiklopedia.
2. Panjang kalimat dinamis: variasikan panjang kalimat secara organik. Kalimat pendek untuk punchline.
3. Prosodi TTS: Koma (,) untuk jeda napas, titik (.) untuk gagasan tuntas. Hindari titik beruntun (...).
4. PANTANGAN KERAS:
   - DILARANG KERAS menggunakan em dash (—) dalam teks narasi voice-over.
   - DILARANG tanda titik dua (:) dalam narasi VO.
   - DILARANG frasa klise AI ("Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM").
   - DILARANG pembuka klise ("Di era digital yang serba cepat ini...").
5. Sisipkan tag visual fungsional [BUKTI ...], [JELASKAN ...], [KONTEKS ...], [TEKANKAN ...], [RITME ...] pada baris terpisah tanpa titik dua setelah nama tag.

### FORMAT OUTPUT:
Tulis langsung naskah narasi lengkap dari awal hingga akhir, siap dibacakan, tanpa pengantar basa-basi.`.trim();
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
A. Struktur Kalimat: kalimat terlalu pendek (trailer-style), terlalu panjang (kehabisan napas), pola monoton. Satukan atau pecah menjadi unit pemikiran yang wajar diucapkan.
B. Punctuation & Prosodi TTS: penempatan koma vs titik, titik berlebihan yang merusak intonasi AI TTS, hilangkan baris tunggal yang menggantikan koma.
C. Naturalitas Lisan & AI Tropes: bahasa kaku artikel/ensiklopedia, pola klise ("Bukan X, melainkan Y", "Ini bukan soal X tapi Y", "dan BOOM", "eh bentar deh").
D. Larangan Voice-Over: hilangkan 100% em dash (—) dan titik dua (:) dalam narasi VO.
</dimensi_audit>

<boundary>
TIDAK BOLEH mengubah substansi cerita, pokok gagasan, tesis, atau data fakta yang ada. Fokus 100% pada bahasa tutur lisan dan prosodi TTS.
</boundary>

<output_format>
Kembalikan HANYA JSON valid (tanpa markdown wrapper):
{
  "findings": "Laporan temuan dengan format persis:\\n\\n**BAGIAN ASLI:**\\n[kutipan asli]\\n\\n**MASALAH:**\\n[deskripsi masalah]\\n\\n**REVISI:**\\n[kalimat revisi]\\n\\n**ALASAN:**\\n[alasan revisi]\\n\\n(Ulangi untuk setiap temuan. Jika naskah sudah sangat luwes dan tidak ada kendala, tulis: 'Tidak ditemukan kendala spoken/TTS yang berarti.')",
  "revisedDraft": "Naskah narasi lengkap yang sudah direvisi secara menyeluruh sesuai semua temuan audit di atas",
  "summary": "Ringkasan temuan singkat 1 kalimat, contoh: 'Ditemukan 4 temuan: 2 em dash, 1 AI trope, 1 kalimat kehabisan napas.'"
}
</output_format>`.trim();

  const raw = await callAI(prompt, config);
  const parsed = parseJsonResponse<{ findings: string; revisedDraft: string; summary: string }>(raw);
  return {
    findings: formatStructuredPrompt(parsed.findings || ''),
    revisedDraft: parsed.revisedDraft || scriptText,
    summary: parsed.summary || 'Audit selesai.',
  };
}

export async function runVisualCueAnnotation(
  config: ProviderConfig,
  title: string,
  scriptText: string
): Promise<{ annotatedScript: string; summary: string }> {
  const visualCueContext = extractSmartScriptContext(scriptText, config.provider === 'ollama'
    ? { maxTotal: 12000, headChars: 6000, tailChars: 6000 }
    : { maxTotal: 60000, headChars: 30000, tailChars: 30000 }
  );

  const prompt = `Anda adalah Lead Visual Cue & B-Roll Director (Zeinity).
TUGAS Anda: anotasi naskah berikut dengan functional visual cue tags secara langsung.
JANGAN buat prompt atau instruksi — LANGSUNG tambahkan tags ke naskah.

<naskah>
${visualCueContext}
</naskah>

<panduan_tags>
- [BUKTI ...]: tampilkan data/grafik/screenshot sebagai bukti klaim
- [JELASKAN ...]: animasi/diagram untuk menjelaskan konsep
- [KONTEKS ...]: footage/foto untuk memberikan konteks visual
- [TEKANKAN ...]: zoom in, typography, atau efek untuk menekankan poin penting
- [RITME ...]: montage cepat, cut, atau transisi untuk menjaga tempo
Tulis tag SETELAH kalimat yang relevan, pada baris baru, tanpa tanda titik dua setelah nama tag.
Format: [NAMA_TAG deskripsi singkat visual yang dibutuhkan]
</panduan_tags>

<output_format>
Kembalikan HANYA JSON valid (tanpa markdown wrapper):
{
  "annotatedScript": "Naskah lengkap dengan tags visual cue yang sudah disisipkan inline pada baris terpisah",
  "summary": "Contoh: 'Ditambahkan 14 tag: [BUKTI] x4, [JELASKAN] x3, [KONTEKS] x3, [TEKANKAN] x2, [RITME] x2'"
}
</output_format>`.trim();

  const raw = await callAI(prompt, config);
  const parsed = parseJsonResponse<{ annotatedScript: string; summary: string }>(raw);
  return {
    annotatedScript: parsed.annotatedScript || scriptText,
    summary: parsed.summary || 'Anotasi visual cue selesai.',
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

export interface AlternativeTitlesResult {
  titleA: string;
  titleB: string;
  explanation?: string;
}

export async function generateAlternativeTitles(
  config: ProviderConfig,
  currentTitle: string,
  category: string,
  contentSnippet?: string | null
): Promise<AlternativeTitlesResult> {
  const isOllama = config.provider === 'ollama';
  const contextOpts = isOllama
    ? { maxTotal: 6000, headChars: 3000, tailChars: 3000 }
    : { maxTotal: 15000, headChars: 7500, tailChars: 7500 };

  const snippetSection = contentSnippet && contentSnippet.trim()
    ? `\n<content_context>\n${extractSmartScriptContext(contentSnippet, contextOpts)}\n</content_context>`
    : '';

  const prompt = `Anda adalah **YouTube Title Packaging Specialist & CTR Strategist** untuk Zeinity.
Tugas Anda: buat 2 varian judul video alternatif berdasarkan standar komunitas YouTube yang sangat ketat:

<topic>${currentTitle}</topic>
<category>${category}</category>${snippetSection}

<aturan_judul>
1. **Mode A (Curiosity & Mobile Optimized)**:
   - Panjang WAJIB persis 5 sampai 8 kata (agar tidak terpotong di layar HP/aplikasi mobile YouTube).
   - Berfokus pada high curiosity / intrigue, curiosity gap mendalam, atau kontradiksi yang memicu klik tinggi (CTR tinggi) tanpa menjadi clickbait palsu/murahan.
   - Hindari kata-kata clickbait klise (seperti "Wajib Nonton!", "Bikin Syok").

2. **Mode B (Keyword & Authority Focused)**:
   - Berfokus pada kata kunci pencarian (SEO YouTube), kejelasan topik bahasan, dan executive authority.
   - Lugas, berwibawa, dan langsung menjelaskan apa yang akan dipahami penonton.
</aturan_judul>

<output_format>
Kembalikan HANYA format JSON valid tanpa pembungkus markdown:
{
  "titleA": "Judul Mode A (5-8 kata, intrigue & mobile-friendly)",
  "titleB": "Judul Mode B (SEO & executive authority)",
  "explanation": "Catatan singkat strategi judul"
}
</output_format>`.trim();

  const raw = await callAI(prompt, config);
  const parsed = parseJsonResponse<AlternativeTitlesResult>(raw);
  return {
    titleA: parsed.titleA?.trim() || currentTitle,
    titleB: parsed.titleB?.trim() || currentTitle,
    explanation: parsed.explanation?.trim() || '',
  };
}


export function parseAIError(rawError: unknown): {
  title: string;
  message: string;
  technicalDetails?: string;
  solution?: string;
} {
  const errStr = rawError instanceof Error ? rawError.message : String(rawError || 'Terjadi kesalahan sistem.');
  const lower = errStr.toLowerCase();

  // 0. Timeout / Aborted
  if (lower.includes('batas waktu') || lower.includes('timeout') || lower.includes('aborted')) {
    return {
      title: 'Permintaan AI Melebihi Batas Waktu (Timeout)',
      message: errStr,
      technicalDetails: errStr,
      solution: 'Server AI membutuhkan waktu terlalu lama untuk merespons. Periksa koneksi internet Anda atau coba pilih model alternatif yang lebih cepat di menu Settings.',
    };
  }

  // 1. OpenRouter 402: Payment Required / Credit balance exhausted
  if (lower.includes('402') || lower.includes('requires more credits') || lower.includes('insufficient credits') || lower.includes('credit')) {
    return {
      title: 'OpenRouter: Model Berbayar Terdeteksi (Error 402)',
      message: 'Model yang Anda pilih memerlukan saldo akun berbayar pada layanan OpenRouter.',
      technicalDetails: errStr,
      solution: 'Gunakan model berlabel ":free" (seperti "openrouter/free", "google/gemma-4-31b-it:free", atau "qwen/qwen3.8-27b:free") pada opsi Rekomendasi Model Gratis di menu Settings.',
    };
  }

  // 2. 404 Not Found / Model Deprecated
  if (lower.includes('404') || lower.includes('not found') || lower.includes('deprecated') || lower.includes('models/')) {
    return {
      title: 'Model AI Tidak Ditemukan / Deprecated (Error 404)',
      message: 'Versi model yang digunakan saat ini sudah tidak tersedia atau dinonaktifkan oleh provider penyedia AI.',
      technicalDetails: errStr,
      solution: 'Buka menu Settings lalu klik tombol "Auto Import Models" untuk memperbarui daftar model yang aktif, atau pilih dari daftar Rekomendasi Model Gratis.',
    };
  }

  // 3. API Key Missing or Invalid
  if (lower.includes('belum diatur') || lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('401') || lower.includes('unauthorized')) {
    return {
      title: 'Kunci API Belum Dikonfigurasi / Tidak Valid',
      message: 'Sistem tidak dapat terhubung ke AI karena API Key belum dimasukkan atau sudah tidak valid.',
      technicalDetails: errStr,
      solution: 'Buka menu Settings, masukkan API Key yang valid untuk provider yang Anda pilih, lalu klik Simpan.',
    };
  }

  // 4. Rate Limit (429)
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit') || lower.includes('quota')) {
    return {
      title: 'Batas Kuota / Rate Limit Terlampaui (Error 429)',
      message: 'Permintaan ke AI melebihi kuota per menit atau batas limit harian dari provider.',
      technicalDetails: errStr,
      solution: 'Tunggu sekitar 30-60 detik lalu coba ulangi, atau beralih ke provider alternatif (OpenRouter / Ollama Lokal) di menu Settings.',
    };
  }

  // 5. Ollama offline
  if (lower.includes('ollama') || lower.includes('econnrefused') || lower.includes('failed to fetch')) {
    return {
      title: 'Server Ollama Lokal Tidak Terhubung',
      message: 'Tidak dapat menjangkau endpoint Ollama di komputer lokal Anda.',
      technicalDetails: errStr,
      solution: 'Pastikan aplikasi Ollama sedang berjalan di komputer Anda (`ollama serve`) dan endpoint di Settings sudah sesuai (default: http://localhost:11434).',
    };
  }

  // General fallback
  return {
    title: 'Terjadi Kegagalan AI',
    message: errStr.length > 250 ? 'AI mengembalikan respons kesalahan saat memproses data.' : errStr,
    technicalDetails: errStr,
    solution: 'Periksa koneksi internet Anda atau periksa pilihan model AI dan API Key di menu Settings.',
  };
}

