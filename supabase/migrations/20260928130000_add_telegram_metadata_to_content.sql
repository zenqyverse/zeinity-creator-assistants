-- Migration: Add Telegram metadata columns to content table (F-008)
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_message_id bigint;
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_sender_username text;

-- Indexes for querying and deduplicating incoming telegram messages
CREATE INDEX IF NOT EXISTS idx_content_telegram_message_id ON content(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_content_telegram_chat_id ON content(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_content_telegram_msg_chat ON content(telegram_message_id, telegram_chat_id);
