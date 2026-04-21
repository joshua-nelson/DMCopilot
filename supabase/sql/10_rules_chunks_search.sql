-- Phase 1 / Stage 2B: Full-text search for SRD rules chunks

-- Expression GIN index for FTS (minimal schema change; no extra columns)
create index if not exists rules_chunks_content_fts_gin_idx
  on public.rules_chunks
  using gin (to_tsvector('english', content));


-- Search function: web-style queries + ranking
create or replace function public.search_rules_chunks(
  q text,
  system_filter text default 'd&d5e',
  source_filter text default 'srd5.1',
  campaign_filter uuid default null,
  match_limit int default 20,
  match_offset int default 0
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  rank real
)
language sql
stable
as $$
  with query as (
    select websearch_to_tsquery('english', q) as tsq
  )
  select
    rc.id,
    rc.content,
    rc.metadata,
    ts_rank(to_tsvector('english', rc.content), query.tsq) as rank
  from public.rules_chunks rc
  cross join query
  where
    (system_filter is null or rc.system = system_filter)
    and (source_filter is null or rc.source = source_filter)
    and (
      (campaign_filter is null and rc.campaign_id is null)
      or (campaign_filter is not null and rc.campaign_id = campaign_filter)
    )
    and to_tsvector('english', rc.content) @@ query.tsq
  order by rank desc
  limit greatest(match_limit, 0)
  offset greatest(match_offset, 0);
$$;
