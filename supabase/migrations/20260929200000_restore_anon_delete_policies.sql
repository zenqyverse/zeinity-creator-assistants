/*
# Migration: Restore Anon Delete Policies (Fix Deletion in Single-User Studio)
- Mengembalikan hak DELETE untuk role 'anon' pada tabel 'content', 'settings', dan 'uploaded_files'.
- Zeinity Web App beroperasi sebagai local creator studio / single-tenant tanpa modul otentikasi login Supabase (seluruh operasi web browser berjalan sebagai role 'anon').
- Kebijakan sebelumnya di 20260928120000_secure_rls_policies.sql yang membatasi hak DELETE hanya untuk 'authenticated' menyebabkan operasi DELETE dari Web App ditolak secara senyap oleh PostgreSQL RLS (count: 0), sehingga data kembali muncul (resurrect) saat halaman direfresh.
*/

-- 1. Pulihkan hak DELETE pada tabel 'content'
DROP POLICY IF EXISTS "anon_delete_content" ON content;
DROP POLICY IF EXISTS "authenticated_delete_content" ON content;

CREATE POLICY "anon_delete_content" ON content FOR DELETE
  TO anon, authenticated USING (true);

-- 2. Pulihkan hak DELETE pada tabel 'settings'
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
DROP POLICY IF EXISTS "authenticated_delete_settings" ON settings;

CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- 3. Pulihkan hak DELETE pada tabel 'uploaded_files'
DROP POLICY IF EXISTS "anon_delete_files" ON uploaded_files;
DROP POLICY IF EXISTS "anon_delete_uploaded_files" ON uploaded_files;
DROP POLICY IF EXISTS "authenticated_delete_uploaded_files" ON uploaded_files;

CREATE POLICY "anon_delete_uploaded_files" ON uploaded_files FOR DELETE
  TO anon, authenticated USING (true);
