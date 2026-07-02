export const KAIROS_DEFAULT_BASE_URL = 'https://api.chronos.com.pt';
export const KAIROS_DEFAULT_CHRONOS_URL = 'https://organizador.rezumme.ai';

export type KairosMode = 'agent' | 'ask' | 'plan';

export interface KairosChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: KairosToolCall[];
    tool_call_id?: string;
}

export interface KairosToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface KairosToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface KairosToolResult {
    tool_call_id: string;
    name: string;
    content: string;
    error?: boolean;
}

export type KairosStreamEvent =
    | { type: 'token' | 'chunk'; content?: string; delta?: string }
    | { type: 'tool_calls'; tool_calls: KairosToolCall[] }
    | { type: 'usage'; model?: string; promptTokens?: number; completionTokens?: number; costUsd?: number }
    | { type: 'error'; content?: string; message?: string }
    | { type: 'done'; content?: string; conversation_id?: string };
