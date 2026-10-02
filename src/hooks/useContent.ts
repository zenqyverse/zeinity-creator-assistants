import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  type ContentItem,
  type ContentSource,
  type ContentStatus,
  type TitleRecommendationItem,
  CONTENT_PILLARS,
  normalizeContentPillar,
} from '../types.ts';

export const CACHED_CONTENT_STORAGE_KEY = 'zeinity_cached_content_items';
const AUDIT_STORAGE_PREFIX = 'zeinity_audit_prompt_';
const CASUAL_AUDIT_STORAGE_PREFIX = 'zeinity_casual_audit_prompt_';
const TITLES_STORAGE_PREFIX = 'zeinity_generated_titles_';
const HOOK_TYPE_STORAGE_PREFIX = 'zeinity_hook_type_';
const HOOK_DRAFT_STORAGE_PREFIX = 'zeinity_hook_draft_';
const HOOK_NOTES_STORAGE_PREFIX = 'zeinity_hook_notes_';

// Bersihkan key residual visual cue yang sudah dihapus permanen dari localStorage
if (typeof window !== 'undefined') {
  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('zeinity_visual_cue_prompt_')) {
        legacyKeys.push(k);
      }
    }
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore cleanup errors
  }
}

export function getStoredContentItems(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_CONTENT_STORAGE_KEY);
    if (raw && raw.trim() !== '') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item): item is ContentItem => Boolean(item && typeof item === 'object' && 'id' in item));
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

export const getStoredItemsSafely = getStoredContentItems;

export function setStoredContentItems(items: ContentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_CONTENT_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to persist cached content items:', err);
    throw err;
  }
}

function getStoredAuditPrompt(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUDIT_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function setStoredAuditPrompt(id: string, prompt: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (prompt) {
      localStorage.setItem(AUDIT_STORAGE_PREFIX + id, prompt);
    } else {
      localStorage.removeItem(AUDIT_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredCasualAuditPrompt(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CASUAL_AUDIT_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function setStoredCasualAuditPrompt(id: string, prompt: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (prompt) {
      localStorage.setItem(CASUAL_AUDIT_STORAGE_PREFIX + id, prompt);
    } else {
      localStorage.removeItem(CASUAL_AUDIT_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredGeneratedTitles(id: string): TitleRecommendationItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TITLES_STORAGE_PREFIX + id);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

function setStoredGeneratedTitles(id: string, titles: TitleRecommendationItem[] | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (titles && titles.length > 0) {
      localStorage.setItem(TITLES_STORAGE_PREFIX + id, JSON.stringify(titles));
    } else {
      localStorage.removeItem(TITLES_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredHookType(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(HOOK_TYPE_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function setStoredHookType(id: string, val: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (val) {
      localStorage.setItem(HOOK_TYPE_STORAGE_PREFIX + id, val);
    } else {
      localStorage.removeItem(HOOK_TYPE_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredHookDraft(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(HOOK_DRAFT_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function setStoredHookDraft(id: string, val: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (val) {
      localStorage.setItem(HOOK_DRAFT_STORAGE_PREFIX + id, val);
    } else {
      localStorage.removeItem(HOOK_DRAFT_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredHookNotes(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(HOOK_NOTES_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function setStoredHookNotes(id: string, val: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (val) {
      localStorage.setItem(HOOK_NOTES_STORAGE_PREFIX + id, val);
    } else {
      localStorage.removeItem(HOOK_NOTES_STORAGE_PREFIX + id);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Menggabungkan data remote dari Supabase dengan metadata lokal di cache.
 * Memastikan metadata naskah lokal (script_target_duration, script_target_words,
 * script_angle_notes, script_production_track, script_outline_approved,
 * script_hook_type, script_hook_draft, script_hook_notes,
 * generated_thumbnail_visual, thumbnail_mode, generated_titles, dll.) tetap dipertahankan
 * jika kolom tersebut tidak ada atau bernilai null di skema database Supabase.
 */
export function mergeContentItemWithCache(
  remoteItem: ContentItem,
  cachedItem?: ContentItem | null
): ContentItem {
  return {
    ...remoteItem,
    audit_spoken_prompt:
      remoteItem.audit_spoken_prompt !== undefined && remoteItem.audit_spoken_prompt !== null
        ? remoteItem.audit_spoken_prompt
        : (cachedItem?.audit_spoken_prompt ?? getStoredAuditPrompt(remoteItem.id)),
    audit_casual_prompt:
      remoteItem.audit_casual_prompt !== undefined && remoteItem.audit_casual_prompt !== null
        ? remoteItem.audit_casual_prompt
        : (cachedItem?.audit_casual_prompt ?? getStoredCasualAuditPrompt(remoteItem.id)),
    generated_titles:
      remoteItem.generated_titles !== undefined && remoteItem.generated_titles !== null
        ? remoteItem.generated_titles
        : (cachedItem?.generated_titles ?? getStoredGeneratedTitles(remoteItem.id)),
    thumbnail_mode:
      remoteItem.thumbnail_mode !== undefined && remoteItem.thumbnail_mode !== null
        ? remoteItem.thumbnail_mode
        : (cachedItem?.thumbnail_mode ?? 'prompt'),
    generated_thumbnail_visual:
      remoteItem.generated_thumbnail_visual !== undefined && remoteItem.generated_thumbnail_visual !== null
        ? remoteItem.generated_thumbnail_visual
        : (cachedItem?.generated_thumbnail_visual ?? null),
    script_hook_type:
      remoteItem.script_hook_type !== undefined && remoteItem.script_hook_type !== null
        ? remoteItem.script_hook_type
        : (cachedItem?.script_hook_type ?? getStoredHookType(remoteItem.id)),
    script_hook_draft:
      remoteItem.script_hook_draft !== undefined && remoteItem.script_hook_draft !== null
        ? remoteItem.script_hook_draft
        : (cachedItem?.script_hook_draft ?? getStoredHookDraft(remoteItem.id)),
    script_hook_notes:
      remoteItem.script_hook_notes !== undefined && remoteItem.script_hook_notes !== null
        ? remoteItem.script_hook_notes
        : (cachedItem?.script_hook_notes ?? getStoredHookNotes(remoteItem.id)),
    script_outline:
      remoteItem.script_outline !== undefined && remoteItem.script_outline !== null
        ? remoteItem.script_outline
        : (cachedItem?.script_outline ?? null),
    script_target_duration:
      remoteItem.script_target_duration !== undefined && remoteItem.script_target_duration !== null
        ? remoteItem.script_target_duration
        : (cachedItem?.script_target_duration ?? null),
    script_target_words:
      remoteItem.script_target_words !== undefined && remoteItem.script_target_words !== null
        ? remoteItem.script_target_words
        : (cachedItem?.script_target_words ?? null),
    script_angle_notes:
      remoteItem.script_angle_notes !== undefined && remoteItem.script_angle_notes !== null
        ? remoteItem.script_angle_notes
        : (cachedItem?.script_angle_notes ?? null),
    script_production_track:
      remoteItem.script_production_track !== undefined && remoteItem.script_production_track !== null
        ? remoteItem.script_production_track
        : (cachedItem?.script_production_track ?? null),
    script_outline_approved:
      remoteItem.script_outline_approved !== undefined && remoteItem.script_outline_approved !== null
        ? remoteItem.script_outline_approved
        : (cachedItem?.script_outline_approved ?? null),
  };
}

const INITIAL_CONTENT_ITEMS: Omit<ContentItem, 'id'>[] = [
  {
    title: 'Cara Menggunakan AI untuk Otomasi Pembuatan Konten YouTube',
    source: 'Web',
    status: 'Idea',
    category: 'AI & Technology Impact',
    research_text: 'Analisis perbandingan tools AI video generator untuk creator pemula vs profesional.',
    research_brief_prompt: null,
    external_research_output: null,
    script_hook_type: null,
    script_hook_draft: null,
    script_hook_notes: null,
    script_outline: null,
    scriptwriter_brief_prompt: null,
    external_script_output: null,
    generated_title_a: null,
    generated_title_b: null,
    generated_thumbnail_prompt: null,
    target_platform: 'YouTube',
    target_publish_date: null,
    views: null,
    likes: null,
    comments: null,
    published_at: null,
    ai_output: '—',
    created_at: '2026-09-26T10:00:00.000Z',
    updated_at: '2026-09-26T10:00:00.000Z',
  },
  {
    title: '5 Tool AI Gratis untuk Riset Tren dan Analisis Kompetitor 2026',
    source: 'Telegram',
    status: 'Validating',
    category: 'Digital Economy & Creator Economy',
    research_text: 'Ide dari Telegram: Creator butuh rekomendasi tool riset kata kunci dan tren tanpa langganan mahal.',
    research_brief_prompt: 'Buat riset komparasi fitur gratis vs berbayar untuk 5 AI research tools di pasar kreator.',
    external_research_output: null,
    script_hook_type: null,
    script_hook_draft: null,
    script_hook_notes: null,
    script_outline: null,
    scriptwriter_brief_prompt: null,
    external_script_output: null,
    generated_title_a: null,
    generated_title_b: null,
    generated_thumbnail_prompt: null,
    target_platform: 'YouTube',
    target_publish_date: null,
    views: null,
    likes: null,
    comments: null,
    published_at: null,
    ai_output: 'Validasi awal: Potensi CTR tinggi dengan target creator pemula.',
    created_at: '2026-09-25T14:30:00.000Z',
    updated_at: '2026-09-25T15:00:00.000Z',
  },
  {
    title: 'Sistem Otomasi Workflow Creator dengan Antigravity & LLM',
    source: 'Web',
    status: 'Researching',
    category: 'AI & Technology Impact',
    research_text: 'Dokumentasi arsitektur multi-agent untuk content planning dan scriptwriting.',
    research_brief_prompt: 'Lakukan riset mendalam tentang integrasi API LLM ke dalam alur kerja produksi video.',
    external_research_output: 'Poin Riset:\n1. Integrasi API memotong waktu drafting hingga 60%.\n2. Validasi manual human-in-the-loop tetap krusial untuk tone of voice.\n3. Model hybrid lokal + cloud memberikan efisiensi biaya optimal.',
    script_hook_type: null,
    script_hook_draft: null,
    script_hook_notes: null,
    script_outline: null,
    scriptwriter_brief_prompt: null,
    external_script_output: null,
    generated_title_a: null,
    generated_title_b: null,
    generated_thumbnail_prompt: null,
    target_platform: 'YouTube',
    target_publish_date: null,
    views: null,
    likes: null,
    comments: null,
    published_at: null,
    ai_output: 'Riset komprehensif selesai. Siap dibuatkan outline naskah.',
    created_at: '2026-09-24T09:15:00.000Z',
    updated_at: '2026-09-24T11:20:00.000Z',
  },
  {
    title: 'Rahasia Scriptwriting AI yang Tidak Terasa Seperti Robot',
    source: 'Web',
    status: 'Scripting',
    category: 'Digital Economy & Creator Economy',
    research_text: 'Studi kasus retensi video dengan naskah berbasis AI vs naskah murni buatan manusia.',
    research_brief_prompt: 'Riset teknik humanisasi naskah AI untuk YouTube long-form.',
    external_research_output: 'Data retensi menunjukkan hook 5 detik pertama menentukan 70% keberhasilan video.',
    script_hook_type: 'Contradiction Hook ⭐',
    script_hook_draft: 'Harusnya AI mempermudah penulisan naskah kita. Masalahnya, naskah yang keluar malah terasa hambar dan robotik. Kalau kita perhatikan retensi audiens, mereka kabur di lima detik pertama. Pertanyaannya, bagaimana membuat naskah AI mengalir alami?',
    script_hook_notes: 'Fokuskan kontras pada paradoks efisiensi AI vs hilangnya sentuhan manusiawi',
    script_outline: 'I. Hook: Mengapa audiens kabur dalam 5 detik pertama\nII. Masalah: Bahasa AI yang kaku dan klise\nIII. Solusi: Formula 3 langkah humanisasi naskah\nIV. Contoh sebelum & sesudah\nV. CTA & Penutup',
    scriptwriter_brief_prompt: 'Tulis naskah video YouTube durasi 8 menit dengan gaya santai dan to-the-point khas Zeinity.',
    external_script_output: 'Halo creator! Pernah gak ngerasa script AI kalian kedengeran kayak dibaca robot kelurahan?...',
    generated_title_a: 'Scriptwriting AI: Formula Naskah Alami untuk Creator',
    generated_title_b: 'Rahasia Naskah AI yang Ditonton Sampai Habis',
    generated_thumbnail_prompt: 'JANGAN PAKAI AI SEBELUM TAHU INI',
    target_platform: 'YouTube',
    target_publish_date: null,
    views: null,
    likes: null,
    comments: null,
    published_at: null,
    ai_output: 'Pillar: Creator Workflow · Mode A: Scriptwriting AI · Mode B: Rahasia Naskah AI',
    created_at: '2026-09-23T16:00:00.000Z',
    updated_at: '2026-09-23T18:45:00.000Z',
  },
  {
    title: 'Setup Workspace Kreatif Minimalis 2026: Produktivitas Tanpa Distraksi',
    source: 'Web',
    status: 'Thumbnailing',
    category: 'Modern Life & Digital Psychology',
    research_text: 'Review ergonomi ruang kerja, lighting minimalis, dan software pendukung.',
    research_brief_prompt: 'Riset tren aesthetic workspace creator YouTube dan pengaruh lingkungan fisik terhadap produktivitas.',
    external_research_output: 'Pencahayaan bias dan meja clean-desk meningkatkan durasi fokus hingga 40%.',
    script_hook_type: 'Broken Assumption Hook ⭐',
    script_hook_draft: null,
    script_hook_notes: null,
    script_outline: '1. Masalah: Meja berantakan = otak berantakan\n2. 3 Elemen kunci setup minimalis\n3. Rekomendasi perlengkapan ramah kantong\n4. Routine harian',
    scriptwriter_brief_prompt: 'Naskah video santai 10 menit dengan breakdown perlengkapan kerja nyata.',
    external_script_output: 'Pernah nggak kalian duduk di depan meja kerja, niatnya mau produktif 4 jam ke depan...',
    generated_title_a: 'Workspace Setup 2026: Minimalis, Estetik, & Produktif',
    generated_title_b: 'Meja Kerja Minimalis yang Mengubah Cara Saya Berkarya',
    generated_thumbnail_prompt: 'SETUP INI BIKIN SAYA 2X LEBIH PRODUKTIF',
    target_platform: 'YouTube',
    target_publish_date: null,
    views: null,
    likes: null,
    comments: null,
    published_at: null,
    ai_output: 'Thumbnail: SETUP MINIMALIS 2026 · CTR Prediksi: 8.5%',
    created_at: '2026-09-22T11:00:00.000Z',
    updated_at: '2026-09-22T17:30:00.000Z',
  },
  {
    title: 'Psikologi Algoritma Rekomendasi: Mengapa Kita Kecanduan Short-Form Content',
    source: 'Web',
    status: 'Published',
    category: 'Internet & Social Media Culture',
    research_text: 'Dopamine loops dan reward schedule variabel pada platform Shorts & TikTok.',
    research_brief_prompt: 'Analisis riset neurosains tentang konsumsi konten vertikal dan durasi atensi manusia modern.',
    external_research_output: 'Studi menunjukkan dopamin terpicu bukan oleh konten yang disukai, melainkan oleh antisipasi konten berikutnya.',
    script_hook_type: 'Hidden Incentive Hook',
    script_hook_draft: null,
    script_hook_notes: null,
    script_outline: 'I. Fenomena scrolling tanpa sadar\nII. Variabel Reward: Mesin judi di saku celana\nIII. Dampak kognitif jangka panjang\nIV. Cara merebut kembali kendali fokus',
    scriptwriter_brief_prompt: 'Naskah video esai dokumenter mendalam durasi 12 menit dengan sentuhan filosofis.',
    external_script_output: 'Rata-rata orang membuka ponsel mereka lebih dari 140 kali sehari...',
    generated_title_a: 'Psikologi Algoritma: Bagaimana Kita Terperangkap di Layar',
    generated_title_b: 'Sisi Gelap Konten Pendek yang Jarang Disadari',
    generated_thumbnail_prompt: 'TERJEBAK DI DALAM LOOP DOPAMIN',
    target_platform: 'YouTube',
    target_publish_date: '2026-09-21T00:00:00.000Z',
    views: 45200,
    likes: 3820,
    comments: 412,
    published_at: '2026-09-21T14:00:00.000Z',
    ai_output: 'Performa aktual: 45.2K views · Engagement rate 9.3% · Status: Publikasi Sukses',
    created_at: '2026-09-18T08:00:00.000Z',
    updated_at: '2026-09-20T12:00:00.000Z',
  },
];

export function useContent() {
  const [items, setItems] = useState<ContentItem[]>(() => {
    const cached = getStoredContentItems();
    return cached.length > 0 ? cached : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<ContentItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const dampedUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dampedUpdateTimerRef.current) {
        clearTimeout(dampedUpdateTimerRef.current);
      }
    };
  }, []);

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial && itemsRef.current.length === 0) setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured) {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(CACHED_CONTENT_STORAGE_KEY);
          if (raw !== null) {
            if (raw.trim() === '') {
              itemsRef.current = [];
              setItems([]);
              setError('LocalStorage cache string is empty');
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw);
            } catch (syntaxErr) {
              itemsRef.current = [];
              setItems([]);
              setError(`Malformed JSON in LocalStorage: ${syntaxErr instanceof Error ? syntaxErr.message : String(syntaxErr)}`);
              return;
            }
            if (!Array.isArray(parsed)) {
              const seeded = INITIAL_CONTENT_ITEMS.map((item, idx) => ({
                ...item,
                id: `offline-init-${idx + 1}`,
                audit_spoken_prompt: getStoredAuditPrompt(`offline-init-${idx + 1}`),
                audit_casual_prompt: getStoredCasualAuditPrompt(`offline-init-${idx + 1}`),
                generated_titles: getStoredGeneratedTitles(`offline-init-${idx + 1}`),
                thumbnail_mode: item.thumbnail_mode ?? 'prompt',
              })) as ContentItem[];
              itemsRef.current = seeded;
              setItems(seeded);
              setStoredContentItems(seeded);
              return;
            }
            if (parsed.some((item) => !item || typeof item !== 'object')) {
              itemsRef.current = [];
              setItems([]);
              setError('LocalStorage array contains corrupted or non-object entries');
              return;
            }
            let hasMigrations = false;
            const migrated = (parsed as ContentItem[]).map((item) => {
              let updatedItem = item;
              if ((item.status as string) === 'Research') {
                updatedItem = { ...updatedItem, status: 'Researching' };
                hasMigrations = true;
              }
              return mergeContentItemWithCache(updatedItem, item);
            });
            if (hasMigrations) {
              setStoredContentItems(migrated);
            }
            migrated.sort((a, b) => {
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });
            itemsRef.current = migrated;
            setItems(migrated);
            return;
          }
        }

        const cached = getStoredContentItems();
        if (cached.length > 0) {
          const merged = cached.map((item) => mergeContentItemWithCache(item, item));
          itemsRef.current = merged;
          setItems(merged);
        } else if (isInitial) {
          const seeded = INITIAL_CONTENT_ITEMS.map((item, idx) => ({
            ...item,
            id: `offline-init-${idx + 1}`,
            audit_spoken_prompt: getStoredAuditPrompt(`offline-init-${idx + 1}`),
            audit_casual_prompt: getStoredCasualAuditPrompt(`offline-init-${idx + 1}`),
            generated_titles: getStoredGeneratedTitles(`offline-init-${idx + 1}`),
            thumbnail_mode: item.thumbnail_mode ?? 'prompt',
          })) as ContentItem[];
          itemsRef.current = seeded;
          setItems(seeded);
          setStoredContentItems(seeded);
        }
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const cached = getStoredContentItems();
      const cachedMap = new Map<string, ContentItem>();
      cached.forEach((c) => {
        if (c?.id) cachedMap.set(c.id, c);
      });
      itemsRef.current.forEach((c) => {
        if (c?.id) {
          const diskItem = cachedMap.get(c.id);
          cachedMap.set(c.id, diskItem ? mergeContentItemWithCache(c, diskItem) : c);
        }
      });

      if (!data || data.length === 0) {
        if (isInitial) {
          // Seed database only on initial load if database is empty
          const { data: seededData, error: seedError } = await supabase
            .from('content')
            .insert(INITIAL_CONTENT_ITEMS)
            .select()
            .order('created_at', { ascending: false });
            
          if (seedError) throw seedError;
          const merged = (seededData as ContentItem[]).map((item) =>
            mergeContentItemWithCache(item, cachedMap.get(item.id))
          );
          itemsRef.current = merged;
          setItems(merged);
          setStoredContentItems(merged);
        } else {
          // Jika Supabase kosong pada fetch berikutnya, gunakan cache lokal yang ada
          if (cached.length > 0) {
            itemsRef.current = cached;
            setItems(cached);
          } else {
            itemsRef.current = [];
            setItems([]);
            setStoredContentItems([]);
          }
        }
      } else {
        const merged = (data as ContentItem[]).map((item) =>
          mergeContentItemWithCache(item, cachedMap.get(item.id))
        );
        itemsRef.current = merged;
        setItems(merged);
        setStoredContentItems(merged);
      }
    } catch (err: unknown) {
      console.warn('Gagal memuat data dari Supabase, mengaktifkan cache snapshot lokal:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`${errMsg} (menampilkan data dari cache offline)`);
      // FALLBACK KE CACHE OFFLINE: jangan pernah mengosongkan items ke [] jika Supabase down
      const cached = getStoredContentItems();
      if (cached.length > 0) {
        const merged = cached.map((item) => mergeContentItemWithCache(item, item));
        itemsRef.current = merged;
        setItems(merged);
      } else if (isInitial) {
        // Fallback untuk user baru offline pertama kali
        const seeded = INITIAL_CONTENT_ITEMS.map((item, idx) => ({
          ...item,
          id: `offline-init-${idx + 1}`,
          audit_spoken_prompt: getStoredAuditPrompt(`offline-init-${idx + 1}`),
          audit_casual_prompt: getStoredCasualAuditPrompt(`offline-init-${idx + 1}`),
          generated_titles: getStoredGeneratedTitles(`offline-init-${idx + 1}`),
          thumbnail_mode: item.thumbnail_mode ?? 'prompt',
        })) as ContentItem[];
        itemsRef.current = seeded;
        setItems(seeded);
        setStoredContentItems(seeded);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  // Cross-tab synchronization via StorageEvent and CustomEvent
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CACHED_CONTENT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((item): item is ContentItem => Boolean(item && typeof item === 'object'));
            valid.sort((a, b) => {
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });
            itemsRef.current = valid;
            setItems(valid);
          }
        } catch {
          // ignore
        }
      }
    };
    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (Array.isArray(customEvent.detail)) {
        itemsRef.current = customEvent.detail;
        setItems(customEvent.detail);
        try {
          setStoredContentItems(customEvent.detail);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('zeinity_content_sync', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('zeinity_content_sync', handleCustomSync);
    };
  }, []);

  // Realtime subscription hanya jika Supabase terkonfigurasi
  // Mendukung callback opsional onNewTelegramIdea untuk notifikasi realtime di web app
  const onNewTelegramIdeaRef = useRef<((count: number) => void) | undefined>(undefined);
  const pendingTelegramCountRef = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        (payload) => {
          // Deteksi INSERT dari bot Telegram (bukan update/delete biasa)
          if (
            payload.eventType === 'INSERT' &&
            payload.new &&
            typeof payload.new === 'object' &&
            (payload.new as Record<string, unknown>).source === 'Telegram' &&
            (payload.new as Record<string, unknown>).telegram_message_id
          ) {
            pendingTelegramCountRef.current += 1;
            if (onNewTelegramIdeaRef.current) {
              onNewTelegramIdeaRef.current(pendingTelegramCountRef.current);
              pendingTelegramCountRef.current = 0;
            }
          }
          fetchAll(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addIdea = useCallback(async (idea: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
    status?: ContentStatus;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
    telegram_sender_username?: string | null;
  }): Promise<ContentItem> => {
    const now = new Date().toISOString();
    const localId = `idea-${Date.now()}`;
    const optimisticItem: ContentItem = {
      id: localId,
      title: idea.title,
      source: idea.source,
      category: idea.category,
      research_text: idea.research_text,
      status: idea.status || 'Idea',
      ai_output: idea.telegram_message_id
        ? `Diterima otomatis via Telegram Bot (@${idea.telegram_sender_username || idea.telegram_chat_id || 'bot'})`
        : '—',
      telegram_message_id: idea.telegram_message_id ?? null,
      telegram_chat_id: idea.telegram_chat_id ?? null,
      telegram_sender_username: idea.telegram_sender_username ?? null,
      research_brief_prompt: null,
      external_research_output: null,
      script_hook_type: null,
      script_hook_draft: null,
      script_hook_notes: null,
      script_outline: null,
      scriptwriter_brief_prompt: null,
      external_script_output: null,
      generated_title_a: null,
      generated_title_b: null,
      generated_thumbnail_prompt: null,
      target_platform: 'YouTube',
      target_publish_date: null,
      views: null,
      likes: null,
      comments: null,
      published_at: null,
      created_at: now,
      updated_at: now,
    };

    // Optimistic local add
    const updated = [optimisticItem, ...itemsRef.current];
    try {
      setStoredContentItems(updated);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      throw err;
    }
    itemsRef.current = updated;
    setItems(updated);

    if (!isSupabaseConfigured) {
      return optimisticItem;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('content')
        .insert({
          title: idea.title,
          source: idea.source,
          category: idea.category,
          research_text: idea.research_text,
          status: idea.status || 'Idea',
          telegram_message_id: idea.telegram_message_id ?? null,
          telegram_chat_id: idea.telegram_chat_id ?? null,
          telegram_sender_username: idea.telegram_sender_username ?? null,
          ai_output: optimisticItem.ai_output,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Gagal menyimpan ide baru ke Supabase, tersimpan di cache lokal:', insertError);
        return optimisticItem;
      }

      if (data) {
        const newItem = data as ContentItem;
        const updated = itemsRef.current.map((i) => (i.id === localId ? newItem : i));
        itemsRef.current = updated;
        setItems(updated);
        setStoredContentItems(updated);
        return newItem;
      }
    } catch (netErr) {
      console.warn('Koneksi offline, ide baru tersimpan di cache lokal:', netErr);
    }

    return optimisticItem;
  }, []);

  const bulkAddIdeas = useCallback(async (newIdeas: Array<{
    title: string;
    source?: ContentSource;
    category?: string;
    research_text?: string | null;
    status?: ContentStatus;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
    telegram_sender_username?: string | null;
  }>): Promise<ContentItem[]> => {
    if (!newIdeas || newIdeas.length === 0) return [];
    const now = new Date().toISOString();
    const createdItems: ContentItem[] = newIdeas.map((idea, idx) => ({
      id: `bulk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      title: idea.title.trim(),
      source: idea.source || 'Web',
      category: idea.category ? normalizeContentPillar(idea.category) : CONTENT_PILLARS[0],
      research_text: idea.research_text?.trim() || null,
      status: idea.status || 'Idea',
      ai_output: idea.telegram_message_id
        ? `Diterima otomatis via Telegram Bot (@${idea.telegram_sender_username || idea.telegram_chat_id || 'bot'})`
        : '—',
      telegram_message_id: idea.telegram_message_id ?? null,
      telegram_chat_id: idea.telegram_chat_id ?? null,
      telegram_sender_username: idea.telegram_sender_username ?? null,
      research_brief_prompt: null,
      external_research_output: null,
      script_hook_type: null,
      script_hook_draft: null,
      script_hook_notes: null,
      script_outline: null,
      scriptwriter_brief_prompt: null,
      external_script_output: null,
      generated_title_a: null,
      generated_title_b: null,
      generated_thumbnail_prompt: null,
      target_platform: 'YouTube',
      target_publish_date: null,
      views: null,
      likes: null,
      comments: null,
      published_at: null,
      created_at: new Date(Date.now() - idx * 1000).toISOString(),
      updated_at: now,
    }));

    // Optimistic local add
    const updated = [...createdItems, ...itemsRef.current];
    itemsRef.current = updated;
    setItems(updated);
    try {
      setStoredContentItems(updated);
    } catch (err) {
      console.error('Failed to persist cached bulk content items:', err);
    }

    if (!isSupabaseConfigured) {
      return createdItems;
    }

    try {
      const inserts = createdItems.map((item) => ({
        title: item.title,
        source: item.source,
        category: item.category,
        research_text: item.research_text,
        status: item.status,
        telegram_message_id: item.telegram_message_id ?? null,
        telegram_chat_id: item.telegram_chat_id ?? null,
        telegram_sender_username: item.telegram_sender_username ?? null,
        ai_output: item.ai_output,
      }));

      const { data, error: insertError } = await supabase
        .from('content')
        .insert(inserts)
        .select();

      if (!insertError && data && Array.isArray(data)) {
        const returnedItems = data as ContentItem[];
        const fullyUpdated = itemsRef.current.map((p) => {
          const match = returnedItems.find((r) => r.title === p.title && r.status === p.status);
          return match || p;
        });
        itemsRef.current = fullyUpdated;
        setItems(fullyUpdated);
        setStoredContentItems(fullyUpdated);
        return returnedItems;
      }
    } catch (netErr) {
      console.warn('Koneksi offline, bulk ide baru tersimpan di cache lokal:', netErr);
    }

    return createdItems;
  }, []);

  const updateItem = useCallback(async (
    id: string,
    updates: Partial<ContentItem>,
    options?: { silent?: boolean; immediate?: boolean }
  ): Promise<ContentItem> => {
    const exists = itemsRef.current.some((item) => item.id === id);
    if (!exists) {
      throw new Error(`Konten dengan ID ${id} tidak ditemukan`);
    }

    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.created_at;
    
    // Simpan ke local storage jika terdapat field audit_spoken_prompt atau generated_titles
    if ('audit_spoken_prompt' in updates) {
      setStoredAuditPrompt(id, updates.audit_spoken_prompt);
    }
    if ('audit_casual_prompt' in updates) {
      setStoredCasualAuditPrompt(id, updates.audit_casual_prompt);
    }
    if ('generated_titles' in updates) {
      setStoredGeneratedTitles(id, updates.generated_titles);
    }
    if ('script_hook_type' in updates) {
      setStoredHookType(id, updates.script_hook_type);
    }
    if ('script_hook_draft' in updates) {
      setStoredHookDraft(id, updates.script_hook_draft);
    }
    if ('script_hook_notes' in updates) {
      setStoredHookNotes(id, updates.script_hook_notes);
    }

    const now = new Date().toISOString();
    const targetItem = itemsRef.current.find((item) => item.id === id);
    const optimisticItem: ContentItem | null = targetItem
      ? {
          ...targetItem,
          ...safeUpdates,
          updated_at: now,
          audit_spoken_prompt: updates.audit_spoken_prompt !== undefined 
            ? updates.audit_spoken_prompt 
            : (targetItem.audit_spoken_prompt ?? getStoredAuditPrompt(id)),
          audit_casual_prompt: updates.audit_casual_prompt !== undefined 
            ? updates.audit_casual_prompt 
            : (targetItem.audit_casual_prompt ?? getStoredCasualAuditPrompt(id)),
          generated_titles: updates.generated_titles !== undefined
            ? updates.generated_titles
            : (targetItem.generated_titles ?? getStoredGeneratedTitles(id)),
          thumbnail_mode: updates.thumbnail_mode !== undefined
            ? updates.thumbnail_mode
            : (targetItem.thumbnail_mode ?? 'prompt'),
          generated_thumbnail_visual: updates.generated_thumbnail_visual !== undefined
            ? updates.generated_thumbnail_visual
            : targetItem.generated_thumbnail_visual,
          script_hook_type: updates.script_hook_type !== undefined
            ? updates.script_hook_type
            : (targetItem.script_hook_type ?? getStoredHookType(id)),
          script_hook_draft: updates.script_hook_draft !== undefined
            ? updates.script_hook_draft
            : (targetItem.script_hook_draft ?? getStoredHookDraft(id)),
          script_hook_notes: updates.script_hook_notes !== undefined
            ? updates.script_hook_notes
            : (targetItem.script_hook_notes ?? getStoredHookNotes(id)),
          script_outline: updates.script_outline !== undefined
            ? updates.script_outline
            : targetItem.script_outline,
          script_target_duration: updates.script_target_duration !== undefined
            ? updates.script_target_duration
            : targetItem.script_target_duration,
          script_target_words: updates.script_target_words !== undefined
            ? updates.script_target_words
            : targetItem.script_target_words,
          script_angle_notes: updates.script_angle_notes !== undefined
            ? updates.script_angle_notes
            : targetItem.script_angle_notes,
          script_production_track: updates.script_production_track !== undefined
            ? updates.script_production_track
            : targetItem.script_production_track,
          script_outline_approved: updates.script_outline_approved !== undefined
            ? updates.script_outline_approved
            : targetItem.script_outline_approved,
        }
      : null;

    const updated = itemsRef.current.map((item) => (item.id === id && optimisticItem ? optimisticItem : item));

    try {
      setStoredContentItems(updated);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      throw err;
    }

    // Optimistic update first: pastikan data langsung tersimpan di ref dan localStorage
    itemsRef.current = updated;

    // Peredaman / Damping pembaruan React state setItems:
    // 1. Jika options?.silent === true, jangan ubah state `items` langsung (tidak memicu re-render root App.tsx saat mengetik),
    //    namun jadwalkan debounced update (2000ms) agar setelah jeda mengetik state root tetap tersinkronisasi.
    // 2. Jika options?.immediate === true atau terdapat perubahan status/kategori/judul, panggil setItems langsung
    // 3. Jika hanya perubahan draft teks secara beruntun (misal debounced typing), redam/tunda pembaruan root
    const isStructuralChange = updates.status !== undefined || updates.title !== undefined || updates.category !== undefined || updates.source !== undefined;
    const isDraftTextOnly = !isStructuralChange && (
      updates.external_script_output !== undefined ||
      updates.external_research_output !== undefined ||
      updates.script_outline !== undefined ||
      updates.script_angle_notes !== undefined ||
      updates.script_hook_draft !== undefined ||
      updates.script_hook_notes !== undefined
    );

    if (options?.silent) {
      // Pembaruan senyap: jangan panggil setItems sekarang (mencegah root re-render saat mengetik),
      // namun jadwalkan debounced update (2000ms) agar setelah selesai mengetik state root tetap tersinkronisasi.
      if (dampedUpdateTimerRef.current) {
        clearTimeout(dampedUpdateTimerRef.current);
      }
      dampedUpdateTimerRef.current = setTimeout(() => {
        dampedUpdateTimerRef.current = null;
        setItems(itemsRef.current);
      }, 2000);
    } else if (options?.immediate || isStructuralChange || !isDraftTextOnly) {
      if (dampedUpdateTimerRef.current) {
        clearTimeout(dampedUpdateTimerRef.current);
        dampedUpdateTimerRef.current = null;
      }
      setItems(updated);
    } else {
      // Peredaman pembaruan: debounce setItems agar ketikan naskah tidak memicu root re-render cascade
      if (dampedUpdateTimerRef.current) {
        clearTimeout(dampedUpdateTimerRef.current);
      }
      dampedUpdateTimerRef.current = setTimeout(() => {
        dampedUpdateTimerRef.current = null;
        setItems(itemsRef.current);
      }, 2000);
    }

    if (!isSupabaseConfigured) {
      return optimisticItem || ({ id, ...updates } as ContentItem);
    }

    try {
      let res = await supabase
        .from('content')
        .update({ ...safeUpdates, updated_at: now })
        .eq('id', id)
        .select()
        .single();

      // Jika skema remote Supabase belum memiliki kolom audit_spoken_prompt, audit_casual_prompt, generated_titles, atau metadata script baru (PGRST204 atau 42703), retry tanpa kolom tersebut
      if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703' || res.error.message?.includes('audit_spoken_prompt') || res.error.message?.includes('audit_casual_prompt') || res.error.message?.includes('generated_titles') || res.error.message?.includes('script_') || res.error.message?.includes('thumbnail_'))) {
        const fallbackUpdates = { ...safeUpdates };
        delete fallbackUpdates.audit_spoken_prompt;
        delete fallbackUpdates.audit_casual_prompt;
        delete fallbackUpdates.generated_titles;
        delete fallbackUpdates.thumbnail_mode;
        delete fallbackUpdates.generated_thumbnail_visual;
        delete fallbackUpdates.script_hook_type;
        delete fallbackUpdates.script_hook_draft;
        delete fallbackUpdates.script_hook_notes;
        delete fallbackUpdates.script_target_duration;
        delete fallbackUpdates.script_target_words;
        delete fallbackUpdates.script_angle_notes;
        delete fallbackUpdates.script_production_track;
        delete fallbackUpdates.script_outline_approved;
        res = await supabase
          .from('content')
          .update({ ...fallbackUpdates, updated_at: now })
          .eq('id', id)
          .select()
          .single();
      }

      if (res.error) {
        console.warn('Gagal sinkronisasi update ke Supabase, perubahan tersimpan di cache lokal:', res.error);
      } else if (res.data) {
        const remoteItem = res.data as ContentItem;
        const fullyMerged: ContentItem = {
          ...(optimisticItem || {}),
          ...remoteItem,
          audit_spoken_prompt: updates.audit_spoken_prompt !== undefined 
            ? updates.audit_spoken_prompt 
            : (remoteItem.audit_spoken_prompt ?? getStoredAuditPrompt(id)),
          audit_casual_prompt: updates.audit_casual_prompt !== undefined 
            ? updates.audit_casual_prompt 
            : (remoteItem.audit_casual_prompt ?? getStoredCasualAuditPrompt(id)),
          generated_titles: updates.generated_titles !== undefined
            ? updates.generated_titles
            : (targetItem?.generated_titles ?? getStoredGeneratedTitles(id)),
          thumbnail_mode: updates.thumbnail_mode !== undefined
            ? updates.thumbnail_mode
            : (remoteItem.thumbnail_mode ?? targetItem?.thumbnail_mode ?? optimisticItem?.thumbnail_mode ?? 'prompt'),
          generated_thumbnail_visual: updates.generated_thumbnail_visual !== undefined
            ? updates.generated_thumbnail_visual
            : (remoteItem.generated_thumbnail_visual ?? targetItem?.generated_thumbnail_visual ?? optimisticItem?.generated_thumbnail_visual),
          script_hook_type: updates.script_hook_type !== undefined
            ? updates.script_hook_type
            : (remoteItem.script_hook_type ?? optimisticItem?.script_hook_type ?? getStoredHookType(id)),
          script_hook_draft: updates.script_hook_draft !== undefined
            ? updates.script_hook_draft
            : (remoteItem.script_hook_draft ?? optimisticItem?.script_hook_draft ?? getStoredHookDraft(id)),
          script_hook_notes: updates.script_hook_notes !== undefined
            ? updates.script_hook_notes
            : (remoteItem.script_hook_notes ?? optimisticItem?.script_hook_notes ?? getStoredHookNotes(id)),
          script_outline: updates.script_outline !== undefined
            ? updates.script_outline
            : (remoteItem.script_outline ?? optimisticItem?.script_outline),
          script_target_duration: updates.script_target_duration !== undefined
            ? updates.script_target_duration
            : (remoteItem.script_target_duration ?? optimisticItem?.script_target_duration),
          script_target_words: updates.script_target_words !== undefined
            ? updates.script_target_words
            : (remoteItem.script_target_words ?? optimisticItem?.script_target_words),
          script_angle_notes: updates.script_angle_notes !== undefined
            ? updates.script_angle_notes
            : (remoteItem.script_angle_notes ?? optimisticItem?.script_angle_notes),
          script_production_track: updates.script_production_track !== undefined
            ? updates.script_production_track
            : (remoteItem.script_production_track ?? optimisticItem?.script_production_track),
          script_outline_approved: updates.script_outline_approved !== undefined
            ? updates.script_outline_approved
            : (remoteItem.script_outline_approved ?? optimisticItem?.script_outline_approved),
        };
        const updated = itemsRef.current.map((item) => (item.id === id ? fullyMerged : item));
        itemsRef.current = updated;
        setStoredContentItems(updated);
        if (!options?.silent) {
          if (options?.immediate || isStructuralChange || !isDraftTextOnly) {
            setItems(updated);
          }
        }
        return fullyMerged;
      }
    } catch (netErr) {
      console.warn('Jaringan offline, perubahan tersimpan di cache lokal:', netErr);
    }

    return optimisticItem || ({ id, ...updates } as ContentItem);
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    setStoredAuditPrompt(id, null);
    setStoredGeneratedTitles(id, null);
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? (globalThis as unknown as { localStorage?: Storage }).localStorage : undefined);
    if (storage) {
      try {
        storage.removeItem(`zeinity_generated_titles_${id}`);
        storage.removeItem(`zeinity_draft_history_${id}`);
        storage.removeItem(`zeinity_audit_revised_${id}`);
      } catch {
        // Ignore storage errors
      }
    }

    const previousItems = itemsRef.current;
    // Optimistic local deletion
    const updated = itemsRef.current.filter((item) => item.id !== id);
    itemsRef.current = updated;
    try {
      setStoredContentItems(updated);
    } catch (err) {
      console.error('Failed to save after deletion:', err);
    }
    setItems(updated);

    if (isSupabaseConfigured) {
      try {
        const { error: deleteError, count } = await supabase
          .from('content')
          .delete({ count: 'exact' })
          .eq('id', id);

        if (deleteError) {
          console.warn('Gagal menghapus item dari Supabase:', deleteError);
          itemsRef.current = previousItems;
          setStoredContentItems(previousItems);
          setItems(previousItems);
          throw new Error(`Database Supabase menolak penghapusan: ${deleteError.message}`);
        }

        // Deteksi jika PostgreSQL RLS memblokir penghapusan secara senyap (count === 0)
        if (count === 0) {
          console.warn('Operasi DELETE ditolak oleh kebijakan RLS Supabase (0 baris terhapus).');
          itemsRef.current = previousItems;
          setStoredContentItems(previousItems);
          setItems(previousItems);
          throw new Error(
            'Gagal menghapus ide dari database Supabase: Operasi DELETE ditolak oleh kebijakan keamanan Row-Level Security (RLS) pada role anon (0 baris terhapus). Aktifkan policy "anon_delete_content" di Supabase SQL Editor.'
          );
        }
      } catch (netErr) {
        if (netErr instanceof Error && (netErr.message.includes('Row-Level Security') || netErr.message.includes('menolak penghapusan'))) {
          throw netErr;
        }
        console.warn('Jaringan offline saat menghapus item:', netErr);
      }
    }
  }, []);

  const setOnNewTelegramIdea = useCallback((cb: ((count: number) => void) | undefined) => {
    onNewTelegramIdeaRef.current = cb;
  }, []);

  return { items, loading, error, fetchAll, addIdea, bulkAddIdeas, updateItem, deleteItem, setOnNewTelegramIdea };
}

