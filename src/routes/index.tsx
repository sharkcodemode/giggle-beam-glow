import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, UserPlus, Calendar, Info, Server } from "lucide-react";

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Áudio Informativo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center min-h-[150px]">
            <audio 
              controls 
              className="w-full"
              src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ddedf186-4c7d-42e5-93aa-8a37f2b0d97e?Expires=1779777066&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GGMjoj4BmFN45r9wq0jpNS%2B%2FUzSUff1K04R1PGUEVFkgPmKbitS9485gaK6wjEeujS6FqmsXl1SntElSOdbAVWEWseCt7XRSfo6dciRU8CSMBCu2tVwl6XuUqqQ8xYo43foTNtLHJo7I7NX5tYbTeGkrzFD9TIDDc3NnnQLaURp4dg4bwIh463tWrmYhSdCpYnP2q5oKQ3%2FlSDy3h2uvuihqiQlzSnAPTDmYU%2Bn5a4LXwP74x9D6kYYkmvecon%2FHYCYFjxldyDUZAO6UIU8%2Fv3kU23PbKhYC3ftA%2BeqvKvFBzId6DQGwlHPTv%2FvHNLpq9L5WDgGQgdvh6fxgBPChUg%3D%3D"
            >
              Seu navegador não suporta o elemento de áudio.
            </audio>
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
