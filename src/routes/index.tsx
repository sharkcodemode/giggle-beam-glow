import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, UserPlus, Calendar, Info, Server, Cpu, Image as ImageIcon, Key } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Banner Principal */}
      <div className="relative w-full overflow-hidden rounded-2xl border bg-card shadow-lg">
        <img
          src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/f10efe35-b8f6-4da8-b3f0-d3f5775c6287?Expires=1779774013&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=S%2BpCtnUCM6U7wc3CLvXdrHaGzToW7wkZUjBEXHQdOTLQJIIjJjAoptEjvCbiy8EqVO9B11tYkLZWUP3mqyzJDC%2BbhL1Y4A1RNY8O4pW22P1aDzOqbsw%2FGO9NK1%2FwUeVk4jb4CC1S0yqmFgT3xiHYZx5Lm0voPksqjSUjQ0kfO9F1PLGXYHx2mWBdzHfTU3u1caZahrDvD%2BT4Y4ZwoROHMoJ6ld1yza2fmmXt7gNx6s4F47z0%2BRejBiSKbDPiSUTb%2FPPpfv%2Bl8tCOYnmBTE0hyF%2F36%2BsAkTJ0FA569qfAWs%2B%2Fb%2FDgkw2hXS6%2B3OrmbR7d%2FawKnbLiCDasusdAIYdGRQ%3D%3D"
          alt="Banner de anúncio"
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
        {/* Seção de Matrícula 2026 */}
        <Card className="border-primary/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Matrícula 2026</CardTitle>
                <CardDescription>Inscrições On-line Disponíveis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Guia de Matrícula</p>
                <p className="text-muted-foreground">Consulte todos os detalhes e prazos no documento oficial.</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button className="w-full gap-2 text-lg py-6" size="lg">
                <UserPlus className="h-5 w-5" />
                Realizar Inscrição
              </Button>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a 
                  href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/1f1e064e-4f19-4845-84b0-d804eb92534e?Expires=1779777312&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GzXznk57FYF47QARGxKK6kSje7q7wasYClpQ7nr%2F4h9FDrcD%2FInKFdrdZtCIx2jvnZIEBOIcjlbjKXOzOE%2Fy76Un5CWI5xrk8f0F%2FwlmgtkMC2rULdjMDZsjyPfq29FvtzbDSUdWYalC1SdA98w3u%2BHHfQsiffYo9gc3CwRuc%2BIoVuDzqFauXBmmVSV%2Fo0kqQVLJHC%2BA4yNZvNHv0oqIY%2Ff502Wrazw%2BtfasVNgyfwLtNSn1zSk%2BnA89984em5POPhBANAb8xvFmmwbgwkPYToJYN5uT%2B74%2BdRj7EbObZ%2FAtQX70N2t%2BCjXY%2F6xSyGpjQvbln6bAhV8kkDMm1vry9Q%3D%3D" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  Baixar Edital (PDF)
                </a>
              </Button>
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Início: Jan 2026</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player de Áudio Original */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">Áudio Informativo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center flex-grow space-y-4">
            <audio 
              controls 
              className="w-full"
              src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ddedf186-4c7d-42e5-93aa-8a37f2b0d97e?Expires=1779777066&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GGMjoj4BmFN45r9wq0jpNS%2B%2FUzSUff1K04R1PGUEVFkgPmKbitS9485gaK6wjEeujS6FqmsXl1SntElSOdbAVWEWseCt7XRSfo6dciRU8CSMBCu2tVwl6XuUqqQ8xYo43foTNtLHJo7I7NX5tYbTeGkrzFD9TIDDc3NnnQLaURp4dg4bwIh463tWrmYhSdCpYnP2q5oKQ3%2FlSDy3h2uvuihqiQlzSnAPTDmYU%2Bn5a4LXwP74x9D6kYYkmvecon%2FHYCYFjxldyDUZAO6UIU8%2Fv3kU23PbKhYC3ftA%2BeqvKvFBzId6DQGwlHPTv%2FvHNLpq9L5WDgGQgdvh6fxgBPChUg%3D%3D"
            >
              Seu navegador não suporta o elemento de áudio.
            </audio>
            <p className="text-xs text-center text-muted-foreground italic">
              Mensagem informativa sobre o processo de matrícula.
            </p>
          </CardContent>
        </Card>

        {/* Card do Instalador Node.js */}
        <Card className="border-green-500/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-green-500/5 border-b border-green-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Server className="h-6 w-6 text-green-950" />
              </div>
              <div>
                <CardTitle className="text-xl">Node.js v24.11.1</CardTitle>
                <CardDescription>Instalador Windows (x64)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Ambiente de execução JavaScript construído sobre o motor V8 do Chrome.
            </p>
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" asChild>
              <a 
                href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/331aaf90-83c9-4fa7-90b2-2abfd7ea6996?Expires=1779777743&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Y2ugc%2FsEn4dljOLHNdC9vlNM1%2BnYQohnuHvibtx9EHpf054SRr3qISfPAO6HEzKq0DZOwUgueG%2FRwqZIB%2BE6EA8hknbNJ33O0rVIZfyteddxVx0w3H1%2Fipo%2FaejXLaVZl2EneGhoecVeS4J1XGqhUDfXSOXCGMZ4C3bfOIyN2Kn966v1maTdU64Uv4EAMUbZPk38O52OQ0u8DlqKyBOoo4mRn84wEaHyOLX%2BXn8tJevfCljy%2BTpnDj0DkYQEfcm0iJTHtzMv9kBjdw8RNUEnp%2BFFW%2BYkwUWrNYJa2mFOtqA5j%2FmO%2Ffz0MBW3EtTd8QZoaFvzNlaV347CejVgbXuPkA%3D%3D" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Baixar Instalador (MSI)
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Card do Plutonium */}
        <Card className="border-blue-500/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-blue-500/5 border-b border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Cpu className="h-6 w-6 text-blue-950" />
              </div>
              <div>
                <CardTitle className="text-xl">Plutonium</CardTitle>
                <CardDescription>Executável (.exe)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Cliente para servidores dedicados e ferramentas avançadas.
            </p>
            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <a 
                href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/576a2345-5241-4768-a67c-39979dff7018?Expires=1779777936&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Q2mtp%2F%2Bk7lOGeNpjGWM8DoJ36m9KRkHgBvPMwu%2FQbDqBq9yU1GQNtEsIg8ssKgqyNUam5FOTgRVYhVOtFZn4JSPF9m7FrFF%2B5%2Bm3DiPQJDen9JIpK7DpoiJaRn%2BjlBNg%2BzwlxBUJ2Ai4PYReiQ24LRCasPsGTWxUCjAynf7ok%2FIzonUP1Npn0zeQF9IDiI3jJ2Qv9ZI8Mw8vd3oNfLlT9nqNUGZCaf6NaIhjm%2FqzPsJX%2BdPs4ejEfzFhU4JTMZ9y%2Fvziccl7S0XdA3ZTbnjLR52wCjJqf92LwWb%2BLUYyPf1i202bGT9WY6qLih9CTn3Pir0Ocj%2F1FyEld2CSu%2FyHqg%3D%3D" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Baixar Plutonium.exe
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Novo Card de Imagem */}
        <Card className="border-purple-500/20 shadow-xl overflow-hidden group">
          <CardHeader className="bg-purple-500/5 border-b border-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <ImageIcon className="h-6 w-6 text-purple-950" />
              </div>
              <div>
                <CardTitle className="text-xl">Galeria Visual</CardTitle>
                <CardDescription>Imagem de Alta Resolução</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative group">
            <div className="relative aspect-video overflow-hidden">
              <img 
                src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ed47bbb2-8463-46a7-9ab8-11f44a977524?Expires=1779779106&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=3sRneXY1DcejASyNYgmy2A6bonouZ8FR%2Bh9%2F9JJOlF8lEi8W0O9kahEkWlKfxBJKM6dxGys4mhB5xE4VFaso%2FxL5N6anCmhASxkAjSctr1R2pCsG57ORHRPq%2FSLYijPuVDv2XWu25wmzDb9V7IDrvo%2BXPeZ1%2F8Cp%2FZTES2gX2%2FsEclXeSknflInlK83t2DlSKn%2B9NT7hXx%2BufMDfOeGI4%2BiqQ3vEuNW8xJSEa6z8%2FD36M1Iln%2Bi8qSRwVrD23bjEN2V0pKBjrtstsB%2BuaSzosXCPWFNRmzKZJH%2B7WplP%2FiEktdx5kTCLsAIzi33D3QNKsGUjSZZ1CKpEvejgR%2B0f9g%3D%3D"
                alt="Contexto Visual"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="sm" className="gap-2" asChild>
                  <a 
                    href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ed47bbb2-8463-46a7-9ab8-11f44a977524?Expires=1779779106&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=3sRneXY1DcejASyNYgmy2A6bonouZ8FR%2Bh9%2F9JJOlF8lEi8W0O9kahEkWlKfxBJKM6dxGys4mhB5xE4VFaso%2FxL5N6anCmhASxkAjSctr1R2pCsG57ORHRPq%2FSLYijPuVDv2XWu25wmzDb9V7IDrvo%2BXPeZ1%2F8Cp%2FZTES2gX2%2FsEclXeSknflInlK83t2DlSKn%2B9NT7hXx%2BufMDfOeGI4%2BiqQ3vEuNW8xJSEa6z8%2FD36M1Iln%2Bi8qSRwVrD23bjEN2V0pKBjrtstsB%2BuaSzosXCPWFNRmzKZJH%2B7WplP%2FiEktdx5kTCLsAIzi33D3QNKsGUjSZZ1CKpEvejgR%2B0f9g%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Ver em tela cheia
                  </a>
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A imagem apresenta uma paisagem urbana futurista com luzes neon e uma estética cyberpunk vibrante.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Card do Arquivo de Chaves */}
        <Card className="border-amber-500/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-amber-500/5 border-b border-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Key className="h-6 w-6 text-amber-950" />
              </div>
              <div>
                <CardTitle className="text-xl">Chaves de Acesso</CardTitle>
                <CardDescription>Arquivo de Texto (.txt)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Lista de 500 chaves de acesso alfanuméricas para o sistema.
            </p>
            <div className="bg-muted p-3 rounded-md text-[10px] font-mono h-24 overflow-y-auto border">
              ABG-007-NQN ABW-958-PDD AFI-892-QKZ AFN-016-OFP AHR-558-GJH AKL-724-UDA ALP-227-SLR AOC-929-OMY AQD-403-FIT ATI-988-VGU AUT-096-PAG AUX-614-IPQ AVC-878-TOG AVH-246-CWD AWD-121-RAA AYV-217-IIA AYW-830-WYC BCS-431-RCQ BEF-322-QHL BFQ-424-ULW...
            </div>
            <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white" asChild>
              <a 
                href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/89dd8928-fc27-4768-b66e-9fc1d9ec8463?Expires=1779780172&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Yik15u4DL%2BJEBx85V0cmmg%2B1s9Maqzl1oltgBIlK2mjxh0sAt7P0tlSdfOrDCZ9MWb27Zow%2FV9odXIONBDz0dXH%2FkmZn1emXsvEP1gBLgTaTtE%2Breik7ZFLVjvC1cafCuyqQeikgjNiI2OBAcUxDEh15U94bmVIrUty8FBzXRqy1xI%2FsUVIO7PNzVCeZi8aZNvUW5B9bYKfdCYx%2BOT7TDv9XPeuy2kslHPTEuMh9PnV8GHQrf6vIy10Uyt6ySmsk27JmWYlML%2FKEGKc1bctLM4bg2SuY2MtsHY0sLrJYbSPMzt%2FeymSHbLopVXAc%2Ba7OxsraDo0lnmPqRQhL9iYUCQ%3D%3D" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Baixar chaves_500.txt
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Simulando o Painel do ZIP */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-green-500 px-4 py-3 font-bold text-green-950 shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        Exportador Painel
      </button>

      {isOpen && (
        <div className="fixed right-4 top-4 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Painel de Controle</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-sm text-slate-400">Extensão carregada com sucesso e pronta para uso.</p>
          <div className="mt-4 space-y-2">
            <button className="w-full rounded-lg bg-slate-800 py-2 text-sm hover:bg-slate-700">Exportar Dados</button>
            <button className="w-full rounded-lg bg-slate-800 py-2 text-sm hover:bg-slate-700">Configurações</button>
          </div>
        </div>
      )}
    </div>
  );
}