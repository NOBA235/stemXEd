-- ============================================================
--  RAG Knowledge Base — Supabase pgvector Schema
--  Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable the vector extension (only needs to run once per project)
create extension if not exists vector;

-- 2. Knowledge chunks table — stores embedded textbook content
create table if not exists public.knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),

  -- Subject + curriculum grouping
  subject       text not null check (subject in ('mathematics','physics','chemistry','biology')),
  curriculum    text not null,   -- 'NCERT' | 'CBSE' | 'IGCSE' | 'AP' | 'JEE' | 'IB'
  source_title  text not null,   -- e.g. 'NCERT Physics Class 11 Part 1'
  chapter       text,            -- e.g. 'Chapter 4: Laws of Motion'
  topic         text,            -- e.g. 'Newton Second Law'

  -- The actual text content of this chunk
  content       text not null,

  -- OpenAI text-embedding-3-small produces 1536-dim vectors
  embedding     vector(1536),

  -- Extra metadata (page number, difficulty level, etc.)
  metadata      jsonb default '{}',

  created_at    timestamptz default now()
);

-- 3. Fast approximate nearest-neighbour index
--    ivfflat is faster than exact search for large datasets
--    lists = sqrt(row_count) — start at 100, tune as you grow
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Standard indexes for filtering
create index if not exists knowledge_chunks_subject_idx    on public.knowledge_chunks(subject);
create index if not exists knowledge_chunks_curriculum_idx on public.knowledge_chunks(curriculum);

-- 4. Row Level Security
alter table public.knowledge_chunks enable row level security;

-- Anyone can READ chunks (they're educational content, not personal data)
create policy "Public read knowledge chunks"
  on public.knowledge_chunks for select
  using (true);

-- Only service role can INSERT/UPDATE/DELETE (ingestion script only)
create policy "Service role manages chunks"
  on public.knowledge_chunks for all
  using (auth.role() = 'service_role');

-- 5. Ingestion log — track what's been loaded (prevents duplicates)
create table if not exists public.ingestion_log (
  id           uuid primary key default gen_random_uuid(),
  source_title text not null unique,
  subject      text not null,
  curriculum   text not null,
  chunks_count int  not null default 0,
  ingested_at  timestamptz default now()
);

alter table public.ingestion_log enable row level security;
create policy "Service role manages ingestion log"
  on public.ingestion_log for all
  using (auth.role() = 'service_role');
create policy "Authenticated users can view ingestion log"
  on public.ingestion_log for select
  using (auth.role() = 'authenticated');

-- ============================================================
--  CORE SIMILARITY SEARCH FUNCTION
--  Called from your API route on every solve request
-- ============================================================
create or replace function match_knowledge_chunks(
  query_embedding  vector(1536),
  match_subject    text,
  match_curriculum text default null,   -- null = search all curricula
  match_count      int   default 5,
  match_threshold  float default 0.65   -- cosine similarity threshold (0-1)
)
returns table (
  id           uuid,
  content      text,
  source_title text,
  chapter      text,
  topic        text,
  curriculum   text,
  similarity   float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.content,
    kc.source_title,
    kc.chapter,
    kc.topic,
    kc.curriculum,
    -- Cosine similarity: 1 = identical, 0 = unrelated, -1 = opposite
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where
    kc.subject = match_subject
    and (match_curriculum is null or kc.curriculum = match_curriculum)
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding  -- ascending = most similar first
  limit match_count;
end;
$$;

-- ============================================================
--  ADMIN HELPER FUNCTIONS
-- ============================================================

-- Get stats about the knowledge base (used in admin UI)
create or replace function get_knowledge_base_stats()
returns table (
  subject       text,
  curriculum    text,
  source_title  text,
  chunk_count   bigint
)
language sql
as $$
  select
    subject,
    curriculum,
    source_title,
    count(*) as chunk_count
  from public.knowledge_chunks
  group by subject, curriculum, source_title
  order by subject, curriculum, source_title;
$$;

-- Delete all chunks for a specific source (to re-ingest an updated textbook)
create or replace function delete_source_chunks(p_source_title text)
returns int
language plpgsql security definer
as $$
declare
  deleted_count int;
begin
  delete from public.knowledge_chunks
  where source_title = p_source_title;
  get diagnostics deleted_count = row_count;
  delete from public.ingestion_log where source_title = p_source_title;
  return deleted_count;
end;
$$;
