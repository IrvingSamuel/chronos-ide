import { injectable, inject, named, multiInject, optional } from '@theia/core/shared/inversify';
import { KairosToolCall, KairosToolDefinition, KairosToolResult, KairosMode } from '../common/protocol';

export const KairosTool = Symbol('KairosTool');

export interface KairosTool {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly readOnly: boolean;
    execute(args: Record<string, unknown>): Promise<string>;
}

@injectable()
export class KairosToolRegistry {

    protected readonly tools = new Map<string, KairosTool>();

    @multiInject(KairosTool) @optional()
    protected readonly registeredTools: KairosTool[] = [];

    init(): void {
        for (const tool of this.registeredTools) {
            this.tools.set(tool.name, tool);
        }
    }

    getDefinitions(mode: KairosMode): KairosToolDefinition[] {
        const defs: KairosToolDefinition[] = [];
        for (const tool of this.tools.values()) {
            if (mode === 'ask' && !tool.readOnly) {
                continue;
            }
            defs.push({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            });
        }
        return defs;
    }

    async executeCall(call: KairosToolCall): Promise<KairosToolResult> {
        const tool = this.tools.get(call.function.name);
        if (!tool) {
            return {
                tool_call_id: call.id,
                name: call.function.name,
                content: `Ferramenta "${call.function.name}" não encontrada.`,
                error: true,
            };
        }
        let args: Record<string, unknown>;
        try {
            args = JSON.parse(call.function.arguments || '{}');
        } catch {
            args = {};
        }
        try {
            const result = await tool.execute(args);
            return { tool_call_id: call.id, name: call.function.name, content: result };
        } catch (e) {
            return {
                tool_call_id: call.id,
                name: call.function.name,
                content: e instanceof Error ? e.message : 'Erro na execução da ferramenta.',
                error: true,
            };
        }
    }

    register(tool: KairosTool): void {
        this.tools.set(tool.name, tool);
    }
}
