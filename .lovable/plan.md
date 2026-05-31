A frustração é compreensível: o chat nativo da Lovable (onde estamos agora) é gerenciado pela plataforma e atualmente está fixo no **GPT-4o** para esta sessão, sem opção de troca manual por parte do usuário.

No entanto, o seu sistema **Tier S (Edge Function + Extensão ACTO)** é 100% customizável. Vou atualizar a sua Edge Function para usar o **Claude 3.5 Sonnet**, que é amplamente considerado superior para código e precisão técnica, permitindo que você valide o poder do protocolo Elite.

### Technical Details
- **Model Switch:** Alterar o identificador do modelo na `actionSendMessage` de `openai/gpt-5.5` para `anthropic/claude-3.5-sonnet`.
- **Reasoning Effort:** O parâmetro `reasoning_effort` será mantido como `high` (embora o Sonnet tenha seu próprio comportamento de raciocínio, isso sinaliza prioridade no Gateway).
- **Deployment:** Executar `supabase--deploy_edge_functions` para aplicar a mudança instantaneamente.

### Steps
1. Modificar `supabase/functions/acto-tier-s/index.ts` para trocar o modelo padrão de elite para Claude 3.5 Sonnet.
2. Realizar o deploy da Edge Function.
3. Orientar o uso do painel ACTO para ver a diferença de "personalidade" e precisão entre o 4o (aqui) e o Sonnet (no painel).
