import { injectable, inject } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { KairosTool } from '../kairos-tool-registry';

const BLOCKED_PATTERNS = [
    /rm\s+(-rf?|--recursive)\s+[\/~]/i,
    /git\s+push\s+.*--force/i,
    /git\s+reset\s+--hard/i,
    /mkfs/i,
    /dd\s+if=/i,
    /:(){ :\|:& };:/,
];

const MAX_OUTPUT = 32_000;
const DEFAULT_TIMEOUT = 30_000;

@injectable()
export class RunTerminalTool implements KairosTool {
    readonly name = 'run_terminal';
    readonly description = 'Executar um comando no terminal do workspace e retornar stdout/stderr. Comandos destrutivos são bloqueados por segurança.';
    readonly readOnly = false;
    readonly parameters = {
        type: 'object',
        required: ['command'],
        properties: {
            command: { type: 'string', description: 'Comando shell a executar.' },
            cwd: { type: 'string', description: 'Diretório de trabalho (relativo ao workspace root).' },
            timeout: { type: 'number', description: 'Timeout em milissegundos (default: 30000).' },
        },
    };

    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const command = String(args.command || '');
        if (!command) return 'Erro: comando é obrigatório.';

        for (const pat of BLOCKED_PATTERNS) {
            if (pat.test(command)) {
                return `Comando bloqueado por segurança: "${command}" corresponde a um padrão destrutivo.`;
            }
        }

        const roots = this.workspace.tryGetRoots();
        const rootPath = roots.length > 0 ? roots[0].resource.path.toString() : '/tmp';
        const cwdRel = String(args.cwd || '');
        const cwd = cwdRel ? `${rootPath}/${cwdRel}` : rootPath;
        const timeout = typeof args.timeout === 'number' ? args.timeout : DEFAULT_TIMEOUT;

        try {
            const result = await this.execCommand(command, cwd, timeout);
            return result;
        } catch (e) {
            return `Erro ao executar comando: ${e instanceof Error ? e.message : 'erro desconhecido'}`;
        }
    }

    private execCommand(command: string, cwd: string, timeout: number): Promise<string> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            // Use a server-side endpoint or fallback to a simple fetch-based approach.
            // In Theia browser context, we use a simplified approach via eval or backend.
            // For MVP, we'll note this needs a backend contribution for full terminal access.
            resolve(`[run_terminal] Comando programado: ${command}\nNota: execução de terminal requer contribuição backend do Kairos. Use o terminal integrado do Chronos IDE por enquanto.`);
        });
    }
}
