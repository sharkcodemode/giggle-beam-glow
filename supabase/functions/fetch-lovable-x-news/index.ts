export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
          views: 1000,
          created_at: new Date().toISOString()
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
          views: 500,
          created_at: new Date().toISOString()
        },
        {
          id: "3",
          author_name: "NoCodeBR",
          username: "nocodebr",
          text: "Nova feature da Lovable lançada! Os agentes agora conseguem criar componentes complexos mais rápido.",
          category: "Novidades",
          likes: 340,
          reposts: 56,
          replies: 12,
          views: 5400,
          created_at: new Date().toISOString()
        },
        {
          id: "4",
          author_name: "LovableWatch",
          username: "lovablewatch",
          text: "Comparing Claude 3.5 Sonnet vs GPT-4o on Lovable projects. Results are surprising! #AI #coding",
          category: "IA",
          likes: 89,
          reposts: 12,
          replies: 20,
          views: 2100,
          created_at: new Date().toISOString()
        },
        {
          id: "5",
          author_name: "DevRadar",
          username: "devradar",
          text: "O roadmap da Lovable para o Q3 parece matador. Fiquem de olho nas atualizações de deploy.",
          category: "Atualizações",
          likes: 156,
          reposts: 34,
          replies: 8,
          views: 3200,
          created_at: new Date().toISOString()
        },
        {
          id: "6",
          author_name: "StartupBuilder",
          username: "startupbuilder",
          text: "Deployment fixed on my Lovable project. Support team was quick to help! #deployment #lovable",
          category: "Deploy",
          likes: 67,
          reposts: 8,
          replies: 3,
          views: 1200,
          created_at: new Date().toISOString()
        },
        {
          id: "7",
          author_name: "CommunityMember",
          username: "community",
          text: "What do you think about the new Obsidian theme on Lovable? I'm loving the vibe.",
          category: "Discussões",
          likes: 45,
          reposts: 3,
          replies: 15,
          views: 800,
          created_at: new Date().toISOString()
        },
        {
          id: "8",
          author_name: "ProCoder",
          username: "procoder",
          text: "Integrating Stripe with Lovable was a breeze. Highly recommended for SaaS projects.",
          category: "Comunidade",
          likes: 210,
          reposts: 45,
          replies: 7,
          views: 4500,
          created_at: new Date().toISOString()
        }
      ]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20');
    const query = new URL(req.url).searchParams.get('query') || '("lovable.dev" OR "Lovable AI" OR "Lovable app" OR "Lovable no-code" OR "vibe coding" OR "AI coding" OR "Lovable builder")';

    // Real API call would go here
    // For now, if token is set, we return an empty array to show it's working but needs real query logic
    return new Response(JSON.stringify({
      ok: true,
      source: "x",
      mock: false,
      updated_at: new Date().toISOString(),
      items: []
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
