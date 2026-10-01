export type ContentStatus = 'Idea' | 'Validating' | 'Researching' | 'Scripting' | 'Thumbnailing' | 'Published';
export type ContentSource = 'Web' | 'Telegram' | 'YouTube Trends' | 'Google Trends' | 'RSS';

export interface YouTubeTrendItem {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  description: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount?: number;
  videoUrl: string;
}

export interface GoogleTrendItem {
  id: string;
  title: string;
  approxTraffic: string;
  pubDate: string;
  newsTitle?: string;
  newsSource?: string;
  newsUrl?: string;
  imageUrl?: string;
  trendUrl: string;
}

export interface RSSSource {
  id: string;
  title: string;
  url: string;
  category: 'media' | 'tech' | 'forum' | 'custom';
  pillar: ContentPillar;
  is_active: boolean;
}

export interface RSSItem {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  contentSnippet: string;
  thumbnail?: string;
  pillar?: ContentPillar;
  isRead?: boolean;
  isBookmarked?: boolean;
}

export const CONTENT_PILLARS = [
  'Internet & Social Media Culture',
  'AI & Technology Impact',
  'Digital Economy & Creator Economy',
  'Gaming & Digital Entertainment',
  'Modern Life & Digital Psychology',
] as const;

export type ContentPillar = typeof CONTENT_PILLARS[number];

export const CONTENT_STATUSES: ContentStatus[] = [
  'Idea',
  'Validating',
  'Researching',
  'Scripting',
  'Thumbnailing',
  'Published',
];

export function normalizeContentPillar(rawCategory?: string | null): string {
  if (!rawCategory || !rawCategory.trim()) return CONTENT_PILLARS[0];
  const trimmed = rawCategory.trim();
  const lower = trimmed.toLowerCase();

  // Match exact or case-insensitive official pillar
  for (const pillar of CONTENT_PILLARS) {
    if (pillar.toLowerCase() === lower) {
      return pillar;
    }
  }

  // Mapping variasi lama/tidak baku ke 5 pilar resmi
  if (lower.includes('social media') || lower.includes('internet')) {
    return 'Internet & Social Media Culture';
  }
  if (lower.includes('technology') || lower.includes('ai') || lower.includes('tech')) {
    return 'AI & Technology Impact';
  }
  if (lower.includes('economy') || lower.includes('consumer') || lower.includes('creator')) {
    return 'Digital Economy & Creator Economy';
  }
  if (lower.includes('gaming') || lower.includes('entertainment') || lower.includes('game')) {
    return 'Gaming & Digital Entertainment';
  }
  if (
    lower.includes('modern life') ||
    lower.includes('human behavior') ||
    lower.includes('psychology') ||
    lower.includes('productivity') ||
    lower.includes('mental')
  ) {
    return 'Modern Life & Digital Psychology';
  }
  return trimmed;
}

export interface TitleRecommendationItem {
  id: string; // 'formula_1' .. 'formula_5'
  formulaName: string;
  title: string;
  wordCount: number;
  isMobileSafe: boolean;
  explanation: string;
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

export interface ZeinityHookFormula {
  id: string;
  name: string;
  label: string;
  isStarred: boolean;
  pattern: string;
}

export const ZEINITY_HOOK_FORMULAS: readonly ZeinityHookFormula[] = [
  {
    id: 'contradiction',
    name: 'Contradiction Hook',
    label: 'Contradiction Hook ⭐',
    isStarred: true,
    pattern: '“Harusnya X membuat Y. Masalahnya, yang terjadi malah Z. Kalau kita perhatikan... . Pertanyaannya, ... ?”',
  },
  {
    id: 'broken_assumption',
    name: 'Broken Assumption Hook',
    label: 'Broken Assumption Hook ⭐',
    isStarred: true,
    pattern: 'Mulai dari sesuatu yang selama ini dianggap normal, lalu tunjukkan kenapa asumsi itu tidak lengkap',
  },
  {
    id: 'function_drift',
    name: 'Function Drift Hook',
    label: 'Function Drift Hook ⭐',
    isStarred: true,
    pattern: '“Awalnya benda/sistem ini dibuat untuk A. Sekarang fungsinya sudah berubah... . Kalau kita perhatikan... . Pertanyaannya, ... ?”',
  },
  {
    id: 'evidence_first',
    name: 'Evidence-First Oddity',
    label: 'Evidence-First Oddity',
    isStarred: false,
    pattern: 'Buka dengan satu fakta/kasus konkret yang terasa aneh, lalu ajukan pertanyaan',
  },
  {
    id: 'hidden_incentive',
    name: 'Hidden Incentive Hook',
    label: 'Hidden Incentive Hook',
    isStarred: false,
    pattern: '“Kelihatannya ini cuma X. Tapi ada alasan lain kenapa sistemnya dibuat seperti ini.”',
  },
  {
    id: 'pattern',
    name: 'Pattern Hook',
    label: 'Pattern Hook',
    isStarred: false,
    pattern: 'Hubungkan 2–3 kejadian yang tampaknya terpisah dan tanyakan kenapa semuanya mengarah ke pola yang sama',
  },
] as const;

export interface HookRecommendationResult {
  hookId: string;
  hookName: string;
  reason: string;
}

export interface ContentItem {
  id: string;
  title: string;
  source: ContentSource;
  status: ContentStatus;
  category: string | null;
  research_text: string | null;
  research_brief_prompt?: string | null;
  external_research_output?: string | null;
  // Scripting Stage First-Class Fields
  script_hook_type?: string | null;
  script_hook_draft?: string | null;
  script_hook_notes?: string | null;
  script_outline?: string | null;
  script_target_duration?: string | null;
  script_target_words?: number | null;
  script_angle_notes?: string | null;
  script_production_track?: 'in_app' | 'external' | null;
  script_outline_approved?: boolean | null;
  scriptwriter_brief_prompt?: string | null;
  audit_spoken_prompt?: string | null;
  external_script_output?: string | null;
  generated_title_a?: string | null;
  generated_title_b?: string | null;
  generated_titles?: TitleRecommendationItem[] | null;
  generated_thumbnail_prompt?: string | null;
  thumbnail_mode?: 'prompt' | 'visual' | null;
  generated_thumbnail_visual?: string | null;
  target_platform?: string | null;
  /**
   * @deprecated Target publish date tidak lagi digunakan secara aktif di UI (metrik publikasi menggunakan published_at).
   * Dipertahankan opsional untuk kompatibilitas skema database.
   */
  target_publish_date?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  published_at?: string | null;
  ai_output?: string | null;
  telegram_message_id?: number | null;
  telegram_chat_id?: string | null;
  telegram_sender_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  file_path: string;
  file_type: string | null;
  extracted_text: string | null;
  created_at: string;
}

export type ViewKey =
  | 'overview'
  | 'ideas'
  | 'research'
  | 'scripts'
  | 'published'
  | 'files'
  | 'analytics'
  | 'settings'
  | 'trends'
  | 'rss';

export type AIProvider = 'gemini' | 'openrouter' | 'ollama' | 'custom';

export interface CallAIResult {
  text: string;
  usedProvider: AIProvider;
  usedModel: string;
  originalProvider: AIProvider;
  wasSwitched: boolean;
  switchReason?: string;
}

export interface LogEntry {
  message: string;
  timestamp: number;
  severity?: 'info' | 'warn' | 'error' | 'success';
}

export interface NineRouterModelItem {
  id: string;
  owned_by: string; // 'combo' | 'groq' | 'gemini' | 'openrouter' | 'ollama-local' | string
}

export interface NineRouterCatalog {
  combos: string[];
  directModels: Record<string, string[]>;
  allModels: string[];
}

export interface AlertDiagnostics {
  targetModel?: string;
  provider?: string;
  endpoint?: string;
  statusCode?: number | string;
  rootCause?: string;
  upstreamError?: string;
}

