import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const bearerToken = Deno.env.get('X_BEARER_TOKEN');
  
  // If no token, return mock data
  if (!bearerToken) {
    return new Response(JSON.stringify({
      ok: true,
      source: "mock",
      mock: true,
      message: "API do X ainda não configurada. Exibindo notícias demonstrativas.",
      updated_at: new Date().toISOString(),
      items: [
        {
          id: "1",
          author_name: "VibeCoder",
          username: "vibecoder",
          text: "Just vibe-coded a new dashboard in minutes with Lovable.dev! #vibe #lovable",
          category: "Vibe Coding",
          likes: 120,
          reposts: 20,
          replies: 5,
          views: 1000
        },
        {
          id: "2",
          author_name: "Supabase Fan",
          username: "supabase_fan",
          text: "Lovable + Supabase integration is getting better. Fixing the auth bug now. #supabase #lovable",
          category: "Bugs",
          likes: 45,
          reposts: 5,
          replies: 10,
          views: 500
        }
      ]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Real implementation would go here using fetch with bearerToken
  return new Response(JSON.stringify({ ok: true, items: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
