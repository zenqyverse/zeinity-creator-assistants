import type { GoogleTrendItem, YouTubeTrendItem } from '@/types';
import { fetchXmlWithCorsFallback, decodeHtmlEntities } from './rssService.ts';

export interface YouTubeTrendError {
  code: 'NO_API_KEY' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: string;
}

// In-memory caching
const ytCache = new Map<string, { data: YouTubeTrendItem[]; timestamp: number }>();
const gtCache = new Map<string, { data: GoogleTrendItem[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const YOUTUBE_CATEGORIES = [
  { id: 'all', label: 'Semua Kategori' },
  { id: '28', label: '🔬 Sains & Teknologi' },
  { id: '20', label: '🎮 Video Game' },
  { id: '24', label: '🎬 Hiburan' },
  { id: '25', label: '📰 Berita & Politik' },
  { id: '27', label: '📚 Pendidikan' },
] as const;

export const TREND_REGIONS = [
  { code: 'ID', label: '🇮🇩 Indonesia (ID)' },
  { code: 'US', label: '🇺🇸 United States (US)' },
] as const;

/**
 * Gets configured YouTube API Key from env or localStorage override.
 */
export function getYouTubeApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_YOUTUBE_API_KEY) {
    return import.meta.env.VITE_YOUTUBE_API_KEY.trim();
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('zeinity_youtube_api_key');
    if (local && local.trim()) return local.trim();
  }
  return '';
}

/**
 * Saves a custom YouTube API key to localStorage.
 */
export function setYouTubeApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem('zeinity_youtube_api_key', key.trim());
    } else {
      localStorage.removeItem('zeinity_youtube_api_key');
    }
  }
}

/**
 * Fetches popular trending videos from YouTube Data API v3.
 */
export async function fetchYouTubeTrends(options: {
  regionCode?: string;
  categoryId?: string;
  forceRefresh?: boolean;
  apiKeyOverride?: string;
}): Promise<{ items: YouTubeTrendItem[]; error?: YouTubeTrendError }> {
  const region = options.regionCode || 'ID';
  const category = options.categoryId || 'all';
  const cacheKey = `yt_${region}_${category}`;

  if (!options.forceRefresh) {
    const cached = ytCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { items: cached.data };
    }
  }

  const apiKey = (options.apiKeyOverride || getYouTubeApiKey()).trim();
  if (!apiKey) {
    return {
      items: [],
      error: {
        code: 'NO_API_KEY',
        message: 'YouTube API Key belum dikonfigurasi.',
        details:
          'Tambahkan VITE_YOUTUBE_API_KEY di file .env atau masukkan API Key di panel pengaturan.',
      },
    };
  }

  try {
    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=24&key=${apiKey}`;
    if (category && category !== 'all') {
      url += `&videoCategoryId=${category}`;
    }

    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) {
      const errReason = json?.error?.errors?.[0]?.reason || '';
      const errMsg = json?.error?.message || `HTTP ${res.status}`;
      if (res.status === 403 && (errReason.includes('quota') || errMsg.toLowerCase().includes('quota'))) {
        return {
          items: [],
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Kuota harian YouTube Data API telah tercapai (10.000 unit/hari).',
            details: 'Kuota gratis akan direset otomatis setiap pukul 14:00 WIB oleh Google Cloud.',
          },
        };
      }
      return {
        items: [],
        error: {
          code: 'UNKNOWN_ERROR',
          message: `YouTube API Error: ${errMsg}`,
          details: errReason,
        },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: YouTubeTrendItem[] = (json.items || []).map((item: any) => {
      const thumbs = item.snippet?.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        '';

      return {
        id: item.id,
        title: decodeHtmlEntities(item.snippet?.title || 'Video Tanpa Judul'),
        channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || 'Channel Tidak Dikenal'),
        channelId: item.snippet?.channelId || '',
        publishedAt: item.snippet?.publishedAt || '',
        description: decodeHtmlEntities(item.snippet?.description || ''),
        thumbnailUrl,
        viewCount: Number(item.statistics?.viewCount || 0),
        likeCount: item.statistics?.likeCount ? Number(item.statistics.likeCount) : undefined,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      };
    });

    ytCache.set(cacheKey, { data: items, timestamp: Date.now() });
    return { items };
  } catch (err) {
    return {
      items: [],
      error: {
        code: 'NETWORK_ERROR',
        message: 'Gagal terhubung ke server YouTube Data API.',
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Parses Google Trends Daily RSS Feed.
 * Supports both DOMParser in browser and regex fallback in Node.js test environment.
 */
export function parseGoogleTrendsXml(xmlString: string, regionCode: string): GoogleTrendItem[] {
  if (!xmlString || typeof xmlString !== 'string') {
    return [];
  }

  // Browser DOMParser path
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    if (xmlDoc.querySelector('parsererror')) {
      throw new Error('Gagal memproses XML Google Trends.');
    }

    const items: GoogleTrendItem[] = [];
    const itemEls = xmlDoc.querySelectorAll('channel > item, item');

    itemEls.forEach((el, index) => {
      const rawTitle = el.querySelector('title')?.textContent?.trim() || '';
      const title = decodeHtmlEntities(rawTitle);
      if (!title) return;

      // Traffic count (e.g. "10000+", "50K+")
      const traffic =
        el.getElementsByTagNameNS('*', 'approx_traffic')[0]?.textContent?.trim() ||
        el.getElementsByTagName('ht:approx_traffic')[0]?.textContent?.trim() ||
        el.querySelector('approx_traffic')?.textContent?.trim() ||
        '';

      const pubDate = el.querySelector('pubDate')?.textContent?.trim() || '';

      // News item details (strip <b> keyword highlight tags from Google Trends RSS and decode entities)
      const rawNewsTitle =
        el.getElementsByTagNameNS('*', 'news_item_title')[0]?.textContent?.trim() ||
        el.getElementsByTagName('ht:news_item_title')[0]?.textContent?.trim() ||
        el.querySelector('news_item_title')?.textContent?.trim() ||
        '';
      const cleanNewsTitle = decodeHtmlEntities(
        rawNewsTitle.replace(/<[^>]+>/g, '').replace(/&lt;b&gt;|&lt;\/b&gt;/gi, '')
      ).trim();

      const rawNewsSource =
        el.getElementsByTagNameNS('*', 'news_item_source')[0]?.textContent?.trim() ||
        el.getElementsByTagName('ht:news_item_source')[0]?.textContent?.trim() ||
        el.querySelector('news_item_source')?.textContent?.trim() ||
        '';
      const cleanNewsSource = decodeHtmlEntities(rawNewsSource).trim();

      const newsUrl =
        el.getElementsByTagNameNS('*', 'news_item_url')[0]?.textContent?.trim() ||
        el.getElementsByTagName('ht:news_item_url')[0]?.textContent?.trim() ||
        el.querySelector('news_item_url')?.textContent?.trim() ||
        '';

      const picture =
        el.getElementsByTagNameNS('*', 'picture')[0]?.textContent?.trim() ||
        el.getElementsByTagName('ht:picture')[0]?.textContent?.trim() ||
        el.querySelector('picture')?.textContent?.trim() ||
        '';

      // Ensure trendUrl links to Google Trends Explore topic page rather than the raw RSS feed
      const rawLink = el.querySelector('link')?.textContent?.trim() || '';
      const isFeedUrl = !rawLink || rawLink.includes('/trending/rss') || rawLink.endsWith('.xml');
      const trendUrl = !isFeedUrl
        ? rawLink
        : `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=${regionCode}`;

      items.push({
        id: `gt-${regionCode}-${index}-${title.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        title,
        approxTraffic: traffic ? `${traffic} pencarian` : 'Sedang tren',
        pubDate,
        newsTitle: cleanNewsTitle || undefined,
        newsSource: cleanNewsSource || undefined,
        newsUrl: newsUrl || undefined,
        imageUrl: picture || undefined,
        trendUrl,
      });
    });

    return items;
  }

  // Fallback regex parser for Node test / SSR environment
  const items: GoogleTrendItem[] = [];
  const itemMatches = xmlString.match(/<item>[\s\S]*?<\/item>/gi) || [];

  itemMatches.forEach((block, index) => {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = decodeHtmlEntities(titleMatch ? titleMatch[1].trim() : '');
    if (!title) return;

    const trafficMatch = block.match(/<(?:ht:)?approx_traffic>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:ht:)?approx_traffic>/i);
    const traffic = trafficMatch ? trafficMatch[1].trim() : '';

    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

    const newsTitleMatch = block.match(/<(?:ht:)?news_item_title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:ht:)?news_item_title>/i);
    const rawNewsTitle = newsTitleMatch ? newsTitleMatch[1].trim() : '';
    const cleanNewsTitle = decodeHtmlEntities(
      rawNewsTitle.replace(/<[^>]+>/g, '').replace(/&lt;b&gt;|&lt;\/b&gt;/gi, '')
    ).trim();

    const newsSourceMatch = block.match(/<(?:ht:)?news_item_source>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:ht:)?news_item_source>/i);
    const rawNewsSource = newsSourceMatch ? newsSourceMatch[1].trim() : '';
    const cleanNewsSource = decodeHtmlEntities(rawNewsSource).trim();

    const newsUrlMatch = block.match(/<(?:ht:)?news_item_url>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:ht:)?news_item_url>/i);
    const newsUrl = newsUrlMatch ? newsUrlMatch[1].trim() : '';

    const picMatch = block.match(/<(?:ht:)?picture>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:ht:)?picture>/i);
    const picture = picMatch ? picMatch[1].trim() : '';

    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const rawLink = linkMatch ? linkMatch[1].trim() : '';
    const isFeedUrl = !rawLink || rawLink.includes('/trending/rss') || rawLink.endsWith('.xml');
    const trendUrl = !isFeedUrl
      ? rawLink
      : `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=${regionCode}`;

    items.push({
      id: `gt-${regionCode}-${index}-${title.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      title,
      approxTraffic: traffic ? `${traffic} pencarian` : 'Sedang tren',
      pubDate,
      newsTitle: cleanNewsTitle || undefined,
      newsSource: cleanNewsSource || undefined,
      newsUrl: newsUrl || undefined,
      imageUrl: picture || undefined,
      trendUrl,
    });
  });

  return items;
}

/**
 * Fetches Google Trends daily search trends via RSS.
 * Uses active endpoint (https://trends.google.com/trending/rss?geo=...).
 */
export async function fetchGoogleTrends(options: {
  regionCode?: string;
  forceRefresh?: boolean;
}): Promise<{ items: GoogleTrendItem[]; error?: string }> {
  const region = options.regionCode || 'ID';
  const cacheKey = `gt_${region}`;

  if (!options.forceRefresh) {
    const cached = gtCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { items: cached.data };
    }
  }

  const primaryUrl = `https://trends.google.com/trending/rss?geo=${region}`;

  try {
    const xmlText = await fetchXmlWithCorsFallback(primaryUrl);
    const items = parseGoogleTrendsXml(xmlText, region);
    gtCache.set(cacheKey, { data: items, timestamp: Date.now() });
    return { items };
  } catch (err) {
    return {
      items: [],
      error:
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data Google Trends. Pastikan koneksi internet aktif.',
    };
  }
}
