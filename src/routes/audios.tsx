import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  ArrowLeft, 
  Waves, 
  Mic2,
  Share2,
  Download
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useRef } from "react";

export const Route = createFileRoute("/audios")({
  component: AudiosPage,
});

function AudiosPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs uppercase tracking-widest">Back to Core</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-bold">Audio Interface Tier S</span>
          </div>
        </div>
      </header>

      <main className="relative pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Waves className="w-3 h-3" />
            Neural Voice Processing
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent">
            AUDIO<br />VAULT
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium leading-relaxed">
            High-fidelity neural audio encryption. Powered by ElevenLabs PVC technology for maximum vocal biometric accuracy.
          </p>
        </div>

        {/* Audio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Main Audio Card */}
          <Card className="group relative bg-[#0a0a0a] border-white/5 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardContent className="relative p-10">
              <div className="flex flex-col md:flex-row gap-10 items-center">
                {/* Visualizer Circle */}
                <div className="relative w-48 h-48 flex-shrink-0">
                  <div className={`absolute inset-0 rounded-full border-2 border-dashed border-cyan-500/20 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
                  <div className={`absolute inset-2 rounded-full border-2 border-white/5 ${isPlaying ? 'animate-pulse' : ''}`} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-sm">
                    <Mic2 className={`w-12 h-12 text-white transition-all duration-500 ${isPlaying ? 'scale-110 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'opacity-40'}`} />
                  </div>
                  
                  {/* Floating particles (CSS only) */}
                  {isPlaying && [1,2,3,4,5].map((i) => (
                    <div 
                      key={i}
                      className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-ping"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${1 + Math.random()}s`,
                        animationDelay: `${Math.random()}s`
                      }}
                    />
                  ))}
                </div>

                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div>
                    <h3 className="text-3xl font-black text-white mb-2">Taciana PVC Analysis</h3>
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">elevenlabs_neural_stream_v2.mp3</p>
                  </div>

                  <div className="space-y-4">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300 ${isPlaying ? 'w-2/3' : 'w-0'}`} />
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-slate-600">
                      <span>00:00</span>
                      <span className="text-cyan-500/50">LIVE_PROCESSING</span>
                      <span>00:15</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <Button 
                      onClick={togglePlay}
                      className="h-16 w-16 rounded-2xl bg-white text-black hover:bg-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </Button>
                    
                    <Button variant="outline" className="h-16 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold group">
                      <Download className="w-5 h-5 mr-3 group-hover:animate-bounce" />
                      Download
                    </Button>

                    <Button variant="ghost" className="h-16 w-16 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <audio 
                ref={audioRef}
                src="https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/4b4fcecb-d659-4934-9432-87fa924d0bf8?Expires=1779800764&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=YU4bPRMlx%2Fd%2BlDFI%2FeOW3pOkmuKO%2BbqqC1TXrTuEDHRAG%2BHPvq31wMjP9hIn6e4mW5tYEtiwx3nnPDHSOZQrIloBTgbYR%2FoJrpCWZXXuURpG%2FnWLZSjQxDwtyYjjkx2rAWwsV5RCDeZqgGZ%2FvowFz3U1pnHvMcr2Bvw4nigke36hzdrdhS2ujAX7DgHLptLHi2nQ2dHb1%2BD%2F3g%2FnH%2FhyLQNj8Q2NeAiZe62ejBQ1LouKgcwEFwiNvdpwnux4MoW1T2dgKFjK3M5iTwasJATT8eNilVxy2BlYHTmC%2FqW7kyzaigxwVvgoR0u1aMERIXZBDpMV1B3hD9ie%2FkwCNLUM8A%3D%3D"
                onEnded={() => setIsPlaying(false)}
              />
            </CardContent>
          </Card>

          {/* Stats Sidebar */}
          <Card className="bg-[#0a0a0a] border-white/5 p-8 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Volume2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">System Logs</h4>
                  <p className="text-xs text-slate-500 font-mono tracking-tighter">tier_s_authentication_active</p>
                </div>
              </div>

              <div className="space-y-4 font-mono text-[10px]">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-600 uppercase">Bitrate</span>
                  <span className="text-cyan-500">320 KBPS</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-600 uppercase">Sample Rate</span>
                  <span className="text-cyan-500">48.0 KHZ</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-600 uppercase">Latency</span>
                  <span className="text-cyan-500">12MS</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-600 uppercase">Encryption</span>
                  <span className="text-cyan-500">AES-256</span>
                </div>
              </div>
            </div>

            <div className="mt-10 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                "Este áudio contém traços biométricos vocais processados através da infraestrutura PROCORE."
              </p>
            </div>
          </Card>
        </div>

        {/* Visualization Grid Placeholder */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/5 flex items-end p-4 group hover:bg-white/[0.05] transition-colors">
              <div className="w-full flex justify-between items-end gap-1">
                {[...Array(5)].map((_, j) => (
                  <div 
                    key={j} 
                    className={`flex-1 bg-white/10 rounded-full transition-all duration-500 ${isPlaying ? 'group-hover:bg-cyan-500/50' : ''}`}
                    style={{ 
                      height: `${20 + Math.random() * 80}%`,
                      animation: isPlaying ? `wave 1s ease-in-out infinite ${j * 0.1}s` : 'none'
                    }} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 80%; }
        }
      `}</style>
    </div>
  );
}
