import React, { useState } from 'react';
import { Brain, Zap, Shield, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * PROTOCOLO TIER S — MODEL SELECTOR CORE
 * 
 * Este componente é a representação visual da lógica de elite.
 * Ele mapeia nomes comerciais para IDs técnicos da Gateway Lovable.
 */

type ModelTier = 'fast' | 'elite' | 'analytical';

interface ModelOption {
  id: string;
  name: string;
  tier: ModelTier;
  icon: React.ReactNode;
  description: string;
  color: string;
  lovableId: string;
}

const MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    tier: 'fast',
    icon: <Zap className="w-4 h-4" />,
    description: 'Equilíbrio ideal entre velocidade e inteligência.',
    color: 'text-blue-400',
    lovableId: 'anthropic/claude-3-5-sonnet-latest',
  },
  {
    id: 'claude-opus-47',
    name: 'Claude 4.7 (Opus Elite)',
    tier: 'elite',
    icon: <Brain className="w-4 h-4" />,
    description: 'Raciocínio Tier S para refatoração e lógica complexa.',
    color: 'text-purple-400',
    lovableId: 'anthropic/claude-4-7-opus-preview', // ID hipotético de elite
  },
  {
    id: 'gpt-55-pro',
    name: 'GPT-5.5 Pro',
    tier: 'analytical',
    icon: <Shield className="w-4 h-4" />,
    description: 'Máxima precisão analítica e seguimento de instruções.',
    color: 'text-emerald-400',
    lovableId: 'openai/gpt-5.5-pro',
  },
];

export const TierSModelSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[1]); // Default Opus 4.7

  const handleSelect = (model: ModelOption) => {
    setSelectedModel(model);
    setIsOpen(false);
    console.log(`[TIER S] Payload pronto para: ${model.lovableId}`);
  };

  return (
    <div className="relative w-full max-w-xs group">
      {/* Label de Protocolo */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Model Protocol: Tier S
        </span>
      </div>

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
          "bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20",
          "shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
          isOpen ? "ring-2 ring-purple-500/50" : ""
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-white/5", selectedModel.color)}>
            {selectedModel.icon}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white tracking-tight">
              {selectedModel.name}
            </div>
            <div className="text-[10px] text-muted-foreground leading-none">
              Tier: {selectedModel.tier.toUpperCase()}
            </div>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                  "hover:bg-white/5 active:bg-white/10",
                  selectedModel.id === model.id ? "bg-white/5" : ""
                )}
              >
                <div className={cn("mt-1 p-1.5 rounded-md bg-white/5", model.color)}>
                  {model.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {model.name}
                    {model.tier === 'elite' && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-purple-500/20 text-purple-400 font-bold uppercase">
                        Master
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {model.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          
          {/* Footer Informativo */}
          <div className="p-3 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-medium">
              <span>Payload Mapping:</span>
              <code className="text-purple-400 lowercase">{selectedModel.lovableId}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
