/*
# Migration: Secure RLS Policies (F-006)
- Menghapus policy DELETE publik (anon) pada tabel 'content', 'settings', dan 'uploaded_files'
  guna mencegah penghapusan data sepihak tanpa otentikasi (unauthorized data wipe / denial of service).
- Memberikan hak operasi DELETE secara eksklusif hanya untuk role 'authenticated' (atau service_role).
- Operasi SELECT, INSERT, dan UPDATE tetap dapat diakses oleh anon dan authenticated sesuai kebutuhan
  operasional aplikasi single-tenant / local-first workflow.
*/

-- 1. Pengamanan RLS Delete pada tabel 'content'
DROP POLICY IF EXISTS "anon_delete_content" ON content;
DROP POLICY IF EXISTS "authenticated_delete_content" ON content;

CREATE POLICY "authenticated_delete_content" ON content FOR DELETE
  TO authenticated USING (true);

-- 2. Pengamanan RLS Delete pada tabel 'settings'
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
DROP POLICY IF EXISTS "authenticated_delete_settings" ON settings;

CREATE POLICY "authenticated_delete_settings" ON settings FOR DELETE
  TO authenticated USING (true);

-- 3. Pengamanan RLS Delete pada tabel 'uploaded_files'
DROP POLICY IF EXISTS "anon_delete_files" ON uploaded_files;
DROP POLICY IF EXISTS "anon_delete_uploaded_files" ON uploaded_files;
DROP POLICY IF EXISTS "authenticated_delete_uploaded_files" ON uploaded_files;

CREATE POLICY "authenticated_delete_uploaded_files" ON uploaded_files FOR DELETE
  TO authenticated USING (true);
