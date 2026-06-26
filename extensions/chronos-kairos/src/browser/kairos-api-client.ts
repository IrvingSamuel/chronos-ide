import { injectable, inject } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core/lib/common/preferences/preference-service';
import { KairosChatMessage, KairosStreamEvent, KAIROS_DEFAULT_BASE_URL } from '../common/protocol';

export interface KairosStreamHandlers {
    onToken(text: string): void;
    onUsage?(evt: KairosStreamEvent): void;
    onError(message: string): void;
    onDone(): void;
}

/**
 * Cliente do kairos-agent-server. Faz POST /v1/chat e consome o stream SSE
 * via fetch + ReadableStream (EventSource não suporta POST/headers).
 */
@injectable()
export class KairosApiClient {

    @inject(PreferenceService)
    protected readonly prefs!: PreferenceService;

    get baseUrl(): string {
        const v = (this.prefs.get<string>('kairos.apiBaseUrl', KAIROS_DEFAULT_BASE_URL) || KAIROS_DEFAULT_BASE_URL).trim();
        return v.replace(/\/+$/, '');
    }

    get token(): string {
        return (this.prefs.get<string>('kairos.apiToken', '') || '').trim();
    }

    get model(): string {
        return (this.prefs.get<string>('kairos.model', 'gemini-2.5-flash') || 'gemini-2.5-flash').trim();
    }

    async streamChat(messages: KairosChatMessage[], handlers: KairosStreamHandlers, signal?: AbortSignal): Promise<void> {
        let resp: Response;
        try {
            resp = await fetch(`${this.baseUrl}/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
                },
                body: JSON.stringify({ model: this.model, stream: true, messages }),
                signal
            });
        } catch (e) {
            handlers.onError(`Não foi possível conectar a ${this.baseUrl}. ${e instanceof Error ? e.message : ''}`.trim());
            return;
        }

        if (resp.status === 401) {
            handlers.onError('Não autorizado (401). Configure o token em Preferências › kairos.apiToken.');
            return;
        }
        if (!resp.ok || !resp.body) {
            handlers.onError(`Erro HTTP ${resp.status} ao falar com o Kairos.`);
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const t = line.trim();
                    if (!t.startsWith('data:')) {
                        continue;
                    }
                    const raw = t.slice(5).trim();
                    if (!raw || raw === '[DONE]') {
                        continue;
                    }
                    let evt: KairosStreamEvent;
                    try {
                        evt = JSON.parse(raw);
                    } catch {
                        continue;
                    }
                    switch (evt.type) {
                        case 'token':
                        case 'chunk':
                            handlers.onToken(evt.content ?? evt.delta ?? '');
                            break;
                        case 'usage':
                            handlers.onUsage?.(evt);
                            break;
                        case 'error':
                            handlers.onError(evt.content ?? evt.message ?? 'Erro no servidor Kairos.');
                            break;
                        case 'done':
                            break;
                    }
                }
            }
            handlers.onDone();
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                handlers.onDone();
                return;
            }
            handlers.onError(e instanceof Error ? e.message : 'Erro ao ler o stream do Kairos.');
        }
    }
}
