# Arsitektur & Spesifikasi Integrasi Telegram Bot (Zeinity Content Pipeline)

Dokumen ini mendokumentasikan spesifikasi arsitektur end-to-end integrasi Telegram Bot ke dalam Zeinity Executive Report Web App, mencakup fitur **F-004 (Edge Function Webhook Receiver)**, **F-005 (Pondasi Keamanan: Whitelist Chat/User ID)**, dan **F-008 (Metadata Verifikasi Asal Pesan & Penanda Visual UI)**.

---

## 1. Ikhtisar Arsitektur (High-Level Overview)

Sistem integrasi Telegram Bot dirancang untuk memungkinkan kreator dan tim editorial Zeinity menangkap ide konten secara instan dari chat Telegram (baik chat pribadi, grup tim, maupun channel), memvalidasi keabsahan pengirim secara otomatis, mensterilkan teks, mengklasifikasikannya ke dalam salah satu dari **5 Pilar Konten Resmi Zeinity**, dan meneruskannya ke tabel database `content` dengan status awal `Idea`.

```
┌────────────────────────┐
│  Telegram Client / App │
│  (Creator / Editorial) │
└───────────┬────────────┘
            │ 1. Kirim pesan ide (Teks / Catatan)
            ▼
┌────────────────────────┐
│  Telegram Bot API      │
│  (api.telegram.org)    │
└───────────┬────────────┘
            │ 2. Webhook Event HTTPS POST
            │    Header: X-Telegram-Bot-Api-Secret-Token
            ▼
┌────────────────────────────────────────────────────────┐
│  Supabase Edge Function (`telegram-webhook`)           │
│  - Layer 1: Validasi Secret Token                      │
│  - Layer 2: Verifikasi Whitelist Chat/User ID (F-005)  │
│  - Layer 3: Sanitasi Input (Null-byte & Control chars) │
│  - Layer 4: Ekstraksi Judul, Pilar & Metadata (F-008)  │
└───────────┬────────────────────────────────────────────┘
            │
            ├───────────────────────────┐
            │ 3. INSERT Content         │ 4. Konfirmasi Balasan
            ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│  Supabase PostgreSQL   │  │  Telegram Bot API      │
│  Tabel `content`       │  │  (sendMessage ke Chat) │
│  & Tabel `settings`    │  └────────────────────────┘
└───────────┬────────────┘
            │ Realtime DB Changes / Local Fetch
            ▼
┌────────────────────────────────────────────────────────┐
│  Zeinity Web App UI (React + TypeScript)               │
│  - Badge "Verified Bot" / "Otomatis" pada ContentTable │
│  - Identifikasi keabsahan asal pesan di Overview &     │
│    AddIdeaModal                                        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Komponen Sistem & Alur Data

### 2.1 Telegram Bot & Pengaturan Webhook
1. Bot didaftarkan melalui `@BotFather` untuk memperoleh token Bot API unik.
2. Webhook didaftarkan ke server Telegram menggunakan endpoint `setWebhook` dengan menyertakan rahasia keamanan:
   ```bash
   curl -F "url=https://<PROJECT-REF>.supabase.co/functions/v1/telegram-webhook" \
        -F "secret_token=<YOUR_SECURE_SECRET_TOKEN>" \
        https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
   ```

### 2.2 Supabase Edge Function Webhook Receiver (`project/supabase/functions/telegram-webhook/index.ts`)
Fungsi Edge berbasis Deno ini bertindak sebagai gerbang terdepan (API gateway) yang memproses setiap payload webhook masuk:
1. **Validasi Secret Token**: Memeriksa kesesuaian header `X-Telegram-Bot-Api-Secret-Token` dengan environment variable `TELEGRAM_BOT_WEBHOOK_SECRET`. Jika tidak sesuai, request langsung ditolak dengan status HTTP `401 Unauthorized`.
2. **Pengecekan Whitelist Pengirim (F-005)**:
   - Membaca konfigurasi `telegram_allowed_chat_ids` dari environment variable atau tabel database `settings`.
   - Mengurai ID chat, ID pengirim, dan username ke dalam daftar whitelist.
   - Jika pengirim tidak terdaftar dalam whitelist, Edge Function menolak menyimpan ide dan mengirimkan balasan peringatan akses ke chat pengguna Telegram.
3. **Sanitasi Teks Pesan**:
   - Menghilangkan null byte (`\0`) dan karakter kontrol non-printable.
   - Menormalkan line break (`\r\n` -> `\n`) dan membatasi panjang teks maksimal 4.000 karakter.
4. **Ekstraksi Cerdas & Klasifikasi Pilar Konten**:
   - Baris pertama diekstraksi sebagai judul draf ide (`title`, maks 140 karakter).
   - Baris selanjutnya disimpan sebagai catatan riset awal (`research_text`).
   - Sistem mendeteksi hashtag atau kata kunci topik untuk memetakan konten ke 5 pilar resmi Zeinity:
     - `#culture` / umum -> *Internet & Social Media Culture*
     - `#ai` / `#tech` -> *AI & Technology Impact*
     - `#economy` / `#creator` -> *Digital Economy & Creator Economy*
     - `#gaming` -> *Gaming & Digital Entertainment*
     - `#psychology` / `#mental` -> *Modern Life & Digital Psychology*
5. **Deduplikasi & Penyimpanan Metadata Verifikasi (F-008)**:
   - Memeriksa apakah pesan dengan kombinasi `telegram_message_id` dan `telegram_chat_id` sudah pernah tersimpan di tabel `content` untuk mencegah duplikasi saat webhook retry.
   - Jika belum ada, data disimpan ke tabel `content` dengan kolom tambahan:
     - `telegram_message_id`: ID pesan unik Telegram (digunakan untuk deduplikasi dan verifikasi).
     - `telegram_chat_id`: ID percakapan asal.
     - `telegram_sender_username`: Username Telegram pengirim (tanpa simbol `@`).
     - `source`: `'Telegram'`.
     - `status`: `'Idea'`.
6. **Notifikasi Balasan dengan HTML Escaping**:
   - Mengirimkan pesan konfirmasi terformat HTML ke Telegram pengguna dengan pengamanan `escapeHtml` pada judul dan pilar agar tidak menimbulkan error 400 Bad Request pada parser Telegram Bot API.

---

## 3. Fondasi Keamanan & Mitigasi Risiko

| Area Keamanan | Mekanisme & Solusi |
| :--- | :--- |
| **Palsifikasi Webhook (Spoofing)** | Header `X-Telegram-Bot-Api-Secret-Token` diverifikasi ketat dengan perbandingan waktu-konstan (`constantTimeCompare`) sebelum payload diproses. |
| **Spam & Injeksi Ide Publik (F-005)** | Whitelist `telegram_allowed_chat_ids` dikonfigurasi melalui halaman Settings dengan kebijakan zero-trust (whitelist kosong atau ID tak terdaftar otomatis ditolak). |
| **Eksfiltrasi Kunci Bot API (F-002, F-011)** | Token Telegram (`telegram_token`) disimpan strictly di `localStorage` peramban admin (`zeinity_secure_keys`) dan dilarang disimpan ke tabel database publik. |
| **Duplikasi Pesan / Webhook Retry** | Pengecekan idempotensi `(telegram_message_id, telegram_chat_id)` menggunakan indeks gabungan sebelum insert. |
| **Serangan Kontrol Karakter / DoS** | Input disanitasi dari null byte, karakter kontrol ASCII, dan dibatasi 4.000 karakter sebelum persistensi. |
| **HTML Entity Injection di Pesan Balasan** | Penggunaan fungsi `escapeHtml` pada seluruh variabel dinamis sebelum dikirim via `sendMessage` Telegram. |
| **Row Level Security (RLS)** | Tabel `content` dan `settings` dilindungi oleh RLS policy Supabase (F-006). |

---

## 4. Skema Database & Migrasi (F-008)

Migrasi database `project/supabase/migrations/20260928130000_add_telegram_metadata_to_content.sql` menambahkan kolom berikut ke tabel `content`:

```sql
-- Tambah kolom metadata telegram opsional
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_message_id bigint;
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_sender_username text;

-- Indeks untuk pencarian cepat & deduplikasi
CREATE INDEX IF NOT EXISTS idx_content_telegram_message_id ON content(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_content_telegram_chat_id ON content(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_content_telegram_msg_chat ON content(telegram_message_id, telegram_chat_id);
```

Tipe data TypeScript di `project/src/types.ts`:
```typescript
export interface ContentItem {
  // ... kolom standar
  telegram_message_id?: number | null;
  telegram_chat_id?: string | null;
  telegram_sender_username?: string | null;
}
```

---

## 5. Antarmuka Pengguna & Indikator Visual

1. **Badge "Verified Bot" di ContentTable, Overview, ScriptDetail, & PublishedDetail**:
   - Jika sebuah `ContentItem` memiliki `telegram_message_id`, UI menampilkan badge hijau berikon bot `[🤖 Verified Bot]` di samping label sumber `Telegram`.
   - Membedakan secara tegas antara ide yang diimpor otomatis dari bot terverifikasi vs ide yang diinput manual dengan pilihan sumber "Telegram".
2. **Modal Detail & Edit (AddIdeaModal)**:
   - Menampilkan banner hijau terverifikasi lengkap dengan nomor ID pesan dan username pengirim.
3. **Konfigurasi Whitelist di Halaman Settings (F-005)**:
   - Kartu Telegram Bot menyediakan input field `Allowed Chat/User IDs (Whitelist Keamanan)`.
   - Dilengkapi tooltip bantuan edukatif yang menjelaskan format ID terpisah koma dan mekanisme pencegahan spam.

---

## 6. Panduan Penerapan (Deployment Runbook)

### Langkah 1: Buat Bot di Telegram
1. Buka Telegram dan hubungi `@BotFather`.
2. Jalankan `/newbot`, masukkan nama bot (misal: `Zeinity Assistant Bot`), dan buat username (misal: `zeinity_pipeline_bot`).
3. Simpan Bot Token yang diberikan.

### Langkah 2: Deploy Supabase Edge Function
1. Buka terminal di direktori proyek:
   ```bash
   npx supabase functions deploy telegram-webhook --no-verify-jwt
   ```
2. Tetapkan secret environment di Supabase:
   ```bash
   npx supabase secrets set TELEGRAM_BOT_TOKEN="<BOT_TOKEN>" \
                            TELEGRAM_BOT_WEBHOOK_SECRET="<RANDOM_SECURE_TOKEN>" \
                            TELEGRAM_ALLOWED_CHAT_IDS="<YOUR_TELEGRAM_USER_ID>"
   ```

### Langkah 3: Daftarkan Webhook ke Telegram API
Kirimkan request `setWebhook`:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://<PROJECT-REF>.supabase.co/functions/v1/telegram-webhook",
       "secret_token": "<RANDOM_SECURE_TOKEN>"
     }'
```

### Langkah 4: Uji Coba Pengiriman Ide
1. Buka bot Anda di Telegram dan kirim pesan:
   ```text
   #ai Evaluasi Arsitektur Multi-Agent untuk Produksi Video
   Analisis komparasi efisiensi tim kreator menggunakan LLM o3-mini vs Claude 3.5 Sonnet dalam merancang hook naskah.
   ```
2. Bot akan membalas dengan konfirmasi penyimpanan.
3. Buka Zeinity Executive Report Web App: Ide akan muncul di `Content Pipeline` dengan label `Telegram` dan badge hijau `Verified Bot`.
