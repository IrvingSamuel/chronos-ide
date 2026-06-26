import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';
import { KairosApiClient } from './kairos-api-client';
import { KairosChatMessage } from '../common/protocol';

interface ChatEntry {
    role: 'user' | 'assistant';
    content: string;
}

@injectable()
export class KairosWidget extends ReactWidget {

    static readonly ID = 'chronos-kairos-view';
    static readonly LABEL = 'Kairos';

    @inject(KairosApiClient)
    protected readonly client: KairosApiClient;

    protected entries: ChatEntry[] = [];
    protected input = '';
    protected streaming = false;
    protected controller?: AbortController;
    protected readonly scrollRef = React.createRef<HTMLDivElement>();

    @postConstruct()
    protected init(): void {
        this.id = KairosWidget.ID;
        this.title.label = KairosWidget.LABEL;
        this.title.caption = 'Kairos — agente do Chronos';
        this.title.iconClass = 'codicon codicon-sparkle';
        this.title.closable = true;
        this.addClass('chronos-kairos');
        this.update();
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const el = this.node.querySelector('.kairos-input') as HTMLTextAreaElement | null;
        el?.focus();
    }

    protected render(): React.ReactNode {
        return (
            <div className='kairos-root'>
                <div className='kairos-messages' ref={this.scrollRef}>
                    {this.entries.length === 0 && (
                        <div className='kairos-empty'>
                            <div className='kairos-empty-title'>Kairos</div>
                            <div className='kairos-empty-sub'>
                                Pergunte algo para começar. Configure o servidor e o token em
                                Preferências › <code>kairos</code>.
                            </div>
                        </div>
                    )}
                    {this.entries.map((e, i) => (
                        <div key={i} className={`kairos-msg ${e.role}`}>
                            <div className='kairos-role'>{e.role === 'user' ? 'Você' : 'Kairos'}</div>
                            <div className='kairos-content'>
                                {e.content || (this.streaming && i === this.entries.length - 1 ? '…' : '')}
                            </div>
                        </div>
                    ))}
                </div>
                <div className='kairos-input-row'>
                    <textarea
                        className='kairos-input'
                        placeholder='Fale com o Kairos…  (Enter envia, Shift+Enter quebra linha)'
                        value={this.input}
                        disabled={this.streaming}
                        onChange={this.onInputChange}
                        onKeyDown={this.onKeyDown}
                    />
                    {this.streaming
                        ? <button className='kairos-send' onClick={this.stop}>Parar</button>
                        : <button className='kairos-send' onClick={this.send} disabled={!this.input.trim()}>Enviar</button>}
                </div>
            </div>
        );
    }

    protected onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        this.input = e.target.value;
        this.update();
    };

    protected onKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void this.send();
        }
    };

    protected send = async (): Promise<void> => {
        const text = this.input.trim();
        if (!text || this.streaming) {
            return;
        }
        this.entries.push({ role: 'user', content: text });
        const assistant: ChatEntry = { role: 'assistant', content: '' };
        this.entries.push(assistant);
        this.input = '';
        this.streaming = true;
        this.update();
        this.scrollToBottom();

        // histórico = tudo menos a resposta vazia do assistente que acabamos de criar
        const history: KairosChatMessage[] = this.entries
            .slice(0, -1)
            .map(e => ({ role: e.role, content: e.content }));

        this.controller = new AbortController();
        await this.client.streamChat(history, {
            onToken: t => {
                assistant.content += t;
                this.update();
                this.scrollToBottom();
            },
            onError: m => {
                assistant.content += (assistant.content ? '\n\n' : '') + `⚠️ ${m}`;
                this.streaming = false;
                this.controller = undefined;
                this.update();
                this.scrollToBottom();
            },
            onDone: () => {
                this.streaming = false;
                this.controller = undefined;
                this.update();
                this.scrollToBottom();
            }
        }, this.controller.signal);
    };

    protected stop = (): void => {
        this.controller?.abort();
        this.streaming = false;
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
