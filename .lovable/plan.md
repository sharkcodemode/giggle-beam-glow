I will refactor the `acto-tier-s` Edge Function to ensure it actually delivers the "Tier S" experience by using the Lovable AI Gateway with GPT-5.5 for chat messages sent via the extension.

Currently, the function calls the Lovable Project Chat API, which manages its own models and typically defaults to GPT-4o for the agent, ignoring any model overrides. To provide the requested "Elite Depth 10" performance, I will:

1.  **Update the Edge Function Routing:**
    *   Modify `actionSendMessage` to route requests to the **AI Gateway** instead of the Project Chat API when the user is using the extension for chat/questions.
    *   Use **`openai/gpt-5.5`** as the engine, which I've verified is active and functional in the gateway.
    *   Include a high-tier system prompt to activate the "Elite Depth 10" reasoning protocol.
    *   Transform the AI Gateway response into the format expected by the ACTO extension to ensure a seamless UI experience.

2.  **Maintain Code-Editing Capability:**
    *   Provide a way to still access the Lovable Agent for project-level changes if needed, but prioritize the Elite model for chat-based interactions as requested.

3.  **Correct Model Identifiers:**
    *   Replace the invalid `anthropic/claude-3.5-sonnet` with the verified `openai/gpt-5.5` which provides the "Tier S" performance the user expects.

### Technical details:
- **Edge Function:** `supabase/functions/acto-tier-s/index.ts`
- **Model:** `openai/gpt-5.5` (ID verificado via teste manual)
- **Protocol:** Enforced via AI Gateway headers and system instructions.
