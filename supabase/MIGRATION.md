# Panduan Migrasi Database Zeinity

Dokumen ini menjelaskan cara menerapkan file migrasi SQL ke database remote Supabase Anda.

---

## Daftar Migrasi

| File | Tanggal | Deskripsi |
|---|---|---|
| `20260926150503_create_zeinity_schema.sql` | 2026-09-26 | Skema awal: tabel `content`, `settings`, `uploaded_files` + RLS |
| `20260927120000_add_audit_spoken_prompt.sql` | 2026-09-27 | Tambah kolom `audit_spoken_prompt` |
| `20260927130000_add_visual_cue_prompt.sql` | 2026-09-27 | Tambah kolom visual cue prompt |
| `20260928120000_secure_rls_policies.sql` | 2026-09-28 | Kebijakan RLS yang diperketat |
| `20260928130000_add_telegram_metadata_to_content.sql` | 2026-09-28 | Kolom metadata Telegram (`telegram_message_id`, `telegram_chat_id`, `telegram_sender_username`) |
| `20260929200000_restore_anon_delete_policies.sql` | 2026-09-29 | Pemulihan hak DELETE untuk role `anon` |
| **`20261001120000_add_scripting_and_thumbnail_columns.sql`** | **2026-10-01** | **8 kolom Scripting & Thumbnail yang sebelumnya hanya ada di localStorage** |

---

## Cara Menerapkan Migrasi (3 Metode)

### Metode 1: Supabase CLI (Direkomendasikan)

Jika Anda memiliki [Supabase CLI](https://supabase.com/docs/guides/cli) terinstal dan sudah login (`supabase login`):

```bash
# Pastikan Anda berada di direktori root proyek
cd zeinity-creator-assistants

# Tautkan proyek lokal ke proyek remote Supabase Anda
supabase link --project-ref <PROJECT_REF_ANDA>

# Terapkan semua migrasi yang belum diterapkan
supabase db push
```

### Metode 2: SQL Editor di Supabase Dashboard

1. Buka [https://app.supabase.com](https://app.supabase.com) dan masuk ke proyek Anda.
2. Navigasikan ke **SQL Editor** (ikon database di sidebar kiri).
3. Klik **New query**.
4. Salin isi file migrasi yang ingin diterapkan (lihat direktori `supabase/migrations/`).
5. Tempel ke editor SQL dan klik **Run** (atau tekan `Ctrl+Enter`).
6. Ulangi untuk setiap file migrasi yang belum diterapkan, **berurutan sesuai timestamp** dalam nama file.

> **Penting**: Terapkan migrasi secara berurutan sesuai urutan timestamp. Jangan melewati file migrasi.

### Metode 3: psql (PostgreSQL Client Langsung)

Jika Anda punya akses ke connection string Supabase (tersedia di **Project Settings → Database → Connection String**):

```bash
# Terapkan satu file migrasi
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20261001120000_add_scripting_and_thumbnail_columns.sql
```

---

## Migrasi Terbaru: 8 Kolom Scripting & Thumbnail

File: `20261001120000_add_scripting_and_thumbnail_columns.sql`

Migrasi ini menambahkan kolom-kolom yang sebelumnya **hanya tersimpan di `localStorage` browser** sehingga data tersebut hilang jika pengguna berganti perangkat atau menghapus data browser.

### Kolom yang Ditambahkan

| Kolom | Tipe | Nilai Default | Deskripsi |
|---|---|---|---|
| `script_target_duration` | `text` | `NULL` | Target durasi video, misal `"8-12 Menit (~1.300 - 1.950 kata)"` |
| `script_target_words` | `integer` | `NULL` | Target jumlah kata naskah (misal `1300`, `1950`) |
| `script_angle_notes` | `text` | `NULL` | Catatan sudut pandang & angle narasi kreatif kreator |
| `script_production_track` | `text` | `NULL` | Jalur produksi: `'in_app'` atau `'external'` |
| `script_outline_approved` | `boolean` | `false` | Apakah outline sudah di-approve oleh kreator (Human Gate) |
| `thumbnail_mode` | `text` | `NULL` | Mode thumbnail: `'prompt'` (teks AI) atau `'visual'` (gambar AI Canvas) |
| `generated_thumbnail_visual` | `text` | `NULL` | Output teks/URL thumbnail visual dari AI |
| `generated_titles` | `jsonb` | `NULL` | Array 5 formula rekomendasi judul Zeinity (`TitleRecommendationItem[]`) |

### Keamanan & Idempoten

- Semua perintah menggunakan `ADD COLUMN IF NOT EXISTS` — **aman dijalankan ulang** tanpa efek samping.
- Kolom `script_production_track` dan `thumbnail_mode` dilindungi `CHECK` constraint agar hanya menerima nilai yang valid.
- Tidak ada kolom lama yang diubah atau dihapus (migrasi non-destruktif).

---

## Verifikasi Setelah Migrasi

Jalankan query ini di SQL Editor untuk memverifikasi bahwa kolom telah berhasil ditambahkan:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'content'
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

Anda seharusnya melihat 8 baris sebagai hasil query di atas.
