import { injectable, inject } from '@theia/core/shared/inversify';
import { KairosApiClient } from '../kairos-api-client';
import { KairosTool } from '../kairos-tool-registry';

@injectable()
export class ChronosTasksListTool implements KairosTool {
    readonly name = 'chronos_tasks_list';
    readonly description = 'Listar tarefas reais do usuário no Chronos (dashboard pessoal e boards). SEMPRE use esta ferramenta para responder perguntas sobre tarefas, compromissos ou atividades do usuário.';
    readonly readOnly = true;
    readonly parameters = {
        type: 'object',
        properties: {
            status: { type: 'string', enum: ['pending', 'in_progress', 'in_review', 'done', 'overdue'], description: 'Filtrar por status.' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Filtrar por prioridade.' },
            limit: { type: 'number', description: 'Número máximo de tarefas (default: 20).' },
        },
    };

    @inject(KairosApiClient) protected readonly client!: KairosApiClient;

    async execute(args: Record<string, unknown>): Promise<string> {
        return this.callMcp('tasks_list_unified', args);
    }

    protected async callMcp(tool: string, input: Record<string, unknown>): Promise<string> {
        const baseUrl = this.client.chronosBaseUrl;
        const token = this.client.chronosMcpToken;
        if (!token) {
            return 'Erro: token MCP do Chronos não configurado. Configure kairos.chronosMcpToken nas Preferências.';
        }
        try {
            const resp = await fetch(`${baseUrl}/mcp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params: { name: tool, arguments: input },
                }),
            });
            if (!resp.ok) {
                return `Erro MCP HTTP ${resp.status}: ${await resp.text()}`;
            }
            const json = await resp.json();
            if (json.error) {
                return `Erro MCP: ${json.error.message || JSON.stringify(json.error)}`;
            }
            const content = json.result?.content;
            if (Array.isArray(content)) {
                return content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
            }
            return JSON.stringify(json.result, null, 2);
        } catch (e) {
            return `Erro ao conectar com Chronos MCP: ${e instanceof Error ? e.message : 'erro desconhecido'}`;
        }
    }
}

@injectable()
export class ChronosTasksCreateTool implements KairosTool {
    readonly name = 'chronos_tasks_create';
    readonly description = 'Criar uma nova tarefa pessoal no Chronos.';
    readonly readOnly = false;
    readonly parameters = {
        type: 'object',
        required: ['title'],
        properties: {
            title: { type: 'string', description: 'Título da tarefa.' },
            description: { type: 'string', description: 'Descrição da tarefa.' },
            due_date: { type: 'string', description: 'Prazo (ISO 8601 datetime).' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridade.' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'in_review', 'done'], description: 'Status.' },
        },
    };

    @inject(KairosApiClient) protected readonly client!: KairosApiClient;

    async execute(args: Record<string, unknown>): Promise<string> {
        return this.callMcp('tasks_create', args);
    }

    protected async callMcp(tool: string, input: Record<string, unknown>): Promise<string> {
        const baseUrl = this.client.chronosBaseUrl;
        const token = this.client.chronosMcpToken;
        if (!token) {
            return 'Erro: token MCP do Chronos não configurado. Configure kairos.chronosMcpToken nas Preferências.';
        }
        try {
            const resp = await fetch(`${baseUrl}/mcp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params: { name: tool, arguments: input },
                }),
            });
            if (!resp.ok) {
                return `Erro MCP HTTP ${resp.status}: ${await resp.text()}`;
            }
            const json = await resp.json();
            if (json.error) {
                return `Erro MCP: ${json.error.message || JSON.stringify(json.error)}`;
            }
            const content = json.result?.content;
            if (Array.isArray(content)) {
                return content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
            }
            return JSON.stringify(json.result, null, 2);
        } catch (e) {
            return `Erro ao conectar com Chronos MCP: ${e instanceof Error ? e.message : 'erro desconhecido'}`;
        }
    }
}

@injectable()
export class ChronosTasksGetTool implements KairosTool {
    readonly name = 'chronos_tasks_get';
    readonly description = 'Obter detalhes completos de uma tarefa específica do Chronos pelo ID ou ref.';
    readonly readOnly = true;
    readonly parameters = {
        type: 'object',
        properties: {
            task_id: { type: 'string', description: 'UUID da tarefa.' },
            ref: { type: 'string', description: 'Referência estável (personal:{uuid} ou board:{board}:{uuid}).' },
        },
    };

    @inject(KairosApiClient) protected readonly client!: KairosApiClient;

    async execute(args: Record<string, unknown>): Promise<string> {
        return this.callMcp('tasks_get', args);
    }

    protected async callMcp(tool: string, input: Record<string, unknown>): Promise<string> {
        const baseUrl = this.client.chronosBaseUrl;
        const token = this.client.chronosMcpToken;
        if (!token) {
            return 'Erro: token MCP do Chronos não configurado. Configure kairos.chronosMcpToken nas Preferências.';
        }
        try {
            const resp = await fetch(`${baseUrl}/mcp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params: { name: tool, arguments: input },
                }),
            });
            if (!resp.ok) {
                return `Erro MCP HTTP ${resp.status}: ${await resp.text()}`;
            }
            const json = await resp.json();
            if (json.error) {
                return `Erro MCP: ${json.error.message || JSON.stringify(json.error)}`;
            }
            const content = json.result?.content;
            if (Array.isArray(content)) {
                return content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
            }
            return JSON.stringify(json.result, null, 2);
        } catch (e) {
            return `Erro ao conectar com Chronos MCP: ${e instanceof Error ? e.message : 'erro desconhecido'}`;
        }
    }
}
