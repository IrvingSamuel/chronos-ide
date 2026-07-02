import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core/lib/common/preferences/preference-service';
import { KairosApiClient } from './kairos-api-client';
import { KairosToolRegistry } from './kairos-tool-registry';
import { KairosWorkspaceContext } from './kairos-workspace-context';
import { KairosSkillLoader } from './kairos-skill-loader';
import {
    KairosChatMessage, KairosMode, KairosToolCall,
    KairosToolDefinition, KairosToolResult,
} from '../common/protocol';

export interface OrchestratorCallbacks {
    onToken(text: string): void;
    onToolCallStart(call: KairosToolCall): void;
    onToolCallEnd(result: KairosToolResult): void;
    onError(message: string): void;
    onDone(): void;
    onModeInfo?(mode: KairosMode, step: number, maxSteps: number): void;
}

@injectable()
export class KairosOrchestrator {

    @inject(KairosApiClient)
    protected readonly client!: KairosApiClient;

    @inject(KairosToolRegistry)
    protected readonly toolRegistry!: KairosToolRegistry;

    @inject(KairosWorkspaceContext)
    protected readonly workspaceContext!: KairosWorkspaceContext;

    @inject(KairosSkillLoader)
    protected readonly skillLoader!: KairosSkillLoader;

    @inject(PreferenceService)
    protected readonly prefs!: PreferenceService;

    @postConstruct()
    protected init(): void {
        this.toolRegistry.init();
    }

    get mode(): KairosMode {
        return (this.prefs.get<string>('kairos.mode', 'agent') || 'agent') as KairosMode;
    }

    get maxSteps(): number {
        return this.prefs.get<number>('kairos.maxAgentSteps', 25) || 25;
    }

    async run(
        history: KairosChatMessage[],
        callbacks: OrchestratorCallbacks,
        signal?: AbortSignal,
    ): Promise<KairosChatMessage[]> {
        const mode = this.mode;
        const maxSteps = this.maxSteps;
        const messages = [...history];

        let system: string | undefined;
        try {
            system = await this.workspaceContext.buildSystemPrompt();
        } catch {
            system = undefined;
        }
        system = this.augmentSystemPrompt(system || '', mode);

        try {
            const skills = await this.skillLoader.listSkills();
            if (skills.length > 0) {
                system += this.skillLoader.buildSkillsPromptSection(skills);
            }
        } catch {
            // skills not available — continue without
        }

        const tools = mode === 'plan'
            ? [] // Plan mode first pass: no tools, just plan
            : this.toolRegistry.getDefinitions(mode);

        for (let step = 0; step < maxSteps; step++) {
            if (signal?.aborted) break;
            callbacks.onModeInfo?.(mode, step, maxSteps);

            let textContent = '';
            let toolCalls: KairosToolCall[] = [];
            let hasError = false;

            await new Promise<void>((resolve, reject) => {
                this.client.streamChat(messages, {
                    onToken: (t) => {
                        textContent += t;
                        callbacks.onToken(t);
                    },
                    onToolCalls: (calls) => {
                        toolCalls = calls;
                    },
                    onError: (msg) => {
                        hasError = true;
                        callbacks.onError(msg);
                        resolve();
                    },
                    onDone: () => {
                        resolve();
                    },
                }, signal, system, tools.length > 0 ? tools : undefined);
            });

            if (hasError || signal?.aborted) break;

            if (toolCalls.length === 0) {
                // Model finished without tool calls — done
                if (textContent) {
                    messages.push({ role: 'assistant', content: textContent });
                }
                callbacks.onDone();
                return messages;
            }

            // Model wants to call tools
            const assistantMsg: KairosChatMessage = {
                role: 'assistant',
                content: textContent,
                tool_calls: toolCalls,
            };
            messages.push(assistantMsg);

            // Execute each tool call
            for (const call of toolCalls) {
                if (signal?.aborted) break;
                callbacks.onToolCallStart(call);
                const result = await this.toolRegistry.executeCall(call);
                callbacks.onToolCallEnd(result);

                messages.push({
                    role: 'tool',
                    content: result.content,
                    tool_call_id: result.tool_call_id,
                });
            }

            // Clear system for subsequent rounds (already in context)
            system = undefined;
        }

        callbacks.onDone();
        return messages;
    }

    private augmentSystemPrompt(base: string, mode: KairosMode): string {
        const parts = [base];

        parts.push('', '## Kairos Agent Rules');
        parts.push('- You are Kairos, the AI code-agent of Chronos IDE.');
        parts.push('- NEVER simulate or fabricate tool outputs. If you need data (tasks, files, etc.), you MUST call the appropriate tool.');
        parts.push('- NEVER pretend to run terminal commands. Use the run_terminal tool or tell the user to run commands in the integrated terminal.');
        parts.push('- When the user asks about their tasks, schedule, or activities, ALWAYS use chronos_tasks_list to fetch real data.');
        parts.push('- Respond in the same language the user writes in.');
        parts.push('- Use markdown for formatting: fenced code blocks, headings, lists, bold.');

        switch (mode) {
            case 'ask':
                parts.push('', '## Mode: Ask (read-only)');
                parts.push('- You can only READ files and list tasks. You CANNOT modify files or run commands.');
                parts.push('- If the user asks you to make changes, explain what changes are needed and suggest switching to Agent mode.');
                break;
            case 'plan':
                parts.push('', '## Mode: Plan');
                parts.push('- First, create a detailed plan in markdown with numbered steps before making any changes.');
                parts.push('- Present the plan to the user and wait for approval before executing.');
                parts.push('- Each step should be specific and actionable with file paths and code snippets.');
                break;
            case 'agent':
                parts.push('', '## Mode: Agent');
                parts.push('- You have full access to read/write files, search code, and execute tools.');
                parts.push('- Use tools proactively to gather context before making changes.');
                parts.push('- Prefer search_replace over write_file for targeted edits.');
                break;
        }

        return parts.join('\n');
    }
}
