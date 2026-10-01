import type { RSSItem, RSSSource } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase.ts';

export const PRESET_RSS_SOURCES: RSSSource[] = [
  {
    id: 'preset-the-verge',
    title: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'media',
    pillar: 'AI & Technology Impact',
    is_active: true,
  },
  {
    id: 'preset-techcrunch',
    title: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'media',
    pillar: 'Digital Economy & Creator Economy',
    is_active: true,
  },
  {
    id: 'preset-wired',
    title: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'media',
    pillar: 'Modern Life & Digital Psychology',
    is_active: true,
  },
  {
    id: 'preset-ars-technica',
    title: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'tech',
    pillar: 'AI & Technology Impact',
    is_active: true,
  },
  {
    id: 'preset-mit-tech',
    title: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    category: 'tech',
    pillar: 'AI & Technology Impact',
    is_active: true,
  },
  {
    id: 'preset-hacker-news',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    category: 'forum',
    pillar: 'Internet & Social Media Culture',
    is_active: true,
  },
  {
    id: 'preset-reddit-tech',
    title: 'Reddit r/technology',
    url: 'https://www.reddit.com/r/technology/.rss',
    category: 'forum',
    pillar: 'AI & Technology Impact',
    is_active: true,
  },
  {
    id: 'preset-ign',
    title: 'IGN Gaming',
    url: 'https://feeds.feedburner.com/ign/all',
    category: 'media',
    pillar: 'Gaming & Digital Entertainment',
    is_active: true,
  },
  {
    id: 'preset-polygon',
    title: 'Polygon',
    url: 'https://www.polygon.com/rss/index.xml',
    category: 'media',
    pillar: 'Gaming & Digital Entertainment',
    is_active: true,
  },
  {
    id: 'preset-rest-of-world',
    title: 'Rest of World',
    url: 'https://restofworld.org/feed/',
    category: 'media',
    pillar: 'Modern Life & Digital Psychology',
    is_active: true,
  },
];

const STORAGE_KEY_SOURCES = 'zeinity_rss_sources';
const STORAGE_KEY_READ_IDS = 'zeinity_rss_read_ids';
const STORAGE_KEY_BOOKMARKS = 'zeinity_rss_bookmarks';

// In-memory cache for parsed feeds (key: feed url, val: { items: RSSItem[], timestamp: number })
const feedCache = new Map<string, { items: RSSItem[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch raw XML string with hybrid CORS fallback pipeline:
 * 1. Direct fetch (fastest)
 * 2. allorigins proxy (https://api.allorigins.win/raw?url=)
 * 3. corsproxy.io (https://corsproxy.io/?url=)
 */
export async function fetchXmlWithCorsFallback(url: string, timeoutMs = 7000): Promise<string> {
  const tryFetchText = async (fetchUrl: string, curTimeout = timeoutMs): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), curTimeout);
    try {
      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // 1. Try In-App Proxy (Vite dev middleware or Vercel serverless /api/feed-proxy)
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const inAppProxyUrl = `/api/feed-proxy?url=${encodeURIComponent(url)}`;
      const inAppText = await tryFetchText(inAppProxyUrl, 4500);
      if (inAppText.includes('<rss') || inAppText.includes('<feed') || inAppText.includes('<?xml')) {
        return inAppText;
      }
    } catch {
      // In-app proxy not ready or running in standalone static environment, proceed to next
    }
  }

  // 2. Try Direct Fetch (fast 2.5s timeout for browser CORS fast-fail or direct access)
  try {
    return await tryFetchText(url, 2500);
  } catch {
    // Direct failed or blocked by browser CORS policy, proceed to proxy ladder
  }

  // 3. Try allorigins raw proxy
  try {
    const alloriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    return await tryFetchText(alloriginsUrl, 4000);
  } catch {
    // allorigins raw failed, proceed to next fallback
  }

  // 4. Try allorigins get JSON proxy (often circumvents raw rate-limits & handles cached base64)
  try {
    const alloriginsGetUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(alloriginsGetUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      let contents = json?.contents;
      if (typeof contents === 'string' && contents.trim()) {
        if (contents.startsWith('data:') && contents.includes('base64,')) {
          const b64 = contents.split('base64,')[1];
          if (typeof window !== 'undefined' && typeof window.atob === 'function') {
            const binString = window.atob(b64);
            const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0));
            contents = new TextDecoder('utf-8').decode(bytes);
          } else if (typeof Buffer !== 'undefined') {
            contents = Buffer.from(b64, 'base64').toString('utf-8');
          }
        }
        if (contents.includes('<rss') || contents.includes('<feed') || contents.includes('<?xml')) {
          return contents;
        }
      }
    }
  } catch {
    // allorigins get failed, proceed to next proxy
  }

  // 5. Try codetabs proxy
  try {
    const codetabsUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    const text = await tryFetchText(codetabsUrl, 4000);
    if (text.includes('<rss') || text.includes('<feed') || text.includes('<?xml')) {
      return text;
    }
  } catch {
    // codetabs failed, proceed to next
  }

  // 6. Try corsproxy.io as final candidate
  try {
    const corsProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    return await tryFetchText(corsProxyUrl, 3000);
  } catch (err) {
    throw new Error(
      `Gagal memuat feed dari ${url}. Seluruh proxy CORS atau koneksi langsung tidak dapat mengakses feed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Decodes all numeric (decimal and hex) and common named HTML entities.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strips HTML tags, unwraps CDATA, decodes entities, and truncates text.
 */
export function cleanSnippet(htmlContent: string, maxLength = 220): string {
  if (!htmlContent) return '';
  const noCdata = htmlContent.replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/gi, '');
  const textOnly = noCdata
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  const decoded = decodeHtmlEntities(textOnly).replace(/\s+/g, ' ').trim();
  if (decoded.length <= maxLength) return decoded;
  return decoded.slice(0, maxLength).trim() + '…';
}

function isTrackingPixel(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('feedburner.com/~r/') ||
    lower.includes('statcounter.com') ||
    lower.includes('tracking') ||
    lower.includes('tracker') ||
    lower.includes('1x1') ||
    lower.includes('pixel.gif') ||
    lower.includes('beacon')
  );
}

/**
 * Extracts thumbnail from item XML element (media:content, media:thumbnail, enclosure, or <img src>)
 */
function extractThumbnail(el: Element, description: string): string | undefined {
  // 1. media:content
  const mediaContent = [
    ...Array.from(el.getElementsByTagNameNS('*', 'content')),
    ...Array.from(el.getElementsByTagName('media:content')),
  ];
  for (let i = 0; i < mediaContent.length; i++) {
    const url = mediaContent[i].getAttribute('url');
    const medium = mediaContent[i].getAttribute('medium');
    const type = mediaContent[i].getAttribute('type');
    if (url && !isTrackingPixel(url)) {
      if (medium === 'image' || (!medium && (!type || type.startsWith('image/')))) {
        return url;
      }
    }
  }

  // 2. media:thumbnail
  const mediaThumbnail = [
    ...Array.from(el.getElementsByTagNameNS('*', 'thumbnail')),
    ...Array.from(el.getElementsByTagName('media:thumbnail')),
  ];
  for (let i = 0; i < mediaThumbnail.length; i++) {
    const url = mediaThumbnail[i].getAttribute('url');
    if (url && !isTrackingPixel(url)) return url;
  }

  // 3. enclosure
  const enclosures = el.getElementsByTagName('enclosure');
  for (let i = 0; i < enclosures.length; i++) {
    const type = enclosures[i].getAttribute('type');
    const url = enclosures[i].getAttribute('url');
    if (url && !isTrackingPixel(url) && (type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)/i.test(url))) {
      return url;
    }
  }

  // 4. Atom link enclosures (e.g. <link rel="enclosure" type="image/jpeg" href="..." />)
  if (typeof el.querySelectorAll === 'function') {
    const atomLinks = el.querySelectorAll('link[rel="enclosure"], link[rel="image"]');
    for (let i = 0; i < atomLinks.length; i++) {
      const href = atomLinks[i].getAttribute('href');
      const type = atomLinks[i].getAttribute('type');
      if (
        href &&
        !isTrackingPixel(href) &&
        (!type || type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)/i.test(href))
      ) {
        return href;
      }
    }
  }

  // 5. regex from description/content (decode HTML entities first, skipping 1x1 tracking pixels)
  const decodedDescription = decodeHtmlEntities(description);
  const imgTags = decodedDescription.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
  for (const imgTag of imgTags) {
    if (/width=["']?1["']?/i.test(imgTag) || /height=["']?1["']?/i.test(imgTag)) {
      continue;
    }
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1] && !isTrackingPixel(srcMatch[1])) {
      return srcMatch[1];
    }
  }

  return undefined;
}

/**
 * Parses RSS 2.0 or Atom XML string into RSSItem[].
 * Supports both DOMParser in browser and regex fallback in Node.js test environment.
 */
export function parseFeedXml(xmlString: string, source: RSSSource): RSSItem[] {
  if (!xmlString || typeof xmlString !== 'string') {
    return [];
  }

  const readSet = getReadItemIds();
  const bookmarkSet = new Set(getBookmarkedItems().map((b) => b.id));

  // Browser DOMParser path
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check parsing error
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Format feed XML tidak valid atau korup.');
    }

    const items: RSSItem[] = [];

    // Check RSS 2.0 (<item>)
    const rssItems = xmlDoc.querySelectorAll('channel > item, item');
    if (rssItems.length > 0) {
      rssItems.forEach((el, index) => {
        const rawTitle = el.querySelector('title')?.textContent?.trim() || 'Tanpa Judul';
        const title = decodeHtmlEntities(rawTitle);
        const link = el.querySelector('link')?.textContent?.trim() || '';
        const pubDateRaw =
          el.querySelector('pubDate')?.textContent?.trim() ||
          el.querySelector('date')?.textContent?.trim() ||
          '';
        
        let pubDate = '';
        if (pubDateRaw) {
          try {
            pubDate = new Date(pubDateRaw).toISOString();
          } catch {
            pubDate = pubDateRaw;
          }
        }

        const rawCreator =
          el.getElementsByTagNameNS('*', 'creator')[0]?.textContent?.trim() ||
          el.querySelector('author')?.textContent?.trim() ||
          '';
        const creator = decodeHtmlEntities(rawCreator);

        const rawDescription =
          el.getElementsByTagNameNS('*', 'encoded')[0]?.textContent ||
          el.querySelector('description')?.textContent ||
          '';

        const contentSnippet = cleanSnippet(rawDescription);
        const thumbnail = extractThumbnail(el, rawDescription);

        // Generate a consistent ID
        const safeId = `${source.id}-${link || title || index}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        items.push({
          id: safeId,
          source_id: source.id,
          source_name: source.title,
          title,
          link,
          pubDate: pubDate || new Date().toISOString(),
          author: creator || undefined,
          contentSnippet,
          thumbnail,
          pillar: source.pillar,
          isRead: readSet.has(safeId),
          isBookmarked: bookmarkSet.has(safeId),
        });
      });
      return items;
    }

    // Check Atom (<entry>)
    const atomEntries = xmlDoc.querySelectorAll('entry');
    if (atomEntries.length > 0) {
      atomEntries.forEach((el, index) => {
        const rawTitle = el.querySelector('title')?.textContent?.trim() || 'Tanpa Judul';
        const title = decodeHtmlEntities(rawTitle);
        
        // Link in atom can have attributes rel="alternate" or href
        let link = '';
        const linkEls = el.querySelectorAll('link');
        for (let i = 0; i < linkEls.length; i++) {
          const href = linkEls[i].getAttribute('href');
          const rel = linkEls[i].getAttribute('rel');
          if (href && (!rel || rel === 'alternate')) {
            link = href;
            break;
          }
        }
        if (!link && linkEls.length > 0) {
          link = linkEls[0].getAttribute('href') || '';
        }

        const publishedRaw =
          el.querySelector('published')?.textContent?.trim() ||
          el.querySelector('updated')?.textContent?.trim() ||
          '';

        let pubDate = '';
        if (publishedRaw) {
          try {
            pubDate = new Date(publishedRaw).toISOString();
          } catch {
            pubDate = publishedRaw;
          }
        }

        const rawAuthor = el.querySelector('author > name')?.textContent?.trim() || '';
        const author = decodeHtmlEntities(rawAuthor);

        // Prefer summary over unbounded full HTML content for clean excerpts
        const summaryText = el.querySelector('summary')?.textContent || '';
        const contentText = el.querySelector('content')?.textContent || '';
        const rawContent = summaryText || contentText;

        const contentSnippet = cleanSnippet(rawContent);
        const thumbnail = extractThumbnail(el, contentText || rawContent);

        const safeId = `${source.id}-${link || title || index}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        items.push({
          id: safeId,
          source_id: source.id,
          source_name: source.title,
          title,
          link,
          pubDate: pubDate || new Date().toISOString(),
          author: author || undefined,
          contentSnippet,
          thumbnail,
          pillar: source.pillar,
          isRead: readSet.has(safeId),
          isBookmarked: bookmarkSet.has(safeId),
        });
      });
      return items;
    }

    return items;
  }

  // Fallback regex parser for Node test / SSR environment
  const items: RSSItem[] = [];
  const isAtom = xmlString.includes('<feed') && xmlString.includes('<entry');
  if (isAtom) {
    const entryMatches = xmlString.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    entryMatches.forEach((block, index) => {
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = decodeHtmlEntities(titleMatch ? titleMatch[1].trim() : 'Tanpa Judul');

      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch ? linkMatch[1].trim() : '';

      const pubMatch = block.match(/<(?:published|updated)>([\s\S]*?)<\/(?:published|updated)>/i);
      let pubDate = new Date().toISOString();
      if (pubMatch) {
        try {
          pubDate = new Date(pubMatch[1].trim()).toISOString();
        } catch {
          pubDate = pubMatch[1].trim();
        }
      }

      const authorMatch = block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i);
      const author = authorMatch ? decodeHtmlEntities(authorMatch[1].trim()) : undefined;

      const summaryMatch = block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
      const contentMatch = block.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
      const rawContent = (summaryMatch ? summaryMatch[1] : (contentMatch ? contentMatch[1] : '')).trim();

      let thumbnail: string | undefined;
      const mediaContentMatch = block.match(/<(?:media:)?content[^>]+url=["']([^"']+)["']/i);
      const mediaThumbMatch = block.match(/<(?:media:)?thumbnail[^>]+url=["']([^"']+)["']/i);
      const linkEncMatch = block.match(/<link[^>]+(?:rel=["'](?:enclosure|image)["'][^>]+href=["']([^"']+)["']|href=["']([^"']+)["'][^>]+rel=["'](?:enclosure|image)["'])/i);
      if (mediaContentMatch && !isTrackingPixel(mediaContentMatch[1])) {
        thumbnail = mediaContentMatch[1];
      } else if (mediaThumbMatch && !isTrackingPixel(mediaThumbMatch[1])) {
        thumbnail = mediaThumbMatch[1];
      } else if (linkEncMatch) {
        const linkHref = linkEncMatch[1] || linkEncMatch[2];
        if (linkHref && !isTrackingPixel(linkHref)) thumbnail = linkHref;
      }

      if (!thumbnail) {
        const rawThumbAtom = decodeHtmlEntities(contentMatch ? contentMatch[1] : rawContent);
        const imgTags = rawThumbAtom.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
        for (const imgTag of imgTags) {
          if (/width=["']?1["']?/i.test(imgTag) || /height=["']?1["']?/i.test(imgTag)) continue;
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1] && !isTrackingPixel(srcMatch[1])) {
            thumbnail = srcMatch[1];
            break;
          }
        }
      }

      const safeId = `${source.id}-${link || title || index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      items.push({
        id: safeId,
        source_id: source.id,
        source_name: source.title,
        title,
        link,
        pubDate,
        author,
        contentSnippet: cleanSnippet(rawContent),
        thumbnail,
        pillar: source.pillar,
        isRead: readSet.has(safeId),
        isBookmarked: bookmarkSet.has(safeId),
      });
    });
    return items;
  } else {
    const itemMatches = xmlString.match(/<item[\s\S]*?<\/item>/gi) || [];
    itemMatches.forEach((block, index) => {
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = decodeHtmlEntities(titleMatch ? titleMatch[1].trim() : 'Tanpa Judul');

      const linkMatch = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : '';

      const pubMatch = block.match(/<(?:pubDate|date)>([\s\S]*?)<\/(?:pubDate|date)>/i);
      let pubDate = new Date().toISOString();
      if (pubMatch) {
        try {
          pubDate = new Date(pubMatch[1].trim()).toISOString();
        } catch {
          pubDate = pubMatch[1].trim();
        }
      }

      const creatorMatch = block.match(/<(?:dc:creator|author)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:dc:creator|author)>/i);
      const author = creatorMatch ? decodeHtmlEntities(creatorMatch[1].trim()) : undefined;

      const descMatch = block.match(/<(?:description|content:encoded)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|content:encoded)>/i);
      const rawDesc = descMatch ? descMatch[1].trim() : '';

      let thumbnail: string | undefined;
      const mediaContentMatch = block.match(/<(?:media:)?content[^>]+url=["']([^"']+)["']/i);
      const mediaThumbMatch = block.match(/<(?:media:)?thumbnail[^>]+url=["']([^"']+)["']/i);
      const encMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (mediaContentMatch && !isTrackingPixel(mediaContentMatch[1])) {
        thumbnail = mediaContentMatch[1];
      } else if (mediaThumbMatch && !isTrackingPixel(mediaThumbMatch[1])) {
        thumbnail = mediaThumbMatch[1];
      } else if (encMatch && !isTrackingPixel(encMatch[1])) {
        thumbnail = encMatch[1];
      }

      if (!thumbnail) {
        const rawThumbRss = decodeHtmlEntities(rawDesc);
        const imgTags = rawThumbRss.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
        for (const imgTag of imgTags) {
          if (/width=["']?1["']?/i.test(imgTag) || /height=["']?1["']?/i.test(imgTag)) continue;
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1] && !isTrackingPixel(srcMatch[1])) {
            thumbnail = srcMatch[1];
            break;
          }
        }
      }

      const safeId = `${source.id}-${link || title || index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      items.push({
        id: safeId,
        source_id: source.id,
        source_name: source.title,
        title,
        link,
        pubDate,
        author,
        contentSnippet: cleanSnippet(rawDesc),
        thumbnail,
        pillar: source.pillar,
        isRead: readSet.has(safeId),
        isBookmarked: bookmarkSet.has(safeId),
      });
    });
    return items;
  }
}

/**
 * Loads items from a single RSSSource, using cache unless forceRefresh is true.
 */
export async function loadSourceItems(source: RSSSource, forceRefresh = false): Promise<RSSItem[]> {
  const cached = feedCache.get(source.url);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const readSet = getReadItemIds();
    const bookmarkSet = new Set(getBookmarkedItems().map((b) => b.id));
    return cached.items.map((i) => ({
      ...i,
      isRead: readSet.has(i.id),
      isBookmarked: bookmarkSet.has(i.id),
    }));
  }

  const xmlText = await fetchXmlWithCorsFallback(source.url);
  const parsed = parseFeedXml(xmlText, source);
  feedCache.set(source.url, { items: parsed, timestamp: Date.now() });
  return parsed;
}

/**
 * Loads items from multiple sources in batches with graceful error handling per source.
 * Batches requests in chunks of 3 to avoid proxy rate-limiting and timeouts.
 */
export async function loadMultipleSourceItems(
  sources: RSSSource[],
  forceRefresh = false
): Promise<{ items: RSSItem[]; errors: Record<string, string> }> {
  const activeSources = sources.filter((s) => s.is_active);
  const allItems: RSSItem[] = [];
  const errors: Record<string, string> = {};

  const chunkSize = 3;
  for (let i = 0; i < activeSources.length; i += chunkSize) {
    const chunk = activeSources.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map(async (src) => {
        const items = await loadSourceItems(src, forceRefresh);
        return { sourceId: src.id, items };
      })
    );

    results.forEach((res, index) => {
      const src = chunk[index];
      if (res.status === 'fulfilled') {
        allItems.push(...res.value.items);
      } else {
        errors[src.id] = res.reason instanceof Error ? res.reason.message : String(res.reason);
      }
    });
  }

  // Sort by pubDate descending (latest first)
  allItems.sort((a, b) => {
    const timeA = new Date(a.pubDate).getTime() || 0;
    const timeB = new Date(b.pubDate).getTime() || 0;
    return timeB - timeA;
  });

  return { items: allItems, errors };
}

// ==================== RSS SOURCE PERSISTENCE ====================

/**
 * Retrieves list of RSS sources from Supabase or localStorage fallback.
 */
export async function getRssSources(): Promise<RSSSource[]> {
  // 1. Try Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('rss_sources')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const sources = data as RSSSource[];
        saveLocalSources(sources);
        return sources;
      }
    } catch {
      // Fallback to localStorage
    }
  }

  // 2. Try localStorage
  const local = getLocalSources();
  if (local.length > 0) {
    return local;
  }

  // 3. Fallback to default presets
  saveLocalSources(PRESET_RSS_SOURCES);
  return PRESET_RSS_SOURCES;
}

export function getLocalSources(): RSSSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOURCES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore local storage error
  }
  return [];
}

export function saveLocalSources(sources: RSSSource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(sources));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Adds a new custom RSS source.
 */
export async function addRssSource(
  source: Omit<RSSSource, 'id'>
): Promise<RSSSource> {
  const newSource: RSSSource = {
    ...source,
    id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  const current = getLocalSources().length > 0 ? getLocalSources() : [...PRESET_RSS_SOURCES];
  const updated = [newSource, ...current];
  saveLocalSources(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('rss_sources').insert([newSource]);
    } catch {
      // Ignore Supabase write errors in offline mode
    }
  }

  return newSource;
}

/**
 * Deletes an RSS source by ID.
 */
export async function deleteRssSource(id: string): Promise<void> {
  const current = getLocalSources().length > 0 ? getLocalSources() : [...PRESET_RSS_SOURCES];
  const updated = current.filter((s) => s.id !== id);
  saveLocalSources(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('rss_sources').delete().eq('id', id);
    } catch {
      // Ignore offline mode
    }
  }
}

/**
 * Toggles the is_active status of an RSS source.
 */
export async function toggleRssSourceActive(id: string, is_active: boolean): Promise<void> {
  const current = getLocalSources().length > 0 ? getLocalSources() : [...PRESET_RSS_SOURCES];
  const updated = current.map((s) => (s.id === id ? { ...s, is_active } : s));
  saveLocalSources(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('rss_sources').update({ is_active }).eq('id', id);
    } catch {
      // Ignore offline mode
    }
  }
}

/**
 * Updates all editable fields of an RSS source.
 */
export async function updateRssSource(
  id: string,
  patch: Pick<RSSSource, 'title' | 'url' | 'category' | 'pillar'>
): Promise<void> {
  const current = getLocalSources().length > 0 ? getLocalSources() : [...PRESET_RSS_SOURCES];
  const updated = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveLocalSources(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('rss_sources').update(patch).eq('id', id);
    } catch {
      // Ignore offline mode
    }
  }
}

// ==================== READ STATUS & BOOKMARKS ====================

export function getReadItemIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ_IDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // Ignore
  }
  return new Set();
}

export function markItemAsRead(id: string): void {
  const current = getReadItemIds();
  if (!current.has(id)) {
    current.add(id);
    try {
      // Cap at 1000 items to avoid quota overflow
      const arr = Array.from(current).slice(-1000);
      localStorage.setItem(STORAGE_KEY_READ_IDS, JSON.stringify(arr));
    } catch {
      // Ignore
    }
  }
}

export function isItemRead(id: string): boolean {
  return getReadItemIds().has(id);
}

export function getBookmarkedItems(): RSSItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

export function isItemBookmarked(id: string): boolean {
  const bookmarks = getBookmarkedItems();
  return bookmarks.some((b) => b.id === id);
}

export function toggleBookmarkItem(item: RSSItem): boolean {
  const bookmarks = getBookmarkedItems();
  const index = bookmarks.findIndex((b) => b.id === item.id);
  let isBookmarkedNow = false;

  if (index >= 0) {
    // Remove bookmark
    bookmarks.splice(index, 1);
    isBookmarkedNow = false;
  } else {
    // Add bookmark
    bookmarks.unshift({ ...item, isBookmarked: true });
    isBookmarkedNow = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  } catch {
    // Ignore quota
  }

  return isBookmarkedNow;
}
