-- Trocar match_rag_chunks pra SECURITY INVOKER e restringir EXECUTE a service_role
drop function if exists public.match_rag_chunks(vector, integer);

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
security invoker
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

revoke all on function public.match_rag_chunks(vector, integer) from public, anon, authenticated;
grant execute on function public.match_rag_chunks(vector, integer) to service_role;