/*
# Migration: Add Script Hook Columns (Hook-First Pipeline)

Menambahkan 3 kolom untuk mendukung alur pembuatan naskah berbasis Hook Pembuka (Hook-First Pipeline)
pada tahapan penulisan naskah (Scripting Stage).

## Kolom yang ditambahkan ke tabel `content`:
1. `script_hook_type`  (text) - Varian formula Hook Zeinity yang dipilih (misal: "Contradiction Hook ⭐", "Broken Assumption Hook ⭐", dll.)
2. `script_hook_draft` (text) - Teks draf pembukaan narasi Hook 20–30 detik (~80–180 kata)
3. `script_hook_notes` (text) - Catatan atau arahan khusus untuk penulisan hook (opsional)

## Catatan:
- Menggunakan `ADD COLUMN IF NOT EXISTS` agar idempoten dan aman dijalankan ulang.
- Non-destructive migration (tidak memodifikasi atau menghapus data lama).
*/

-- ===========================================================================
-- 1. Scripting Stage: Hook-First Pipeline Columns
-- ===========================================================================
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_hook_type text;

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_hook_draft text;

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS script_hook_notes text;

-- ===========================================================================
-- 2. Index untuk performa filter atau analitik berdasarkan formula Hook
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_content_script_hook_type
  ON content(script_hook_type)
  WHERE script_hook_type IS NOT NULL;
