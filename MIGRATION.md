# MIGRATION GUIDE

## Migration: Add Missing Scripting & Thumbnail Columns
**File:** `supabase/migrations/20261001120000_add_scripting_and_thumbnail_columns.sql`  
**Fase:** 3 — Sinkronisasi Skema Database Remote  
**Tabel yang diubah:** `content`

---

## Ringkasan

Migration ini menambahkan **8 kolom baru** ke tabel `content` di Supabase remote. Kolom-kolom ini sebelumnya hanya hidup di `localStorage` dan state lokal React. Setelah migration ini, database remote menjadi sumber kebenaran (*single source of truth*) yang lengkap dan sinkron.

### Kolom yang Ditambahkan

| # | Kolom | Tipe | Keterangan |
|---|-------|------|------------|
| 1 | `script_target_duration` | `text` | Target durasi video, misal `"8-12 Menit"` |
| 2 | `script_target_words` | `integer` | Target jumlah kata naskah (misal 1300, 1950) |
| 3 | `script_angle_notes` | `text` | Catatan sudut pandang dan angle narasi kreatif |
| 4 | `script_production_track` | `text` | Jalur produksi: `'in_app'` atau `'external'` |
| 5 | `script_outline_approved` | `boolean` | Apakah outline telah di-approve (Human Gate) |
| 6 | `thumbnail_mode` | `text` | Mode thumbnail: `'prompt'` atau `'visual'` |
| 7 | `generated_thumbnail_visual` | `text` | Output teks/URL dari thumbnail visual AI Canvas |
| 8 | `generated_titles` | `jsonb` | Array 5 rekomendasi judul formula Zeinity |

> **Catatan keamanan:** Semua kolom menggunakan `ADD COLUMN IF NOT EXISTS` — migration ini **idempoten** dan aman dijalankan ulang tanpa risiko error. Tidak ada kolom lama yang diubah atau dihapus (*non-destructive*).

---

## Metode Menjalankan Migration

### Metode 1 — Supabase CLI (Direkomendasikan)

Pastikan Supabase CLI sudah terinstall dan sudah login (`supabase login`).

```bash
# Dari root proyek
supabase db push
```

Supabase CLI akan otomatis mendeteksi file migration yang belum diterapkan di remote dan menjalankannya secara berurutan.

**Prasyarat:**
- `supabase` CLI terinstall (`npm install -g supabase` atau [lihat dokumentasi](https://supabase.com/docs/guides/cli))
- Sudah menjalankan `supabase login`
- Variabel `SUPABASE_PROJECT_REF` atau konfigurasi di `supabase/config.toml` sudah benar

---

### Metode 2 — Supabase Dashboard SQL Editor

1. Buka **Supabase Dashboard** → pilih project Anda
2. Navigasi ke **SQL Editor** (ikon database di sidebar kiri)
3. Klik **+ New query**
4. Buka file migration berikut dan salin seluruh isinya:
   ```
   supabase/migrations/20261001120000_add_scripting_and_thumbnail_columns.sql
   ```
5. Tempelkan (*paste*) ke SQL Editor
6. Klik tombol **Run** (atau tekan `Ctrl+Enter` / `Cmd+Enter`)
7. Pastikan output menampilkan `Success. No rows returned.`

---

### Metode 3 — psql Langsung ke Connection String Supabase

Dapatkan **Connection String (URI)** dari: Supabase Dashboard → **Project Settings** → **Database** → **Connection string** → pilih tab **URI**.

```bash
# Ganti <YOUR_CONNECTION_STRING> dengan URI dari dashboard
psql "<YOUR_CONNECTION_STRING>" \
  -f supabase/migrations/20261001120000_add_scripting_and_thumbnail_columns.sql
```

Contoh URI Supabase:
```
postgresql://postgres:[YOUR-PASSWORD]@db.<PROJECT-REF>.supabase.co:5432/postgres
```

---

## Verifikasi: Cek 8 Kolom Sudah Berhasil Ditambahkan

Jalankan query SQL berikut di **Supabase SQL Editor** atau via `psql` untuk memverifikasi bahwa semua 8 kolom sudah ada di tabel `content`:

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name  = 'content'
  AND column_name IN (
    'script_target_duration',
    'script_target_words',
    'script_angle_notes',
    'script_production_track',
    'script_outline_approved',
    'thumbnail_mode',
    'generated_thumbnail_visual',
    'generated_titles'
  )
ORDER BY column_name;
```

**Output yang diharapkan:** 8 baris — satu untuk setiap kolom yang baru ditambahkan.

### Verifikasi Indexes

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE
  tablename = 'content'
  AND indexname IN (
    'idx_content_outline_approved',
    'idx_content_thumbnail_mode',
    'idx_content_generated_titles_gin'
  );
```

**Output yang diharapkan:** 3 baris — satu untuk setiap index yang dibuat oleh migration.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `column already exists` | Migration sudah pernah dijalankan — aman diabaikan karena `IF NOT EXISTS` |
| `relation "content" does not exist` | Tabel `content` belum ada — pastikan migration awal sudah dijalankan terlebih dahulu |
| `check constraint violation` | Nilai yang dimasukkan tidak sesuai: `script_production_track` hanya menerima `'in_app'` atau `'external'`; `thumbnail_mode` hanya menerima `'prompt'` atau `'visual'` |
| `permission denied` | Pastikan menggunakan role `postgres` atau role dengan privilege `ALTER TABLE` |
