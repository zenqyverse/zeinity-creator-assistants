-- Migration: Add audit_spoken_prompt column to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS audit_spoken_prompt text;
