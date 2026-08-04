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
              O Conceito e a <br />
              <span className="italic text-aurora">Evolução</span>
            </div>
          </h1>
        </div>

        <div className="space-y-8 font-grotesk text-[18px] leading-relaxed text-white/80">
          <section>
            <p>
              A inteligência artificial representa um dos maiores saltos tecnológicos da história moderna da humanidade. Em sua essência, o conceito define a capacidade de sistemas computacionais executarem tarefas que tradicionalmente exigiam a mente humana. Isso inclui desde o reconhecimento visual de objetos e a tradução simultânea de idiomas até a criação artística e o desenvolvimento de softwares complexos.
            </p>
          </section>

          <section>
            <p>
              Historicamente confinada aos laboratórios acadêmicos e a restritas teorias matemáticas, a tecnologia deu um salto monumental nas últimas décadas devido ao aumento exponencial do poder de processamento gráfico e à disponibilidade massiva de dados digitais. O aprendizado de máquina, ou machine learning, permitiu que os softwares parassem de depender exclusivamente de regras rígidas programadas linha por linha. Em vez disso, passaram a absorver imensos volumes de informações, identificando padrões complexos de maneira autônoma.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-aurora flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              A Fase Atual no Mercado Global
            </h2>
            <p>
              Nos dias atuais, o ecossistema da inteligência artificial superou a fase inicial de puro deslumbramento e marketing agressivo. Grandes corporações de tecnologia concentram investimentos bilionários em infraestrutura digital, redes de transmissão de dados e supercomputadores baseados em semicondutores de alta performance. A IA deixou de ser vista como um diferencial futurista raro para se incorporar de forma invisível e natural às rotinas corporativas, ferramentas de produtividade e sistemas operacionais de uso cotidiano.
            </p>
          </section>

          <section>
            <p>
              As estratégias adotadas pelas empresas evoluíram para abordagens multi-modelo, onde diferentes arquiteturas de inteligência são acionadas conforme a especificidade do desafio operacional. Seja para otimizar a cadeia logística, analisar grandes massas de dados multimídia em tempo real ou refinar códigos de programação, a tecnologia atua como um motor de eficiência em setores diversos como saúde, finanças, varejo e indústria.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-aurora flex items-center gap-3">
              <img src={actoLogo.url} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
              Desafios Éticos e Perspectivas Futuras
            </h2>
            <p>
              Apesar dos inúmeros benefícios associados à produtividade e à aceleração de pesquisas científicas, a expansão acelerada da IA impõe debates urgentes sobre governança, segurança da informação e autenticidade do conteúdo gerado online. A regulamentação ética e a necessidade de barreiras operacionais claras tornaram-se fundamentais para mitigar riscos de desinformação e garantir que a automação beneficie a sociedade de forma equilibrada. O futuro aponta para uma integração ainda mais profunda entre o trabalho humano e os sistemas autônomos, redefinindo o papel das competências digitais no mercado de trabalho global.
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

        <div className="mt-20 border-t border-white/10 pt-10">
          <a href="/" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white">
            <span className="transition-transform group-hover:-translate-x-1">←</span> Retornar ao Console
          </a>
        </div>
      </main>
    </div>
  )
}
