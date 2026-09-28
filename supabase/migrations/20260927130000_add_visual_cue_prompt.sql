-- Migration: Add visual_cue_prompt to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS visual_cue_prompt text;
