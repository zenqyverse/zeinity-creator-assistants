/*
# Migration: Add Missing Scripting & Thumbnail Columns (Fase 3 - Sinkronisasi Skema)

Menambahkan 8 kolom yang sebelumnya hanya ada di localStorage dan state lokal React,
agar database remote Supabase menjadi sumber kebenaran yang lengkap dan sinkron.

## Kolom yang ditambahkan ke tabel `content`:

### Scripting Stage Columns
1. `script_target_duration` (text)        - Target durasi video, misal "8-12 Menit"
2. `script_target_words`   (integer)      - Target jumlah kata naskah (misal 1300, 1950)
3. `script_angle_notes`    (text)         - Catatan sudut pandang dan angle narasi kreatif
4. `script_production_track` (text)       - Jalur produksi: 'in_app' atau 'external'
5. `script_outline_approved` (boolean)    - Apakah outline telah di-approve oleh kreator (Human Gate)

### Thumbnail Stage Columns
6. `thumbnail_mode`              (text)   - Mode thumbnail: 'prompt' (teks) atau 'visual' (gambar AI)
7. `generated_thumbnail_visual`  (text)   - Output teks/URL dari thumbnail visual AI Canvas

### Titles Column
8. `generated_titles`  (jsonb)            - Array 5 rekomendasi judul formula Zeinity
                                            (JSON dari TitleRecommendationItem[])

## Catatan Keamanan & Kompatibilitas:
- Semua kolom ditambahkan dengan `ADD COLUMN IF NOT EXISTS` untuk idempoten (aman dijalankan ulang).
- Tidak ada kolom lama yang diubah atau dihapus (non-destructive migration).
- `generated_titles` disimpan sebagai JSONB agar bisa di-query dan di-index secara parsial.
- `script_production_track` dibatasi dengan CHECK constraint ke nilai yang valid.
- `thumbnail_mode` dibatasi dengan CHECK constraint ke nilai yang valid.
*/

-- ===========================================================================
-- 1. Scripting Stage: Target Durasi & Target Kata
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_target_duration text;

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_target_words integer;

-- ===========================================================================
-- 2. Scripting Stage: Catatan Angle & Jalur Produksi
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_angle_notes text;

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_production_track text
  CHECK (script_production_track IN ('in_app', 'external'));

-- ===========================================================================
-- 3. Scripting Stage: Flag Persetujuan Outline (Human Approval Gate)
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_outline_approved boolean DEFAULT false;

-- ===========================================================================
-- 4. Thumbnail Stage: Mode & Visual Output
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS thumbnail_mode text
  CHECK (thumbnail_mode IN ('prompt', 'visual'));

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS generated_thumbnail_visual text;

-- ===========================================================================
-- 5. Titles: Array 5 Formula Rekomendasi Judul (JSONB)
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS generated_titles jsonb;

-- ===========================================================================
-- Indexes tambahan untuk performa query
-- ===========================================================================
-- Index partial untuk konten yang outline-nya sudah disetujui
CREATE INDEX IF NOT EXISTS idx_content_outline_approved
  ON content(script_outline_approved)
  WHERE script_outline_approved = true;

-- Index untuk thumbnail_mode agar bisa filter per mode dengan cepat
CREATE INDEX IF NOT EXISTS idx_content_thumbnail_mode
  ON content(thumbnail_mode)
  WHERE thumbnail_mode IS NOT NULL;

-- Index GIN untuk generated_titles agar bisa di-query berdasarkan isi JSON
CREATE INDEX IF NOT EXISTS idx_content_generated_titles_gin
  ON content USING GIN (generated_titles)
  WHERE generated_titles IS NOT NULL;
