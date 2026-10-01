/*
# Migration: Create rss_sources Table and RLS Policies
- Menyediakan tabel permanen untuk agregator feed RSS/Atom di Supabase Cloud.
- Menjamin sinkronisasi data antar perangkat (misal: localhost <-> Vercel production).
- Mengaktifkan RLS dengan hak penuh (SELECT, INSERT, UPDATE, DELETE) untuk role 'anon' dan 'authenticated'.
- Memasukkan 10 seed preset bawaan dengan 'ON CONFLICT (id) DO NOTHING' agar penghapusan oleh user tidak tertimpa kembali.
*/

CREATE TABLE IF NOT EXISTS rss_sources (
  id text PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'custom',
  pillar text NOT NULL DEFAULT 'AI & Technology Impact',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "anon_select_rss_sources" ON rss_sources;
DROP POLICY IF EXISTS "anon_insert_rss_sources" ON rss_sources;
DROP POLICY IF EXISTS "anon_update_rss_sources" ON rss_sources;
DROP POLICY IF EXISTS "anon_delete_rss_sources" ON rss_sources;

-- Grant SELECT, INSERT, UPDATE, DELETE to anon and authenticated
CREATE POLICY "anon_select_rss_sources" ON rss_sources FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "anon_insert_rss_sources" ON rss_sources FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_update_rss_sources" ON rss_sources FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_rss_sources" ON rss_sources FOR DELETE
  TO anon, authenticated USING (true);

-- Insert initial seed presets (will not overwrite if already deleted or modified)
INSERT INTO rss_sources (id, title, url, category, pillar, is_active)
VALUES
  ('preset-the-verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', 'media', 'AI & Technology Impact', true),
  ('preset-techcrunch', 'TechCrunch', 'https://techcrunch.com/feed/', 'media', 'Digital Economy & Creator Economy', true),
  ('preset-wired', 'Wired', 'https://www.wired.com/feed/rss', 'media', 'Modern Life & Digital Psychology', true),
  ('preset-ars-technica', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech', 'AI & Technology Impact', true),
  ('preset-mit-tech', 'MIT Technology Review', 'https://www.technologyreview.com/feed/', 'tech', 'AI & Technology Impact', true),
  ('preset-hacker-news', 'Hacker News', 'https://news.ycombinator.com/rss', 'forum', 'Internet & Social Media Culture', true),
  ('preset-reddit-tech', 'Reddit r/technology', 'https://www.reddit.com/r/technology/.rss', 'forum', 'AI & Technology Impact', true),
  ('preset-ign', 'IGN Gaming', 'https://feeds.feedburner.com/ign/all', 'media', 'Gaming & Digital Entertainment', true),
  ('preset-polygon', 'Polygon', 'https://www.polygon.com/rss/index.xml', 'media', 'Gaming & Digital Entertainment', true),
  ('preset-rest-of-world', 'Rest of World', 'https://restofworld.org/feed/', 'media', 'Modern Life & Digital Psychology', true)
ON CONFLICT (id) DO NOTHING;
