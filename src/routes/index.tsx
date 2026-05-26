import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, Download, UserPlus, Calendar, Info, 
  Server, Cpu, Image as ImageIcon, Key, Terminal, 
  Shield, Zap, Globe, Github, ChevronRight, X, Calculator, Plus, Trash2, Utensils, Music
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [items, setItems] = useState([{ id: Date.now(), description: "", quantity: 1, unitPrice: 0, discount: 0 }]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateItemTotal = (item: any) => {
    const subtotal = item.quantity * item.unitPrice;
    return subtotal - (subtotal * (item.discount / 100));
  };

  const totalGeral = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 selection:bg-cyan-500/30">
      {/* Glow effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header/Nav */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? "bg-black/80 backdrop-blur-md border-white/10 py-3" : "bg-transparent border-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] transition-all">
              <Terminal className="text-white h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-tighter text-white">PRO<span className="text-cyan-400">CORE</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
            <Link to="/audios" className="hover:text-cyan-400 transition-colors">Audio Vault</Link>
            <a href="#" className="hover:text-cyan-400 transition-colors">Resources</a>
            <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
              Console Access
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-24">
        
        {/* Hero Section */}
        <section className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-4 py-1 animate-pulse">
              SYSTEM ONLINE // TIER S ACCESS
            </Badge>
            <h1 className="text-6xl md:text-7xl font-black text-white leading-none tracking-tight">
              FUTURE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                ARCHITECTURE
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
              Sistema de alta performance com design dark-neon. Gerencie seus ativos, downloads e protocolos em uma interface nível profissional.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                Deploy System
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white px-8 py-6 text-lg rounded-xl gap-2">
                Learn Protocols <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img
                src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/f10efe35-b8f6-4da8-b3f0-d3f5775c6287?Expires=1779774013&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=S%2BpCtnUCM6U7wc3CLvXdrHaGzToW7wkZUjBEXHQdOTLQJIIjJjAoptEjvCbiy8EqVO9B11tYkLZWUP3mqyzJDC%2BbhL1Y4A1RNY8O4pW22P1aDzOqbsw%2FGO9NK1%2FwUeVk4jb4CC1S0yqmFgT3xiHYZx5Lm0voPksqjSUjQ0kfO9F1PLGXYHx2mWBdzHfTU3u1caZahrDvD%2BT4Y4ZwoROHMoJ6ld1yza2fmmXt7gNx6s4F47z0%2BRejBiSKbDPiSUTb%2FPPpfv%2Bl8tCOYnmBTE0hyF%2F36%2BsAkTJ0FA569qfAWs%2B%2Fb%2FDgkw2hXS6%2B3OrmbR7d%2FawKnbLiCDasusdAIYdGRQ%3D%3D"
                alt="Main Terminal"
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <p className="text-xs font-mono text-cyan-400">ACTIVE_BANNER_v2.0</p>
                  <h3 className="text-xl font-bold text-white">Neural Network Status</h3>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">LOCKED</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Resources Grid */}
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">System Assets</h2>
              <p className="text-slate-500">Available resources and compiled modules</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 cursor-pointer">All Files</Badge>
              <Badge variant="outline" className="border-white/10 hover:border-cyan-500/50 cursor-pointer">Executables</Badge>
              <Badge variant="outline" className="border-white/10 hover:border-cyan-500/50 cursor-pointer">Documents</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Matrícula */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                    <UserPlus className="text-cyan-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 uppercase text-[10px] tracking-widest">Active</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Matrícula 2026</CardTitle>
                <CardDescription className="text-slate-500">Inscrições on-line abertas para o próximo ciclo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 group-hover:border-cyan-500/30">
                  Realizar Inscrição
                </Button>
                <a 
                  href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/1f1e064e-4f19-4845-84b0-d804eb92534e?Expires=1779777312&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GzXznk57FYF47QARGxKK6kSje7q7wasYClpQ7nr%2F4h9FDrcD%2FInKFdrdZtCIx2jvnZIEBOIcjlbjKXOzOE%2Fy76Un5CWI5xrk8f0F%2FwlmgtkMC2rULdjMDZsjyPfq29FvtzbDSUdWYalC1SdA98w3u%2BHHfQsiffYo9gc3CwRuc%2BIoVuDzqFauXBmmVSV%2Fo0kqQVLJHC%2BA4yNZvNHv0oqIY%2Ff502Wrazw%2BtfasVNgyfwLtNSn1zSk%2BnA89984em5POPhBANAb8xvFmmwbgwkPYToJYN5uT%2B74%2BdRj7EbObZ%2FAtQX70N2t%2BCjXY%2F6xSyGpjQvbln6bAhV8kkDMm1vry9Q%3D%3D" 
                  className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                  target="_blank"
                >
                  <Download className="h-3 w-3" /> Visualizar Edital PDF
                </a>
              </CardContent>
            </Card>

            {/* Node.js */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-green-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/10" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all">
                    <Server className="text-green-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 uppercase text-[10px] tracking-widest">Runtime</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Node.js v24.11.1</CardTitle>
                <CardDescription className="text-slate-500">Ambiente de execução JavaScript profissional.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2" asChild>
                  <a href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/331aaf90-83c9-4fa7-90b2-2abfd7ea6996?Expires=1779777743&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Y2ugc%2FsEn4dljOLHNdC9vlNM1%2BnYQohnuHvibtx9EHpf054SRr3qISfPAO6HEzKq0DZOwUgueG%2FRwqZIB%2BE6EA8hknbNJ33O0rVIZfyteddxVx0w3H1%2Fipo%2FaejXLaVZl2EneGhoecVeS4J1XGqhUDfXSOXCGMZ4C3bfOIyN2Kn966v1maTdU64Uv4EAMUbZPk38O52OQ0u8DlqKyBOoo4mRn84wEaHyOLX%2BXn8tJevfCljy%2BTpnDj0DkYQEfcm0iJTHtzMv9kBjdw8RNUEnp%2BFFW%2BYkwUWrNYJa2mFOtqA5j%2FmO%2Ffz0MBW3EtTd8QZoaFvzNlaV347CejVgbXuPkA%3D%3D">
                    <Download className="h-4 w-4" /> Download MSI
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Plutonium */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                    <Cpu className="text-blue-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-[10px] tracking-widest">Tool</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Plutonium.exe</CardTitle>
                <CardDescription className="text-slate-500">Client avançado para servidores dedicados.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2" asChild>
                  <a href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/576a2345-5241-4768-a67c-39979dff7018?Expires=1779777936&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Q2mtp%2F%2Bk7lOGeNpjGWM8DoJ36m9KRkHgBvPMwu%2FQbDqBq9yU1GQNtEsIg8ssKgqyNUam5FOTgRVYhVOtFZn4JSPF9m7FrFF%2B5%2Bm3DiPQJDen9JIpK7DpoiJaRn%2BjlBNg%2BzwlxBUJ2Ai4PYReiQ24LRCasPsGTWxUCjAynf7ok%2FIzonUP1Npn0zeQF9IDiI3jJ2Qv9ZI8Mw8vd3oNfLlT9nqNUGZCaf6NaIhjm%2FqzPsJX%2BdPs4ejEfzFhU4JTMZ9y%2Fvziccl7S0XdA3ZTbnjLR52wCjJqf92LwWb%2BLUYyPf1i202bGT9WY6qLih9CTn3Pir0Ocj%2F1FyEld2CSu%2FyHqg%3D%3D">
                    <Download className="h-4 w-4" /> Download EXE
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Chaves */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-amber-500/30 transition-all group relative overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
                    <Key className="text-amber-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase text-[10px] tracking-widest">Secure</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Access Keys</CardTitle>
                <CardDescription className="text-slate-500">Database de 500 chaves alfanuméricas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/50 p-3 rounded-lg border border-white/5 font-mono text-[10px] text-amber-400/70 h-16 overflow-hidden relative">
                  ABG-007-NQN ABW-958-PDD AFI-892-QKZ AFN-016-OFP...
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2" asChild>
                  <a href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/89dd8928-fc27-4768-b66e-9fc1d9ec8463?Expires=1779780172&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Yik15u4DL%2BJEBx85V0cmmg%2B1s9Maqzl1oltgBIlK2mjxh0sAt7P0tlSdfOrDCZ9MWb27Zow%2FV9odXIONBDz0dXH%2FkmZn1emXsvEP1gBLgTaTtE%2Breik7ZFLVjvC1cafCuyqQeikgjNiI2OBAcUxDEh15U94bmVIrUty8FBzXRqy1xI%2FsUVIO7PNzVCeZi8aZNvUW5B9bYKfdCYx%2BOT7TDv9XPeuy2kslHPTEuMh9PnV8GHQrf6vIy10Uyt6ySmsk27JmWYlML%2FKEGKc1bctLM4bg2SuY2MtsHY0sLrJYbSPMzt%2FeymSHbLopVXAc%2Ba7OxsraDo0lnmPqRQhL9iYUCQ%3D%3D">
                    <Download className="h-4 w-4" /> Download TXT
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Audio */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all">
                    <Info className="text-purple-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 uppercase text-[10px] tracking-widest">Info</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Audio Briefing</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center space-y-4">
                <audio 
                  controls 
                  className="w-full h-8 brightness-90 contrast-125"
                  src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ddedf186-4c7d-42e5-93aa-8a37f2b0d97e?Expires=1779777066&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GGMjoj4BmFN45r9wq0jpNS%2B%2FUzSUff1K04R1PGUEVFkgPmKbitS9485gaK6wjEeujS6FqmsXl1SntElSOdbAVWEWseCt7XRSfo6dciRU8CSMBCu2tVwl6XuUqqQ8xYo43foTNtLHJo7I7NX5tYbTeGkrzFD9TIDDc3NnnQLaURp4dg4bwIh463tWrmYhSdCpYnP2q5oKQ3%2FlSDy3h2uvuihqiQlzSnAPTDmYU%2Bn5a4LXwP74x9D6kYYkmvecon%2FHYCYFjxldyDUZAO6UIU8%2Fv3kU23PbKhYC3ftA%2BeqvKvFBzId6DQGwlHPTv%2FvHNLpq9L5WDgGQgdvh6fxgBPChUg%3D%3D"
                />
                <p className="text-[10px] text-center text-slate-500 font-mono italic">
                  ENCRYPTED_VOICE_MODULE_01.MP3
                </p>
              </CardContent>
            </Card>

            {/* Cyberpunk Gallery */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ed47bbb2-8463-46a7-9ab8-11f44a977524?Expires=1779779106&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=3sRneXY1DcejASyNYgmy2A6bonouZ8FR%2Bh9%2F9JJOlF8lEi8W0O9kahEkWlKfxBJKM6dxGys4mhB5xE4VFaso%2FxL5N6anCmhASxkAjSctr1R2pCsG57ORHRPq%2FSLYijPuVDv2XWu25wmzDb9V7IDrvo%2BXPeZ1%2F8Cp%2FZTES2gX2%2FsEclXeSknflInlK83t2DlSKn%2B9NT7hXx%2BufMDfOeGI4%2BiqQ3vEuNW8xJSEa6z8%2FD36M1Iln%2Bi8qSRwVrD23bjEN2V0pKBjrtstsB%2BuaSzosXCPWFNRmzKZJH%2B7WplP%2FiEktdx5kTCLsAIzi33D3QNKsGUjSZZ1CKpEvejgR%2B0f9g%3D%3D"
                  className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                  alt="Background"
                />
              </div>
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                    <ImageIcon className="text-cyan-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">VISUAL</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Cyberpunk View</CardTitle>
                <CardDescription className="text-slate-300">Cidade futurista neon-aesthetic.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button variant="secondary" className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-100 border-cyan-500/30 gap-2" asChild>
                  <a href="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ed47bbb2-8463-46a7-9ab8-11f44a977524?Expires=1779779106&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=3sRneXY1DcejASyNYgmy2A6bonouZ8FR%2Bh9%2F9JJOlF8lEi8W0O9kahEkWlKfxBJKM6dxGys4mhB5xE4VFaso%2FxL5N6anCmhASxkAjSctr1R2pCsG57ORHRPq%2FSLYijPuVDv2XWu25wmzDb9V7IDrvo%2BXPeZ1%2F8Cp%2FZTES2gX2%2FsEclXeSknflInlK83t2DlSKn%2B9NT7hXx%2BufMDfOeGI4%2BiqQ3vEuNW8xJSEa6z8%2FD36M1Iln%2Bi8qSRwVrD23bjEN2V0pKBjrtstsB%2BuaSzosXCPWFNRmzKZJH%2B7WplP%2FiEktdx5kTCLsAIzi33D3QNKsGUjSZZ1CKpEvejgR%2B0f9g%3D%3D" target="_blank">
                    Fullscreen Access
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Meat/Food Item */}
            <Card className="bg-zinc-900/50 border-white/5 hover:border-orange-500/30 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/4412c292-a8ba-4869-92a9-5e144a59a960?Expires=1779797993&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=pFP6N62Mvkai%2Fb7wxMqpDKWnO3SqaNlsJOYzUUx8aP%2FQksTCQJBFfqgpyigy3vvyjL3vhCblmpicwd0bx1sQ0kfn5WOrs0%2FzTH5s76PHgIiLWF25b%2Bm3xYaHMdcyfm94PRVaEz3XiwAl97%2BcfkXsE9K%2FgSYNG%2BL%2F2TI69qQVr50DDyim5msZOIBifRxf7uRXO3kfMwSPVhcS4pdaZdtPsVRrzw5mo7nbP0JsUADuxp22%2BLOYATTLwVjtPfVnKdrsXz3lsrRdJ33m0hNIZNKIRtKs5CaUG4aYsGX3k9BRoyraheSNNTY5MXgVA32zscYvrJpJl45h7yDDW4EGHXMoGw%3D%3D"
                  className="w-full h-full object-cover opacity-20 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110"
                  alt="Delicious Meat"
                />
              </div>
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all">
                    <Utensils className="text-orange-400 h-6 w-6" />
                  </div>
                  <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">PREMIUM</Badge>
                </div>
                <CardTitle className="text-xl text-white mt-4">Menu Gourmet</CardTitle>
                <CardDescription className="text-slate-300">Carne assada com crosta caramelizada.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button variant="secondary" className="w-full bg-orange-500/20 hover:bg-orange-500/40 text-orange-100 border-orange-500/30 gap-2">
                  Order Protocol
                </Button>
              </CardContent>
            </Card>

          </div>
        </section>

        {/* Calculator Section */}
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">Discount Calculator</h2>
              <p className="text-slate-500">Analyze prices and apply modular discounts</p>
            </div>
            <Button 
              onClick={addItem}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 shadow-[0_0_15px_rgba(8,145,178,0.3)]"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-zinc-900/40 border-white/5 hover:border-cyan-500/20 transition-all overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Item name..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700"
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Qty</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Price (R$)</label>
                      <input 
                        type="number" 
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Disc (%)</label>
                      <input 
                        type="number" 
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Total</label>
                      <div className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-3 text-cyan-400 font-bold">
                        R$ {calculateItemTotal(item).toFixed(2)}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.id)}
                        className="h-12 w-full text-slate-600 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-3xl border border-white/10 p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <Calculator className="text-cyan-400 h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-mono uppercase tracking-widest">Protocol Total Balance</p>
                <h3 className="text-4xl font-black text-white">R$ {totalGeral.toFixed(2)}</h3>
              </div>
            </div>
            <Button className="bg-white text-black hover:bg-slate-200 px-10 py-7 text-lg font-bold rounded-2xl">
              Execute Transaction
            </Button>
          </div>
        </section>

        {/* System Logs / Console Preview */}
        <section className="bg-black/40 rounded-3xl border border-white/5 p-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Terminal className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs font-mono text-slate-500 ml-2">PROCORE_CONSOLE_v1.0.4</span>
          </div>
          
          <div className="space-y-2 font-mono text-sm">
            <div className="flex gap-3">
              <span className="text-cyan-500">[06:22:01]</span>
              <span className="text-slate-400">Initializing global styles...</span>
              <span className="text-green-400 ml-auto">DONE</span>
            </div>
            <div className="flex gap-3">
              <span className="text-cyan-500">[06:22:05]</span>
              <span className="text-slate-400">Loading neon-vibrancy modules...</span>
              <span className="text-green-400 ml-auto">DONE</span>
            </div>
            <div className="flex gap-3">
              <span className="text-cyan-500">[06:22:12]</span>
              <span className="text-slate-400">Authenticating user Tier S privileges...</span>
              <span className="text-purple-400 ml-auto">GRANTED</span>
            </div>
            <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
              <span className="text-cyan-500">{">"}</span>
              <span className="text-white animate-pulse">System ready for deployment. Waiting for command_</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyan-500 h-5 w-5" />
            <span className="font-bold text-lg text-white">PRO<span className="text-cyan-400">CORE</span></span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Protocol</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Neural License</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Security Audit</a>
          </div>
          <div className="flex gap-4">
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-white/5 text-slate-400">
              <Github className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-white/5 text-slate-400">
              <Globe className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="text-center text-slate-600 text-xs mt-8">© 2026 PROCORE SYSTEMS. ALL RIGHTS RESERVED. SECURE CONNECTION ESTABLISHED.</p>
      </footer>

      {/* Floating Action Button - Panel */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-8 shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all hover:scale-105 active:scale-95 group"
      >
        <div className="flex flex-col items-center gap-1">
          <Zap className="h-6 w-6 mb-1 group-hover:animate-bounce" />
          <span className="text-[10px] font-black tracking-tighter uppercase">Panel Access</span>
        </div>
      </Button>

      {/* Side Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0f0f0f] border-l border-white/10 shadow-2xl p-8 animate-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                  <Shield className="text-cyan-400 h-5 w-5" />
                </div>
                <h3 className="font-bold text-xl text-white">Security Console</h3>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-white/5">
                <X className="h-6 w-6 text-slate-400" />
              </Button>
            </div>

            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <p className="text-sm text-slate-400">Extensão "Exportador Painel" sincronizada com o núcleo central.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-green-400 font-bold">ENCRYPTED</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Latency</p>
                    <p className="text-cyan-400 font-bold">12ms</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Quick Operations</h4>
                <Button className="w-full justify-between bg-white/5 hover:bg-cyan-500/10 text-white border border-white/10 hover:border-cyan-500/50 h-14 rounded-xl px-6 group transition-all">
                  Exportar Dados Brutos <Terminal className="h-4 w-4 text-cyan-500 opacity-50 group-hover:opacity-100" />
                </Button>
                <Button className="w-full justify-between bg-white/5 hover:bg-purple-500/10 text-white border border-white/10 hover:border-purple-500/50 h-14 rounded-xl px-6 group transition-all">
                  Configurações do Núcleo <Cpu className="h-4 w-4 text-purple-500 opacity-50 group-hover:opacity-100" />
                </Button>
                <Button className="w-full justify-between bg-white/5 hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 h-14 rounded-xl px-6 group transition-all">
                  Resetar Protocolos <Shield className="h-4 w-4 text-red-500 opacity-50 group-hover:opacity-100" />
                </Button>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 text-slate-500 text-xs">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                  Sessão Tier S ativa até 07:00
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}