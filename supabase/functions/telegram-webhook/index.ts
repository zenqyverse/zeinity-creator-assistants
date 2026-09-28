/**
 * Supabase Edge Function: Telegram Webhook Receiver (F-004)
 * 
 * Blueprint penerima webhook Telegram Bot yang aman dan siap pakai untuk Zeinity Content Pipeline.
 * 
 * Tanggung Jawab Keamanan & Fungsionalitas:
 * 1. Validasi header keamanan X-Telegram-Bot-Api-Secret-Token.
 * 2. Verifikasi whitelist pengirim (Allowed Chat/User IDs - F-005).
 * 3. Sanitasi teks pesan input (mencegah null bytes, control chars, dan payload berbahaya).
 * 4. Ekstraksi otomatis judul, pilar konten (5 pilar Zeinity), dan catatan ide.
 * 5. Penyimpanan metadata verifikasi (telegram_message_id, telegram_chat_id, telegram_sender_username - F-008).
 * 6. Respons konfirmasi otomatis ke pengguna Telegram via Bot API sendMessage.
 */

import { createClient } from '@supabase/supabase-js';

// Deno ambient type declaration untuk kompatibilitas lintas-runtime (Deno / Node / Vite)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?(handler: (req: Request) => Promise<Response> | Response): void;
} | undefined;

export const OFFICIAL_CONTENT_PILLARS = [
  'Internet & Social Media Culture',
  'AI & Technology Impact',
  'Digital Economy & Creator Economy',
  'Gaming & Digital Entertainment',
  'Modern Life & Digital Psychology',
] as const;

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number | string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

export interface ExtractedIdea {
  title: string;
  category: string;
  notes: string | null;
  telegram_message_id: number;
  telegram_chat_id: string;
  telegram_sender_username: string | null;
}

/**
 * Perbandingan string waktu-konstan untuk mencegah timing attack pada validasi token.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Escaping karakter khusus HTML untuk pesan balasan Telegram (parse_mode: 'HTML').
 * Mencegah error 400 Bad Request jika judul mengandung <, >, atau &.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validasi header rahasia Telegram Webhook (X-Telegram-Bot-Api-Secret-Token).
 * Jika token rahasia dikonfigurasi di environment, request wajib menyertakan token yang cocok.
 */
export function validateSecretToken(
  requestHeaderToken: string | null | undefined,
  configuredSecretToken: string | null | undefined
): { valid: boolean; reason?: string } {
  const secret = configuredSecretToken?.trim();
  // Jika secret tidak dikonfigurasi di environment, izinkan dengan peringatan keamanan
  if (!secret) {
    return { valid: true };
  }

  if (!requestHeaderToken) {
    return { valid: false, reason: 'Header X-Telegram-Bot-Api-Secret-Token tidak ditemukan.' };
  }

  const incoming = requestHeaderToken.trim();
  if (!constantTimeCompare(incoming, secret)) {
    return { valid: false, reason: 'Token rahasia webhook tidak valid atau tidak cocok.' };
  }

  return { valid: true };
}

/**
 * Parsing daftar ID yang diizinkan (string dipisahkan koma/titik-koma/baris baru) menjadi array string bersih.
 */
export function parseAllowedChatIds(rawAllowed?: string | null): string[] {
  if (!rawAllowed || typeof rawAllowed !== 'string') return [];
  return rawAllowed
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * F-005: Pengecekan whitelist pengirim sesuai daftar ID yang diizinkan.
 * Memeriksa chat.id, from.id, dan from.username.
 * Kebijakan keamanan: Jika whitelist dikonfigurasi, pengirim yang tidak terdaftar akan ditolak.
 */
export function isSenderAllowed(params: {
  chatId: string | number;
  senderId?: string | number | null;
  senderUsername?: string | null;
  allowedList: string[];
}): boolean {
  const { chatId, senderId, senderUsername, allowedList } = params;

  // Jika whitelist kosong, tolak secara default (anti-spam / zero-trust)
  if (!allowedList || allowedList.length === 0) {
    return false;
  }

  const normalizedAllowed = allowedList.map((id) => id.toLowerCase().replace(/^@/, ''));
  const targetChatId = String(chatId).trim().toLowerCase();
  const targetSenderId = senderId !== undefined && senderId !== null ? String(senderId).trim().toLowerCase() : '';
  const targetUsername = senderUsername ? senderUsername.trim().toLowerCase().replace(/^@/, '') : '';

  return normalizedAllowed.some((allowed) => {
    return (
      allowed === targetChatId ||
      (targetSenderId && allowed === targetSenderId) ||
      (targetUsername && allowed === targetUsername)
    );
  });
}

/**
 * Sanitasi teks pesan input dari Telegram:
 * - Menghapus null bytes (\0) dan karakter kontrol berbahaya.
 * - Menormalkan line break \r\n menjadi \n.
 * - Memangkas spasi berlebihan dan membatasi panjang maksimum teks (4.000 karakter).
 */
export function sanitizeTelegramText(rawText?: string | null, maxLength: number = 4000): string {
  if (!rawText || typeof rawText !== 'string') return '';

  return (
    rawText
      // Hapus null bytes
      .replace(/\0/g, '')
      // Hapus karakter kontrol ASCII non-printable (kecuali newline dan tab)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalisasi baris baru
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Batasi baris kosong beruntun maksimal 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, maxLength)
  );
}

/**
 * Deteksi otomatis pilar konten Zeinity dari hashtag atau kata kunci pesan.
 */
export function detectContentPillar(text: string): string {
  const lower = text.toLowerCase();

  if (
    lower.includes('#ai') ||
    lower.includes('#tech') ||
    lower.includes('#teknologi') ||
    lower.includes('artificial intelligence')
  ) {
    return 'AI & Technology Impact';
  }
  if (
    lower.includes('#economy') ||
    lower.includes('#ekonomi') ||
    lower.includes('#creator') ||
    lower.includes('#monetisasi') ||
    lower.includes('#bisnis')
  ) {
    return 'Digital Economy & Creator Economy';
  }
  if (
    lower.includes('#gaming') ||
    lower.includes('#game') ||
    lower.includes('#esports') ||
    lower.includes('#gamedev')
  ) {
    return 'Gaming & Digital Entertainment';
  }
  if (
    lower.includes('#psychology') ||
    lower.includes('#psikologi') ||
    lower.includes('#mental') ||
    lower.includes('#produktivitas') ||
    lower.includes('#lifestyle')
  ) {
    return 'Modern Life & Digital Psychology';
  }
  return 'Internet & Social Media Culture';
}

/**
 * Ekstraksi judul, pilar konten, dan catatan konteks dari pesan Telegram.
 */
export function extractIdeaFromTelegramMessage(message: TelegramMessage): ExtractedIdea | null {
  const rawText = message.text || message.caption;
  const sanitized = sanitizeTelegramText(rawText);

  if (!sanitized) {
    return null;
  }

  const lines = sanitized.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  // Baris pertama sebagai judul (dibatasi 1.000 karakter sesuai spesifikasi sanitasi backend)
  let rawTitle = lines[0];
  // Bersihkan hashtag dari judul baris pertama jika berada di awal
  rawTitle = rawTitle.replace(/^#\w+\s*/, '').trim();
  const title = rawTitle.length > 1000 ? `${rawTitle.slice(0, 997)}...` : rawTitle;

  const category = detectContentPillar(sanitized);

  // Sisa baris sebagai catatan konteks / riset awal
  const notes = lines.length > 1 ? lines.slice(1).join('\n') : sanitized;

  const senderUsername = message.from?.username || message.chat.username || null;
  const chatId = String(message.chat.id);

  return {
    title,
    category,
    notes,
    telegram_message_id: message.message_id,
    telegram_chat_id: chatId,
    telegram_sender_username: senderUsername,
  };
}

/**
 * Kirim pesan balasan konfirmasi ke pengguna Telegram via Bot API sendMessage.
 */
export async function sendTelegramReply(
  botToken: string,
  chatId: string | number,
  replyText: string,
  replyToMessageId?: number
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: replyText,
      parse_mode: 'HTML',
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('Gagal mengirim pesan balasan ke Telegram:', err);
    return false;
  }
}

/**
 * Penanganan Slash Commands Telegram (/start, /help, /pipeline, /latest, /pillars, /id).
 */
export async function handleTelegramSlashCommand(params: {
  text: string;
  botToken?: string;
  chatId: string | number;
  messageId?: number;
  senderId?: string | number | null;
  senderUsername?: string | null;
  supabase?: ReturnType<typeof createClient> | null;
  isAllowed: boolean;
}): Promise<{ handled: boolean; responseMessage?: string } | null> {
  const trimmed = params.text.trim();
  if (!trimmed.startsWith('/')) return null;

  // Ekstrak nama command (misal '/help@botname' -> 'help')
  const commandMatch = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+(.*))?$/s);
  if (!commandMatch) return null;

  const command = commandMatch[1].toLowerCase();
  const { botToken, chatId, messageId, senderId, senderUsername, supabase, isAllowed } = params;

  // 1. Perintah /id - Cek Chat ID & User ID (selalu aktif untuk onboarding/whitelist)
  if (command === 'id' || command === 'myid') {
    const idMsg = [
      '🆔 <b>Informasi Akun Telegram Anda:</b>',
      '',
      `• <b>Chat ID:</b> <code>${chatId}</code>`,
      `• <b>User ID:</b> <code>${senderId || chatId}</code>`,
      senderUsername ? `• <b>Username:</b> @${escapeHtml(senderUsername)}` : '',
      '',
      '<i>Salin Chat ID atau User ID di atas ke menu <b>Settings -> Allowed Chat IDs</b> di Web App Zeinity untuk mengamankan akses bot.</i>',
    ].filter(Boolean).join('\n');

    if (botToken) {
      await sendTelegramReply(botToken, chatId, idMsg, messageId);
    }
    return { handled: true, responseMessage: idMsg };
  }

  // 2. Perintah /start
  if (command === 'start') {
    const welcomeMsg = [
      '👋 <b>Selamat datang di Zeinity Creator Assistant!</b>',
      '',
      'Bot ini terhubung langsung ke pipeline riset & naskah Zeinity Executive Report.',
      '',
      '📝 <b>Format Cepat Kirim Ide:</b>',
      '• <b>Baris 1:</b> Judul Ide (opsional: tambahkan #gaming, #ai, #tech)',
      '• <b>Baris 2+:</b> Catatan konteks / riset awal',
      '',
      '⚡ <b>Menu Perintah Cepat:</b>',
      '• /pipeline - Cek ringkasan pipeline konten',
      '• /latest - Lihat 3 ide terbaru di dashboard',
      '• /pillars - Daftar 5 pilar resmi & hashtag',
      '• /id - Cek Chat ID & User ID Anda',
      '• /help - Bantuan & panduan lengkap',
    ].join('\n');

    if (botToken) {
      await sendTelegramReply(botToken, chatId, welcomeMsg, messageId);
    }
    return { handled: true, responseMessage: welcomeMsg };
  }

  // 3. Perintah /help atau /menu
  if (command === 'help' || command === 'menu') {
    const helpMsg = [
      '📋 <b>Menu Perintah Zeinity Creator Assistant:</b>',
      '',
      '• /pipeline - Ringkasan jumlah konten di setiap tahap pipeline',
      '• /latest - Menampilkan 3 ide konten terbaru yang masuk',
      '• /pillars - Daftar 5 pilar resmi konten Zeinity & panduan hashtag',
      '• /id - Cek Chat ID & User ID Telegram Anda (untuk whitelist)',
      '• /help - Menampilkan menu bantuan ini',
      '',
      '💡 <b>Tips Cepat:</b>',
      'Kirim pesan teks biasa untuk mencatat ide konten baru ke dashboard.',
      'Sertakan hashtag seperti <code>#gaming</code> atau <code>#ai</code> untuk otomatisasi kategori pilar.',
    ].join('\n');

    if (botToken) {
      await sendTelegramReply(botToken, chatId, helpMsg, messageId);
    }
    return { handled: true, responseMessage: helpMsg };
  }

  // Jika akun belum whitelisted, batasi akses perintah data internal
  if (!isAllowed) {
    const deniedMsg = '⚠️ <b>Akses Ditolak:</b> Akun Anda belum terdaftar di whitelist keamanan Zeinity. Ketik /id untuk melihat ID Anda dan daftarkan di Settings Web App.';
    if (botToken) {
      await sendTelegramReply(botToken, chatId, deniedMsg, messageId);
    }
    return { handled: true, responseMessage: deniedMsg };
  }

  // 4. Perintah /pillars
  if (command === 'pillars' || command === 'kategori' || command === 'pillar') {
    const pillarsMsg = [
      '📂 <b>5 Pilar Resmi Konten Zeinity:</b>',
      '',
      '1. 🌐 <b>Internet & Social Media Culture</b>',
      '   Hashtag: <code>#budaya</code>, <code>#sosmed</code>, <code>#internet</code>, <code>#viral</code>',
      '',
      '2. 🤖 <b>AI & Technology Impact</b>',
      '   Hashtag: <code>#ai</code>, <code>#tech</code>, <code>#teknologi</code>',
      '',
      '3. 💰 <b>Digital Economy & Creator Economy</b>',
      '   Hashtag: <code>#ekonomi</code>, <code>#bisnis</code>, <code>#creator</code>, <code>#monetisasi</code>',
      '',
      '4. 🎮 <b>Gaming & Digital Entertainment</b>',
      '   Hashtag: <code>#gaming</code>, <code>#game</code>, <code>#esports</code>',
      '',
      '5. 🧠 <b>Modern Life & Digital Psychology</b>',
      '   Hashtag: <code>#psikologi</code>, <code>#lifestyle</code>, <code>#produktivitas</code>',
      '',
      '💡 <i>Ketik hashtag di atas pada pesan ide Anda agar otomatis dikelompokkan!</i>',
    ].join('\n');

    if (botToken) {
      await sendTelegramReply(botToken, chatId, pillarsMsg, messageId);
    }
    return { handled: true, responseMessage: pillarsMsg };
  }

  // 5. Perintah /pipeline atau /status
  if (command === 'pipeline' || command === 'status') {
    let pipelineMsg = '📊 <b>Status Pipeline Zeinity:</b>\n\nDatabase belum terhubung.';
    if (supabase) {
      try {
        const { data, error } = await supabase.from('content').select('status');
        if (!error && data) {
          const counts: Record<string, number> = {};
          for (const item of data) {
            counts[item.status] = (counts[item.status] || 0) + 1;
          }
          pipelineMsg = [
            '📊 <b>Ringkasan Pipeline Konten Zeinity:</b>',
            '',
            `• Total Konten: <b>${data.length}</b>`,
            `💡 Idea: <b>${counts['Idea'] || 0}</b>`,
            `🔍 Researching: <b>${counts['Researching'] || 0}</b>`,
            `✍️ Scripting: <b>${counts['Scripting'] || 0}</b>`,
            `🎨 Thumbnailing: <b>${counts['Thumbnailing'] || 0}</b>`,
            `🚀 Published: <b>${counts['Published'] || 0}</b>`,
            '',
            '<i>Buka dashboard Web App untuk melanjutkan proses validasi & naskah.</i>',
          ].join('\n');
        }
      } catch (err) {
        pipelineMsg = `📊 Gagal mengambil ringkasan pipeline: ${String(err)}`;
      }
    }

    if (botToken) {
      await sendTelegramReply(botToken, chatId, pipelineMsg, messageId);
    }
    return { handled: true, responseMessage: pipelineMsg };
  }

  // 6. Perintah /latest atau /terbaru
  if (command === 'latest' || command === 'terbaru') {
    let latestMsg = '📌 Belum ada ide konten di dalam pipeline.';
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('content')
          .select('title, status, category, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data && data.length > 0) {
          const list = data.map((item, idx) => {
            const pillar = item.category ? item.category.split('&')[0].trim() : 'Umum';
            return `${idx + 1}. <b>${escapeHtml(item.title)}</b>\n   🏷️ <i>${item.status} • ${escapeHtml(pillar)}</i>`;
          }).join('\n\n');
          latestMsg = `📌 <b>3 Ide Konten Terbaru di Pipeline:</b>\n\n${list}\n\n<i>Buka dashboard untuk melihat seluruh ide.</i>`;
        }
      } catch (err) {
        latestMsg = `📌 Gagal mengambil data terbaru: ${String(err)}`;
      }
    }

    if (botToken) {
      await sendTelegramReply(botToken, chatId, latestMsg, messageId);
    }
    return { handled: true, responseMessage: latestMsg };
  }

  // Jika slash command tidak dikenali
  const unknownMsg = `❓ Perintah <code>/${escapeHtml(command)}</code> tidak dikenali.\n\nKetik /help untuk melihat daftar perintah yang tersedia.`;
  if (botToken) {
    await sendTelegramReply(botToken, chatId, unknownMsg, messageId);
  }
  return { handled: true, responseMessage: unknownMsg };
}

/**
 * Handler utama Supabase Edge Function Webhook.
 */
export async function handleWebhookRequest(
  req: Request,
  injectedDeps?: {
    supabaseClient?: ReturnType<typeof createClient>;
    secretToken?: string;
    allowedChatIds?: string;
    botToken?: string;
  }
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Ambil dependensi dari environment atau injeksi test
  const getEnv = (k: string) => {
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      return Deno.env.get(k);
    }
    return undefined;
  };

  const secretToken =
    injectedDeps?.secretToken ??
    getEnv('TELEGRAM_WEBHOOK_SECRET') ??
    getEnv('TELEGRAM_BOT_WEBHOOK_SECRET') ??
    getEnv('TELEGRAM_SECRET_TOKEN');

  const botToken =
    injectedDeps?.botToken ??
    getEnv('TELEGRAM_BOT_TOKEN');

  const supabaseUrl = getEnv('SUPABASE_URL') || '';
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

  const supabase =
    injectedDeps?.supabaseClient ??
    (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null);

  // 2. Validasi X-Telegram-Bot-Api-Secret-Token
  const incomingSecretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const secretValidation = validateSecretToken(incomingSecretHeader, secretToken);
  if (!secretValidation.valid) {
    return new Response(
      JSON.stringify({ ok: false, error: secretValidation.reason || 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Parse payload Telegram Update
  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch (parseErr) {
    return new Response(
      JSON.stringify({ ok: false, error: `Invalid JSON payload: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const message = update.message || update.channel_post || update.edited_message;
  if (!message || !message.chat) {
    // Abaikan update selain pesan atau tanpa objek chat dengan status 200 OK agar Telegram tidak mengirim ulang
    return new Response(
      JSON.stringify({ ok: true, status: 'ignored', reason: 'No valid message or chat payload in update' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Resolusi Whitelist Chat/User IDs (F-005)
  let allowedIdsString = injectedDeps?.allowedChatIds ?? getEnv('TELEGRAM_ALLOWED_CHAT_IDS');

  // Jika belum ada di env, coba baca dari tabel settings Supabase jika client aktif
  if (!allowedIdsString && supabase) {
    try {
      const { data: settingRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'telegram_allowed_chat_ids')
        .single();
      if (settingRow?.value) {
        allowedIdsString = settingRow.value;
      }
    } catch {
      // Abaikan error pembacaan settings
    }
  }

  const allowedList = parseAllowedChatIds(allowedIdsString);
  const senderId = message.from ? message.from.id : null;
  const chatId = message.chat.id;
  const senderUsername = message.from?.username || message.chat.username || null;

  // Verifikasi Whitelist Pengirim (Zero-Trust Security: hanya ID terdaftar yang diproses)
  const isAllowed = isSenderAllowed({
    chatId,
    senderId,
    senderUsername,
    allowedList,
  });

  const rawMsgText = (message.text || message.caption || '').trim();

  // 4a. Cek apakah pesan merupakan Slash Command (/start, /help, /pipeline, /latest, /pillars, /id)
  if (rawMsgText.startsWith('/')) {
    const cmdResult = await handleTelegramSlashCommand({
      text: rawMsgText,
      botToken,
      chatId,
      messageId: message.message_id,
      senderId,
      senderUsername,
      supabase,
      isAllowed,
    });

    if (cmdResult && cmdResult.handled) {
      return new Response(
        JSON.stringify({ ok: true, status: 'command_handled', response: cmdResult.responseMessage }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 4b. Jika bukan slash command, terapkan proteksi Whitelist Pengirim untuk ide konten biasa
  if (!isAllowed) {
    if (botToken) {
      const replyMsg = allowedList.length === 0
        ? '⚠️ <b>Akses Ditolak:</b> Whitelist keamanan bot belum dikonfigurasi di Settings Zeinity Web App. Hubungi administrator.'
        : '⚠️ <b>Akses Ditolak:</b> Akun atau grup Telegram ini belum terdaftar di whitelist keamanan Zeinity Content Pipeline. Hubungi administrator.';
      await sendTelegramReply(botToken, chatId, replyMsg, message.message_id);
    }

    // Berikan 200 OK ke Telegram agar tidak retry terus-menerus, tetapi tolak simpan ide
    return new Response(
      JSON.stringify({
        ok: false,
        status: 'forbidden',
        reason: allowedList.length === 0
          ? 'No allowed chat/user IDs configured in telegram_allowed_chat_ids whitelist (zero-trust default)'
          : `Sender ${senderId || chatId} (@${senderUsername || 'unknown'}) is not in telegram_allowed_chat_ids whitelist`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Sanitasi dan Ekstraksi Ide (F-008)
  const extracted = extractIdeaFromTelegramMessage(message);
  if (!extracted) {
    return new Response(
      JSON.stringify({ ok: true, status: 'ignored', reason: 'Message did not contain valid text content' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Simpan ide baru ke tabel content Supabase (dengan proteksi deduplikasi pesan Telegram)
  let insertedItem = null;
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('content')
        .select('id, title, status, telegram_message_id, telegram_chat_id')
        .eq('telegram_message_id', extracted.telegram_message_id)
        .eq('telegram_chat_id', extracted.telegram_chat_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            ok: true,
            status: 'already_processed',
            message: 'Pesan Telegram ini telah diproses sebelumnya',
            item: existing,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (checkErr) {
      console.warn('Pengecekan deduplikasi Supabase gagal, melanjutkan insert:', checkErr);
    }

    const { data, error: insertError } = await supabase
      .from('content')
      .insert({
        title: extracted.title,
        source: 'Telegram',
        status: 'Idea',
        category: extracted.category,
        research_text: extracted.notes,
        telegram_message_id: extracted.telegram_message_id,
        telegram_chat_id: extracted.telegram_chat_id,
        telegram_sender_username: extracted.telegram_sender_username,
        ai_output: `Diterima otomatis via Telegram Bot (@${extracted.telegram_sender_username || extracted.telegram_chat_id})`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Gagal menyimpan ide ke Supabase content table:', insertError);
      return new Response(
        JSON.stringify({ ok: false, error: `Database insert failed: ${insertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    insertedItem = data;
  }

  // 7. Kirim pesan notifikasi sukses ke Telegram jika Bot Token tersedia
  if (botToken) {
    const confirmationText = [
      '✅ <b>Ide berhasil dicatat ke pipeline Zeinity (Tahap: Idea)!</b>',
      '',
      `📌 <b>Judul:</b> ${escapeHtml(extracted.title)}`,
      `📂 <b>Pilar:</b> ${escapeHtml(extracted.category)}`,
      `🏷️ <b>Status:</b> Idea`,
      '',
      '<i>Buka Zeinity Executive Report Web App di dashboard untuk melanjutkan validasi AI dan riset draf.</i>',
    ].join('\n');

    await sendTelegramReply(botToken, chatId, confirmationText, message.message_id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Idea successfully captured from Telegram and queued in Zeinity pipeline',
      item: insertedItem || extracted,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// Inisialisasi Edge Function listener pada runtime Deno
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req) => handleWebhookRequest(req));
}
