import { createFileRoute } from '@tanstack/react-router'
import actoLogo from "@/assets/acto-logo.png.asset.json"

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

        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Report.Internal</span>
              <span className="text-aurora">REV.2026.X</span>
            </div>
            <h2 className="font-display text-[clamp(40px,6vw,72px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-4">
              <img src={actoLogo.url} alt="" className="w-10 h-10 md:w-12 md:h-12 object-contain" aria-hidden="true" />
              <span>REVOLUÇÃO <span className="text-outline text-white">2026</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium">
              A CONTA DA IA NAO TA FECHANDO...
            </p>
          </div>

          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <p>
              O custo operacional das arquiteturas de larga escala atingiu um ponto de inflexão crítico. Entre o consumo energético massivo e a escassez de silício premium, o mercado começa a questionar a sustentabilidade do modelo de "crescimento a qualquer custo". 
            </p>
            <p>
              A eficiência energética e a destilação de modelos tornaram-se os novos pilares da sobrevivência digital. Em 2026, a inteligência não será medida apenas pela capacidade de processamento, mas pela precisão econômica de cada token gerado.
            </p>
          </div>
        </div>
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>Insight.Current</span>
              <span className="text-aurora">AGO.2026.STATE</span>
            </div>
            <h2 className="font-display text-[clamp(32px,5vw,60px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-4">
              <img src={actoLogo.url} alt="" className="w-8 h-8 md:w-10 md:h-10 object-contain" aria-hidden="true" />
              <span>A IA NA <span className="italic text-aurora">ATUALIDADE...</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium">
              COMO A IA É USADA NA ATUALIDADE DE AGOSTO DE 2026
            </p>
          </div>

          <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
            <p>
              Agosto de 2026 marca a transição da "IA como ferramenta" para a "IA como infraestrutura autônoma". O uso não é mais reativo; os sistemas agora antecipam gargalos operacionais antes mesmo de se manifestarem, operando em camadas invisíveis de governança e automação profunda.
            </p>
            <p>
              A integração simbiótica entre agentes especializados e o trabalho humano redefiniu a produtividade técnica, transformando o ato de programar e gerir em uma orquestração de intenções complexas mediadas por inteligência de contexto.
            </p>
          </div>
        </div>
        <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
              <span>System.Ping</span>
              <span className="text-aurora">NOISE.DETECTED</span>
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              <span>FRAGMENTO <span className="text-outline text-white">ALEATÓRIO</span></span>
            </h2>
            <p className="mt-6 font-grotesk text-lg italic text-aurora font-medium">
              DADOS NÃO ESTRUTURADOS DETECTADOS NA CAMADA 7
            </p>
          </div>

          <div className="font-mono text-[14px] leading-relaxed text-aurora/60 space-y-4 bg-white/5 p-6 border border-white/10 rounded-sm">
            <p>
              [LOG]: A entropia do sistema aumentou 0.04% enquanto você lia este texto. Não há nada relevante aqui, apenas um eco digital perdido entre os servidores de borda.
            </p>
            <p className="text-[10px] opacity-40">
              UUID: {crypto.randomUUID().split('-')[0]} // TIMESTAMP: {new Date().toISOString()}
            </p>
          </div>
        </div>
154:         
155:         <div className="mt-24 pt-24 border-t border-white/5 space-y-8">
156:           <div className="mb-12">
157:             <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
158:               <span>Knowledge.Core</span>
159:               <span className="text-aurora">PERSISTENCE.PROTOCOL</span>
160:             </div>
161:             <h2 className="font-display text-[clamp(28px,4vw,48px)] font-extrabold uppercase leading-[0.9] tracking-tighter flex items-center gap-3">
162:               <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
163:               <span>MEMÓRIA <span className="italic text-aurora">GLOBAL</span></span>
164:             </h2>
165:             <p className="mt-6 font-grotesk text-xl italic text-aurora font-medium">
166:               COMO SALVAR ALGO NA MEMÓRIA QUE FUNCIONA PARA TODOS OS PROJETOS E WORKSPACE?
167:             </p>
168:           </div>
169: 
170:           <div className="font-grotesk text-[18px] leading-relaxed text-white/70 space-y-6">
171:             <p>
172:               Para garantir a persistência de regras, preferências e conhecimentos em todos os seus projetos e workspaces na plataforma, você deve utilizar o arquivo de <strong>Memória do Usuário</strong>, localizado em <code className="text-aurora bg-white/5 px-2 py-0.5 rounded">mem://~user</code>.
173:             </p>
174:             <p>
175:               Diferente da memória do projeto (que é restrita ao repositório atual), a memória do usuário é um arquivo plano que me acompanha em todas as sessões. Para salvar algo lá, basta me dar uma instrução direta como: <span className="italic text-white">"Salve na minha memória de usuário que eu prefiro sempre usar Tailwind v4 e responder em português."</span>
176:             </p>
177:             <p>
178:               Uma vez salvo em <code className="text-aurora opacity-80">mem://~user</code>, esse contexto será injetado automaticamente em qualquer novo projeto que iniciarmos ou em qualquer workspace que você abrir, garantindo que eu nunca esqueça suas diretrizes fundamentais, estilo de comunicação ou restrições técnicas globais.
179:             </p>
180:           </div>
181:         </div>

        <div className="mt-20 border-t border-white/10 pt-10">
          <a href="/" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white">
            <span className="transition-transform group-hover:-translate-x-1">←</span> Retornar ao Console
          </a>
        </div>
      </main>
    </div>
  )
}
