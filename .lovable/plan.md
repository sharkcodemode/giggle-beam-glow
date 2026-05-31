Implement protocol ELITE DEPTH 10 — TIER S in the provided Edge Function (index_original.ts) to enable native TIER S AI capabilities (reasoning, models gpt-5.5-pro, etc.).

### Technical Changes

1.  **AI Gateway Integration**:
    *   Add a new `gateway_chat` action to `ALLOWED_ACTIONS`.
    *   Implement `actionGatewayChat` function to call `https://ai.gateway.lovable.dev/v1/chat/completions`.
    *   Use `LOVABLE_API_KEY` from environment variables for authentication.
    *   Support `x-lovable-model` header to route to elite models (GPT-5.5 Pro, Claude 3.5 Sonnet, etc.).

2.  **TIER S Chat Optimization**:
    *   Enhance `actionSendMessage` to support TIER S parameters: `intent`, `is_high_priority`, `mode` (think/reasoning), `reasoning_effort`, and `model`.
    *   Ensure the native Lovable chat endpoint (`/projects/{id}/chat`) receives these flags correctly.

3.  **Security & Reliability**:
    *   Inject `LOVABLE_API_KEY` into headers for AI Gateway calls.
    *   Maintain existing AES-GCM 256 encryption/decryption for the ACTO protocol.
    *   Keep backward compatibility for legacy panel and extension payloads.

4.  **Updated Version**:
    *   Update `ACTO_EDGE_VERSION` to reflect the TIER S upgrade.

### User Interface Impact
*   No direct UI change in the app itself, but the Edge Function now acts as a high-performance bridge for the ACTO extension/panel to access Tier S AI models.
