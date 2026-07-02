import React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';
import { PreferenceService } from '@theia/core/lib/common/preferences/preference-service';
import MarkdownIt from 'markdown-it';
import { KairosOrchestrator } from './kairos-orchestrator';
import { KairosChatMessage, KairosMode, KairosToolCall, KairosToolResult } from '../common/protocol';

interface ToolCallEntry {
    call: KairosToolCall;
    result?: KairosToolResult;
    pending: boolean;
}

interface ChatEntry {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: ToolCallEntry[];
}

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

function renderMarkdown(text: string): string {
    if (!text.trim()) return '';
    try {
        return markdown.render(text);
    } catch {
        return text;
    }
}

const MODES: { id: KairosMode; label: string }[] = [
    { id: 'agent', label: 'Agent' },
    { id: 'ask', label: 'Ask' },
    { id: 'plan', label: 'Plan' },
];

@injectable()
export class KairosWidget extends ReactWidget {

    static readonly ID = 'chronos-kairos-view';
    static readonly LABEL = 'Kairos';

    @inject(KairosOrchestrator)
    protected readonly orchestrator!: KairosOrchestrator;

    @inject(PreferenceService)
    protected readonly prefs!: PreferenceService;

    protected entries: ChatEntry[] = [];
    protected conversationMessages: KairosChatMessage[] = [];
    protected streaming = false;
    protected composing = false;
    protected controller?: AbortController;
    protected currentMode: KairosMode = 'agent';
    protected stepInfo = '';
    protected readonly scrollRef = React.createRef<HTMLDivElement>();
    protected readonly inputRef = React.createRef<HTMLTextAreaElement>();

    @postConstruct()
    protected init(): void {
        this.id = KairosWidget.ID;
        this.title.label = KairosWidget.LABEL;
        this.title.caption = 'Kairos — code-agent do Chronos';
        this.title.iconClass = 'codicon codicon-sparkle';
        this.title.closable = true;
        this.addClass('chronos-kairos');
        this.currentMode = (this.prefs.get<string>('kairos.mode', 'agent') || 'agent') as KairosMode;
        this.update();
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.inputRef.current?.focus();
    }

    protected render(): React.ReactNode {
        return (
            <div className='kairos-root'>
                <div className='kairos-toolbar'>
                    <div className='kairos-mode-selector'>
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                className={`kairos-mode-btn ${this.currentMode === m.id ? 'active' : ''}`}
                                onClick={() => this.setMode(m.id)}
                                disabled={this.streaming}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    {this.stepInfo && <span className='kairos-step-info'>{this.stepInfo}</span>}
                </div>
                <div className='kairos-messages' ref={this.scrollRef}>
                    {this.entries.length === 0 && (
                        <div className='kairos-empty'>
                            <div className='kairos-empty-title'>Kairos</div>
                            <div className='kairos-empty-sub'>
                                Code-agent do Chronos IDE — analisa o workspace, edita arquivos e consulta suas tarefas reais.
                                Configure os tokens em Preferências › <code>kairos</code>.
                            </div>
                        </div>
                    )}
                    {this.entries.map((e, i) => this.renderEntry(e, i))}
                </div>
                <div className='kairos-input-row'>
                    <textarea
                        ref={this.inputRef}
                        className='kairos-input'
                        placeholder='Fale com o Kairos…  (Enter envia, Shift+Enter quebra linha)'
                        defaultValue=''
                        disabled={this.streaming}
                        onCompositionStart={this.onCompositionStart}
                        onCompositionEnd={this.onCompositionEnd}
                        onKeyDown={this.onKeyDown}
                    />
                    {this.streaming
                        ? <button type='button' className='kairos-send' onClick={this.stop}>Parar</button>
                        : <button type='button' className='kairos-send' onClick={this.send}>Enviar</button>}
                </div>
            </div>
        );
    }

    protected renderEntry(entry: ChatEntry, index: number): React.ReactNode {
        return (
            <div key={index} className={`kairos-msg ${entry.role}`}>
                <div className='kairos-role'>{entry.role === 'user' ? 'Você' : 'Kairos'}</div>
                {entry.role === 'assistant'
                    ? <div
                        className='kairos-content kairos-md'
                        dangerouslySetInnerHTML={{
                            __html: renderMarkdown(
                                entry.content || (this.streaming && index === this.entries.length - 1 ? '…' : '')
                            )
                        }}
                    />
                    : <div className='kairos-content'>{entry.content}</div>}
                {entry.toolCalls && entry.toolCalls.length > 0 && (
                    <div className='kairos-tool-calls'>
                        {entry.toolCalls.map((tc, tci) => (
                            <details key={tci} className='kairos-tool-card' open={tc.pending}>
                                <summary className={`kairos-tool-summary ${tc.result?.error ? 'error' : tc.pending ? 'pending' : 'success'}`}>
                                    <span className='kairos-tool-icon'>{tc.pending ? '⟳' : tc.result?.error ? '✗' : '✓'}</span>
                                    <span className='kairos-tool-name'>{tc.call.function.name}</span>
                                    {tc.pending && <span className='kairos-tool-status'>executando…</span>}
                                </summary>
                                <div className='kairos-tool-body'>
                                    <div className='kairos-tool-args'>
                                        <strong>Args:</strong>
                                        <pre>{this.formatArgs(tc.call.function.arguments)}</pre>
                                    </div>
                                    {tc.result && (
                                        <div className='kairos-tool-result'>
                                            <strong>Resultado:</strong>
                                            <pre>{this.truncateResult(tc.result.content)}</pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    private formatArgs(raw: string): string {
        try {
            return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
            return raw;
        }
    }

    private truncateResult(text: string): string {
        if (text.length > 2000) {
            return text.slice(0, 2000) + '\n... (truncado)';
        }
        return text;
    }

    protected setMode(mode: KairosMode): void {
        this.currentMode = mode;
        this.prefs.set('kairos.mode', mode);
        this.update();
    }

    protected onCompositionStart = (): void => { this.composing = true; };
    protected onCompositionEnd = (): void => { this.composing = false; };

    protected onKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.nativeEvent.isComposing || this.composing) return;
            e.preventDefault();
            void this.send();
        }
    };

    protected send = async (): Promise<void> => {
        const inputEl = this.inputRef.current;
        const text = (inputEl?.value ?? '').trim();
        if (!text || this.streaming) return;

        this.entries.push({ role: 'user', content: text });
        const assistant: ChatEntry = { role: 'assistant', content: '', toolCalls: [] };
        this.entries.push(assistant);
        if (inputEl) inputEl.value = '';

        this.streaming = true;
        this.update();
        this.scrollToBottom();

        this.conversationMessages.push({ role: 'user', content: text });

        this.controller = new AbortController();
        try {
            const result = await this.orchestrator.run(
                [...this.conversationMessages],
                {
                    onToken: (t) => {
                        assistant.content += t;
                        this.update();
                        this.scrollToBottom();
                    },
                    onToolCallStart: (call) => {
                        if (!assistant.toolCalls) assistant.toolCalls = [];
                        assistant.toolCalls.push({ call, pending: true });
                        this.update();
                        this.scrollToBottom();
                    },
                    onToolCallEnd: (result) => {
                        if (assistant.toolCalls) {
                            const entry = assistant.toolCalls.find(
                                tc => tc.call.id === result.tool_call_id && tc.pending
                            );
                            if (entry) {
                                entry.result = result;
                                entry.pending = false;
                            }
                        }
                        this.update();
                        this.scrollToBottom();
                    },
                    onError: (msg) => {
                        assistant.content += (assistant.content ? '\n\n' : '') + `⚠️ ${msg}`;
                        this.update();
                        this.scrollToBottom();
                    },
                    onDone: () => {},
                    onModeInfo: (mode, step, max) => {
                        this.stepInfo = step > 0 ? `${mode} · passo ${step + 1}/${max}` : mode;
                        this.update();
                    },
                },
                this.controller.signal,
            );
            this.conversationMessages = result;
        } catch {
            // handled by onError
        } finally {
            this.streaming = false;
            this.stepInfo = '';
            this.controller = undefined;
            this.update();
            this.scrollToBottom();
        }
    };

    protected stop = (): void => {
        this.controller?.abort();
        this.streaming = false;
        this.stepInfo = '';
        this.controller = undefined;
        this.update();
    };

    protected scrollToBottom(): void {
        const el = this.scrollRef.current;
        if (el) {
            window.requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
        }
    }
}
