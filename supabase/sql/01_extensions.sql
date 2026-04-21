-- Phase 1: Core campaign management (foundation)
--
-- Required extensions (enable first):
-- - pgvector: future embeddings (Phase 2+)
-- - pg_trgm: fuzzy text search / name matching
--
-- Note: pgcrypto is required for gen_random_uuid().

create extension if not exists "pgcrypto";
create extension if not exists "vector";
create extension if not exists "pg_trgm";
