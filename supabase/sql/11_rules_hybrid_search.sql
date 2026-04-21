-- Phase 1 / Stage 2C: Hybrid search for SRD rules chunks (FTS + pgvector)

-- HNSW index for cosine similarity over embeddings
create index if not exists rules_chunks_embedding_idx
  on public.rules_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);


-- Replace old FTS-only function signature (Stage 2B)
drop function if exists public.search_rules_chunks(
  text,
  text,
  text,
  uuid,
  int,
  int
);


-- Hybrid search function: Reciprocal Rank Fusion over FTS + vector
create or replace function public.search_rules_chunks(
  query_text text,
  query_embedding vector(1536) default null,
  match_count int default 10
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
  with params as (
    select
      nullif(btrim(query_text), '') as q,
      query_embedding as qe
  ),
  fts_query as (
    select websearch_to_tsquery('english', q) as tsq
    from params
    where q is not null
  ),
  fts_base as (
    select
      rc.id,
      ts_rank(to_tsvector('english', rc.content), fts_query.tsq) as fts_rank
    from public.rules_chunks rc
    cross join fts_query
    where to_tsvector('english', rc.content) @@ fts_query.tsq
    order by fts_rank desc
    limit 40
  ),
  fts_results as (
    select
      id,
      row_number() over (order by fts_rank desc) as rank_position
    from fts_base
  ),
  vec_base as (
    select
      rc.id,
      (rc.embedding <=> params.qe) as distance
    from params
    join public.rules_chunks rc
      on params.qe is not null
      and rc.embedding is not null
    order by distance asc
    limit 40
  ),
  vec_results as (
    select
      id,
      row_number() over (order by distance asc) as rank_position
    from vec_base
  ),
  rrf as (
    select
      id,
      sum(score)::real as score
    from (
      select id, 1.0 / (60 + rank_position) as score from fts_results
      union all
      select id, 1.0 / (60 + rank_position) as score from vec_results
    ) s
    group by id
  )
  select
    rc.id,
    rc.content,
    rc.metadata,
    rrf.score as rank
  from rrf
  join public.rules_chunks rc on rc.id = rrf.id
  order by rrf.score desc
  limit greatest(match_count, 0);
$$;
