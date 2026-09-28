/*
# Create Zeinity Creator Assistant schema

1. New Tables
- `content`: Stores content ideas with AI-generated metadata. Columns:
  - id (uuid, pk)
  - title (text, not null) - the idea title
  - source (text, not null) - 'Web' or 'Telegram'
  - status (text, not null, default 'Idea') - Idea, Validating, Researching, Scripting, Thumbnailing, Published
  - category (text) - content pillar category
  - research_text (text) - pasted/uploaded research context
  - research_brief_prompt (text) - AI prompt for research brief
  - external_research_output (text) - result from external research AI
  - script_outline (text) - script outline prompt
  - scriptwriter_brief_prompt (text) - prompt for scriptwriter AI
  - external_script_output (text) - draft script from external AI
  - generated_title_a (text) - AI Mode A title
  - generated_title_b (text) - AI Mode B title
  - generated_thumbnail_prompt (text) - AI thumbnail prompt
  - target_platform (text) - e.g. YouTube
  - target_publish_date (date) - planned publish date
  - views (bigint) - video view count
  - likes (bigint) - video like count
  - comments (bigint) - video comment count
  - published_at (timestamptz) - publish timestamp
  - ai_output (text) - summary of AI output for table display
  - created_at (timestamptz)
  - updated_at (timestamptz)
- `settings`: Key-value store for API keys and config. Columns:
  - id (uuid, pk)
  - key (text, unique, not null)
  - value (text)
  - created_at (timestamptz)
  - updated_at (timestamptz)
- `uploaded_files`: Stores references to uploaded reference files. Columns:
  - id (uuid, pk)
  - filename (text, not null)
  - file_path (text, not null)
  - file_type (text) - docx, csv, txt, md
  - extracted_text (text) - extracted content for AI context
  - created_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD (single-tenant, no-auth app, data is intentionally shared).
*/

-- 1. Table: content
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL DEFAULT 'Web',
  status text NOT NULL DEFAULT 'Idea',
  category text,
  research_text text,
  research_brief_prompt text,
  external_research_output text,
  script_outline text,
  scriptwriter_brief_prompt text,
  external_script_output text,
  generated_title_a text,
  generated_title_b text,
  generated_thumbnail_prompt text,
  target_platform text DEFAULT 'YouTube',
  target_publish_date date,
  views bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  published_at timestamptz,
  ai_output text DEFAULT '—',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_content" ON content;
CREATE POLICY "anon_select_content" ON content FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_content" ON content;
CREATE POLICY "anon_insert_content" ON content FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_content" ON content;
CREATE POLICY "anon_update_content" ON content FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_content" ON content;
CREATE POLICY "anon_delete_content" ON content FOR DELETE
  TO anon, authenticated USING (true);


-- 2. Table: settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);


-- 3. Table: uploaded_files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  extracted_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_files" ON uploaded_files;
CREATE POLICY "anon_select_files" ON uploaded_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_files" ON uploaded_files;
CREATE POLICY "anon_insert_files" ON uploaded_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_files" ON uploaded_files;
CREATE POLICY "anon_update_files" ON uploaded_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_files" ON uploaded_files;
CREATE POLICY "anon_delete_files" ON uploaded_files FOR DELETE
  TO anon, authenticated USING (true);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_source ON content(source);
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
