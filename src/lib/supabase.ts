import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const rawAnonKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

export function isValidHttpUrl(str?: string | null): boolean {
  if (!str || typeof str !== 'string' || str.trim() === '') return false;
  const lower = str.trim().toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('your-project') ||
    lower.includes('your-anon') ||
    lower.includes('example.com')
  ) {
    return false;
  }
  try {
    const parsed = new URL(str.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isPlaceholderKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string' || key.trim() === '') return true;
  const lower = key.trim().toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('your-anon') ||
    lower.includes('your-key') ||
    lower.includes('your-project')
  );
}

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(rawUrl) && !isPlaceholderKey(rawAnonKey)
);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Konfigurasi Supabase tidak ditemukan atau belum lengkap (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Aplikasi berjalan dalam mode offline / cache lokal.'
  );
}

/**
 * F-017: Handler khusus (offlineFetch) untuk mengintersepsi network request saat Supabase tidak dikonfigurasi.
 * Mencegah pengiriman request sia-sia ke URL placeholder (misal https://placeholder-offline.supabase.co),
 * serta mengembalikan respon terstruktur dengan status 503 dan kode OFFLINE_MODE.
 */
export const offlineFetch: typeof fetch = async () => {
  return new Response(
    JSON.stringify({
      message: 'Supabase client is running in offline mode. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud synchronization.',
      code: 'OFFLINE_MODE',
      details: 'Network request blocked by offline handler (F-017).',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

/**
 * Factory untuk membuat SupabaseClient dengan penanganan mode offline yang aman.
 */
export function createSupabaseClient(
  configured: boolean,
  url?: string,
  key?: string
): SupabaseClient {
  const targetUrl = configured && url ? url.trim() : 'https://placeholder-offline.supabase.co';
  const targetKey = configured && key ? key.trim() : 'placeholder-offline-anon-key';

  const client = createClient(targetUrl, targetKey, {
    auth: {
      persistSession: configured,
      autoRefreshToken: configured,
      detectSessionInUrl: configured,
    },
    global: {
      fetch: !configured ? offlineFetch : undefined,
    },
  });

  if (!configured) {
    // Graceful offline channel mock: mencegah koneksi WebSocket ke placeholder domain
    const createOfflineChannel = (name: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channelObj: any = {
        name,
        topic: `realtime:${name}`,
        params: {},
        subTopic: name,
        state: 'closed',
        on: () => channelObj,
        subscribe: (cb?: (status: string) => void) => {
          if (typeof cb === 'function') {
            setTimeout(() => cb('CLOSED'), 0);
          }
          return channelObj;
        },
        unsubscribe: async () => 'ok',
        send: async () => 'ok',
      };
      return channelObj;
    };

    // Override realtime channel methods di instance offline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).channel = (name: string) => createOfflineChannel(name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).removeChannel = async () => 'ok';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).removeAllChannels = async () => [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).getChannels = () => [];
  }

  return client;
}

export const supabase: SupabaseClient = createSupabaseClient(isSupabaseConfigured, rawUrl, rawAnonKey);
