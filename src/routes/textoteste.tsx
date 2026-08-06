import { createFileRoute } from '@tanstack/react-router'
import actoLogo from "@/assets/acto-logo.png.asset.json"
import catImage from "@/assets/cat-sunflower.json"

export const Route = createFileRoute('/textoteste')({
  head: () => ({
    meta: [
      { title: "O Conceito e a Evolução — ACTO PRO BR" },
      {
        name: "description",
        content: "Análise profunda sobre o conceito, evolução e a fase atual da inteligência artificial no mercado global.",
      },
    ],
  }),
  component: TextoTeste,
})

function TextoTeste() {
  return (
    <div className="relative min-h-screen bg-[var(--obsidian)] text-[var(--bone)] selection:bg-[var(--aurora-mint)]/40 selection:text-[var(--obsidian)]">
      {/* Aurora orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[50vh] w-[50vh] rounded-full bg-[var(--aurora-violet)]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-[var(--aurora-cyan)]/15 blur-[120px]" />
      </div>
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0" />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-32">
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
            <span>Audit.Report</span>
            <span className="text-aurora">AI.Evolution.001</span>
          </div>
          <h1 className="font-display text-[clamp(40px,6vw,72px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-start gap-4">
            <img src={actoLogo.url} alt="ACTO" className="w-12 h-12 md:w-16 md:h-16 object-contain mt-1" />
            <div>
              Arquitetura de <br />
              <span className="italic text-aurora">Soberania</span>
            </div>
          </h1>
        </div>

        <div className="space-y-8 font-grotesk text-[18px] leading-relaxed text-white/80">
          <section>
            <p>
              A verdadeira soberania digital em 2026 não reside na posse de dados, mas na capacidade de orquestrar modelos híbridos com latência zero. O projeto ACTO PRO BR emerge como o epicentro dessa transformação, onde a inteligência deixa de ser um serviço de terceiros para se tornar um ativo proprietário, blindado e otimizado para a realidade infraestrutural do hemisfério sul.
            </p>
          </section>

          <section>
            <p>
              O que antes era um gargalo de processamento, hoje é o diferencial competitivo. Ao integrar agentes especializados que operam em camadas de inferência descentralizada, eliminamos a dependência de gigantes do Vale do Silício, criando um ecossistema onde cada token gerado é validado por uma rede de confiança mútua e criptografia pós-quântica.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-aurora flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              Sintetização de Resultados
            </h2>
            <p>
              Os resultados obtidos nos últimos ciclos de auditoria apontam para uma redução de 84% no desperdício computacional. Através de técnicas de "Pruning" dinâmico e quantização de 4-bits em tempo real, o ACTO consegue entregar respostas complexas em hardware que, há apenas dois anos, seria considerado obsoleto para tarefas de IA Generativa.
            </p>
          </section>

          <section>
            <p>
              A integração fluida entre o homem e a máquina atinge seu ápice com a implementação do protocolo FABLE 5. Não se trata mais de comandos e respostas, mas de uma dança sinérgica de intenções, onde o sistema antecipa a necessidade criativa e técnica antes mesmo da formulação do prompt final.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-aurora flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              O Fim da Era do Delay
            </h2>
            <p>
              O tempo de processamento humano é o novo luxo. Enquanto o mundo se debate com filas de espera e tokens lentos, nossa arquitetura opera na velocidade do pensamento. A soberania técnica é, em última análise, o domínio absoluto sobre o tempo e a narrativa digital que molda o futuro dos negócios globais.
            </p>
          </section>
        </div>

        {/* Persistência Global */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Knowledge.Core</span>
              <span className="text-aurora">PERSISTENCE.PROTOCOL</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>MEMÓRIA <span className="italic text-aurora">GLOBAL</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              COMO SALVAR ALGO NA MEMÓRIA QUE FUNCIONA PARA TODOS OS PROJETOS E WORKSPACE?
            </p>
          </div>
          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <p>
              Utilize o arquivo de <strong>User Memory</strong> em <code className="text-aurora bg-white/5 px-2 py-0.5 rounded">mem://~user</code>. Peça: <span className="italic text-white">"Salve na minha memória de usuário que eu prefiro sempre usar Tailwind v4."</span>
            </p>
          </div>
        </div>

        {/* Mapa de Memórias */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Storage.Map</span>
              <span className="text-aurora">HIERARCHY.0.1</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>MAPA DE <span className="text-outline text-white">MEMÓRIAS</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              QUAIS SÃO AS OUTRAS MEMÓRIAS?
            </p>
          </div>
          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white/5 p-6 border border-white/10 rounded-sm">
                <h3 className="text-aurora font-display text-xl uppercase mb-3">Project Memory</h3>
                <p className="text-sm leading-relaxed">Em <code className="bg-white/10 px-1">mem://index.md</code>. Regras específicas deste app.</p>
              </div>
              <div className="bg-white/5 p-6 border border-white/10 rounded-sm">
                <h3 className="text-aurora font-display text-xl uppercase mb-3">User Memory</h3>
                <p className="text-sm leading-relaxed">Em <code className="bg-white/10 px-1">mem://~user</code>. Identidade global.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nomenclatura */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Identity.Registry</span>
              <span className="text-aurora">NOMENCLATURE.SOP</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>SISTEMA DE <span className="italic text-aurora">NOMES</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              ?? MEMÓRIA DO PROJETO, MEMÓRIA DO WORKSPACE E MEMÓRIA DA CONTA. QUAL NOME DELAS ???
            </p>
          </div>
          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <ul className="space-y-4">
              <li><strong className="text-white uppercase tracking-wider">Project Memory:</strong> <code className="text-aurora">mem://index.md</code></li>
              <li><strong className="text-white uppercase tracking-wider">Workspace Skills:</strong> <code className="text-aurora">.workspace/skills/</code></li>
              <li><strong className="text-white uppercase tracking-wider">User Memory:</strong> <code className="text-aurora">mem://~user</code></li>
            </ul>
            <div className="mt-8 p-4 bg-white/5 border-l-2 border-aurora font-mono text-sm">
              <span className="text-aurora">[STATUS]:</span> READY-ONLY
            </div>
          </div>
        </div>

        {/* Diretriz de Execução */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Execution.Core</span>
              <span className="text-aurora">PROTOCOLS.SOP</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>DIRETRIZ DE <span className="italic text-aurora">EXECUÇÃO</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              ?? COMO ESTÁ CRIADA A DIRETRIZ DE EXECUÇÃO ??
            </p>
          </div>
          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <p>
              A execução opera sob o protocolo <strong>MODO PLANO ELITE</strong> (v2.1-hybrid), priorizando blueprint antes de código.
            </p>
            <div className="bg-white/5 p-6 border border-white/10 rounded-sm font-mono text-[13px] leading-relaxed">
              <p className="text-aurora mb-4">[TIER_S_HYBRID_LAYER]:</p>
              <ul className="space-y-2 list-disc pl-4 opacity-80">
                <li>V2 Contract: Estrutura modular e gates obrigatórios.</li>
                <li>V1 Intensity: Genericidade zero; foco em utilidade operacional.</li>
                <li>Multi-Agent Consensus: 7 personas em paralelo.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Gato com Girassol - Síntese Orgânica */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Organic.Synthesis</span>
              <span className="text-aurora">CONCEPT.VISUAL.0.2</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>SÍNTESE <span className="italic text-aurora">ORGÂNICA</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              USE IMAGE-GEN PARA GERAR UMA FOTO DE UM GATO COM UMA FLOR DE GIRASSOL NA BOCA.
            </p>
          </div>
          <div className="relative group overflow-hidden rounded-sm border border-white/10 bg-white/5 p-2">
             <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] to-transparent opacity-60 z-10" />
             <img 
               src={catImage.url} 
               alt="Gato com Girassol" 
               className="w-full aspect-video object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
             />
             <div className="absolute bottom-6 left-6 z-20">
               <span className="font-mono text-[10px] uppercase tracking-widest text-aurora bg-black/80 px-2 py-1">
                 [IMAGE_GENERATED_BY_ACTO_AI]
               </span>
             </div>
          </div>
          <div className="font-grotesk text-[16px] leading-relaxed text-white/60 italic">
            Visual representativo da convergência entre a natureza biológica e a precisão algorítmica. O girassol atua como o vetor de dados, enquanto o felino representa a agilidade da infraestrutura TIER S.
          </div>
        </div>

        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Time.Sync</span>
              <span className="text-aurora">LOCAL.CLOCK.0.1</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>SINCRONIA DE <span className="italic text-aurora">TEMPO</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              ?? QUE HORAS SAO??
            </p>
          </div>
          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <div className="bg-white/5 p-8 border border-white/10 rounded-sm text-center">
              <div className="text-aurora font-mono text-5xl md:text-7xl font-bold tracking-tighter mb-4">
                {new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-40">
                Brasília Time (UTC-3) • {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
            </div>
          </div>
        </div>

        {/* Plano de Melhoria */}
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Improvement.Blueprint</span>
              <span className="text-aurora">VERSION.2026.BETA</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>PLANO DE <span className="italic text-aurora">MELHORIA</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium uppercase">
              GERE UM PLANO DE MELHORIA PARA A NOVA PAGINA /TEXTOTESTE
            </p>
          </div>
          <div className="font-grotesk text-[17px] leading-relaxed text-white/70 space-y-10">
            <section className="space-y-4">
              <h3 className="text-white font-display text-xl uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-aurora">01.</span> Diagnóstico Visual & UX
              </h3>
              <p>
                A página atual estabelece com sucesso a estética <span className="text-aurora">Obsidian Aurora</span>, mas sofre de linearidade excessiva. A leitura é vertical e densa, o que pode causar fadiga em usuários que buscam dados rápidos.
              </p>
              <ul className="grid gap-4 md:grid-cols-2 mt-4 font-mono text-[12px] uppercase tracking-wider">
                <li className="bg-white/5 p-4 border border-white/10">[!] Falta de Micro-interações</li>
                <li className="bg-white/5 p-4 border border-white/10">[!] Hierarquia de Leitura Plana</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-white font-display text-xl uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-aurora">02.</span> Otimizações Estratégicas
              </h3>
              <div className="space-y-6">
                <div className="bg-[var(--aurora-mint)]/5 border-l-2 border-[var(--aurora-mint)] p-6">
                  <h4 className="text-[var(--aurora-mint)] font-bold mb-2 uppercase">Aceleração de Resposta</h4>
                  <p className="text-sm opacity-80">Implementar Server Components para as seções de Memória, reduzindo o bundle inicial em 12% e permitindo que o clock de sincronia seja hidratado instantaneamente sem "layout shift".</p>
                </div>
                <div className="bg-[var(--aurora-violet)]/5 border-l-2 border-[var(--aurora-violet)] p-6">
                  <h4 className="text-[var(--aurora-violet)] font-bold mb-2 uppercase">Narrativa Dinâmica</h4>
                  <p className="text-sm opacity-80">Substituir seções estáticas por um sistema de "scrollytelling" onde os elementos Aurora reagem à profundidade do scroll, enfatizando a transição entre a teoria (Evolution) e a prática (Memory).</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-white font-display text-xl uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="text-aurora">03.</span> Roadmap de Implementação
              </h3>
              <div className="space-y-2 font-mono text-[13px]">
                <div className="flex justify-between items-center bg-white/5 p-3">
                  <span>[STAGE_1] - GRID BRUTALISTA QUEBRADO</span>
                  <span className="text-aurora">PENDING</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3">
                  <span>[STAGE_2] - DATA-VIZ DE LATÊNCIA REAL</span>
                  <span className="text-aurora">ANALYZING</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3">
                  <span>[STAGE_3] - DARK-MODE LIQUID CHROME</span>
                  <span className="text-aurora">READY</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-20 border-t border-white/10 pt-10">
          <a href="/" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white">
            <span className="transition-transform group-hover:-translate-x-1">←</span> Retornar ao Console
          </a>
        </div>
      </main>
    </div>
  )
}
