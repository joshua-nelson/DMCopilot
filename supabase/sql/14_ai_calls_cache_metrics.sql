ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS cache_read_input_tokens integer;
ALTER TABLE ai_calls ADD COLUMN IF NOT EXISTS cache_creation_input_tokens integer;
