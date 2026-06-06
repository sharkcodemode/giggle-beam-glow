-- pgvector
create extension if not exists vector;

-- =====================================================
-- TABELA: rag_documents
-- =====================================================
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  embedding_model text not null,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.rag_documents to anon, authenticated;
grant all on public.rag_documents to service_role;

alter table public.rag_documents enable row level security;

create policy "rag_documents_public_read"
  on public.rag_documents for select
  to public using (true);

-- =====================================================
-- TABELA: rag_chunks  (vector(3072) — compatível com gemini-embedding-001 e openai/text-embedding-3-large)
-- =====================================================
create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  idx integer not null,
  content text not null,
  embedding vector(3072) not null,
  created_at timestamptz not null default now()
);

grant select on public.rag_chunks to anon, authenticated;
grant all on public.rag_chunks to service_role;

alter table public.rag_chunks enable row level security;

create policy "rag_chunks_public_read"
  on public.rag_chunks for select
  to public using (true);

create index if not exists rag_chunks_document_idx on public.rag_chunks(document_id);

-- Nota: HNSW em pgvector tem limite de 2000 dims, então vector(3072) usa scan sequencial.
-- Pra escala pequena (centenas/poucos milhares de chunks) isso é fino.

-- =====================================================
-- TRIGGER updated_at
-- =====================================================
create or replace function public.rag_documents_touch()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rag_documents_touch on public.rag_documents;
create trigger rag_documents_touch
  before update on public.rag_documents
  for each row execute function public.rag_documents_touch();

-- =====================================================
-- FUNÇÃO: match_rag_chunks (similaridade cosseno)
-- =====================================================
create or replace function public.match_rag_chunks(
  query_embedding vector(3072),
  match_count integer default 5
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  idx integer,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    c.idx,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  order by c.embedding <=> query_embedding
  limit greatest(1, least(20, match_count));
$$;

grant execute on function public.match_rag_chunks(vector, integer) to anon, authenticated, service_role;