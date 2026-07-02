import { injectable, inject } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { KairosTool } from '../kairos-tool-registry';

const SKIP = new Set(['node_modules', '.git', 'dist', 'lib', '.chronos-ide', '.yarn', 'vendor', '__pycache__']);

@injectable()
export class ListDirTool implements KairosTool {
    readonly name = 'list_dir';
    readonly description = 'Listar arquivos e pastas de um diretório do workspace. Retorna árvore com profundidade configurável.';
    readonly readOnly = true;
    readonly parameters = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Caminho relativo ao workspace root. Default: root.' },
            depth: { type: 'number', description: 'Profundidade máxima da árvore (default: 2).' },
        },
    };

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) return 'Erro: nenhum workspace aberto.';
        const dirPath = String(args.path || '');
        const maxDepth = typeof args.depth === 'number' ? args.depth : 2;
        const uri = dirPath ? roots[0].resource.resolve(dirPath) : roots[0].resource;

        try {
            const stat = await this.fileService.resolve(uri);
            if (!stat.isDirectory) return `"${dirPath || '.'}" não é um diretório.`;
            const lines = await this.walk(stat, 0, maxDepth);
            return lines.join('\n') || '(diretório vazio)';
        } catch {
            return `Erro: não foi possível listar "${dirPath || '.'}".`;
        }
    }

    private async walk(stat: FileStat, depth: number, maxDepth: number): Promise<string[]> {
        if (depth > maxDepth) return [];
        const lines: string[] = [];
        const resolved = stat.children ? stat : await this.fileService.resolve(stat.resource);
        const children = (resolved.children ?? [])
            .filter(c => !SKIP.has(c.name))
            .sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        const indent = '  '.repeat(depth);
        for (const child of children) {
            if (lines.length >= 120) {
                lines.push(`${indent}... (mais itens omitidos)`);
                break;
            }
            lines.push(`${indent}${child.name}${child.isDirectory ? '/' : ''}`);
            if (child.isDirectory && depth < maxDepth) {
                const sub = await this.walk(child, depth + 1, maxDepth);
                lines.push(...sub);
            }
        }
        return lines;
    }
}
