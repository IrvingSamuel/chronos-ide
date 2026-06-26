export const KAIROS_DEFAULT_BASE_URL = 'https://api.chronos.com.pt';

export interface KairosChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Eventos SSE emitidos por POST /v1/chat do kairos-agent-server.
 * Compatível também com o contrato legado da Chronos (`type: 'chunk'`).
 */
export type KairosStreamEvent =
    | { type: 'token' | 'chunk'; content?: string; delta?: string }
    | { type: 'usage'; model?: string; promptTokens?: number; completionTokens?: number; costUsd?: number }
    | { type: 'error'; content?: string; message?: string }
    | { type: 'done'; content?: string; conversation_id?: string };
