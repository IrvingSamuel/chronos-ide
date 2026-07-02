import { injectable, inject } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { KairosTool } from '../kairos-tool-registry';

const SKIP = new Set(['node_modules', '.git', 'dist', 'lib', '.chronos-ide', '.yarn', 'vendor', '__pycache__']);
const BINARY_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'tar', 'gz']);
const MAX_RESULTS = 50;
const MAX_FILE_SIZE = 512_000;

@injectable()
export class GrepTool implements KairosTool {
    readonly name = 'grep';
    readonly description = 'Buscar por um padrão (regex ou texto literal) nos arquivos do workspace.';
    readonly readOnly = true;
    readonly parameters = {
        type: 'object',
        required: ['pattern'],
        properties: {
            pattern: { type: 'string', description: 'Padrão regex ou texto literal para buscar.' },
            path: { type: 'string', description: 'Subdiretório para restringir a busca (relativo ao root).' },
            glob: { type: 'string', description: 'Filtro glob de arquivos (ex.: "*.ts", "*.php").' },
        },
    };

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) return 'Erro: nenhum workspace aberto.';
        const pattern = String(args.pattern || '');
        if (!pattern) return 'Erro: pattern é obrigatório.';

        const searchPath = String(args.path || '');
        const glob = String(args.glob || '');
        const uri = searchPath ? roots[0].resource.resolve(searchPath) : roots[0].resource;
        const rootPath = roots[0].resource.path.toString();

        let regex: RegExp;
        try {
            regex = new RegExp(pattern, 'gi');
        } catch {
            regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }

        const globRegex = glob ? this.globToRegex(glob) : null;
        const results: string[] = [];

        const files = await this.collectFiles(uri, 5);
        for (const file of files) {
            if (results.length >= MAX_RESULTS) break;
            if (globRegex && !globRegex.test(file.name)) continue;
            const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
            if (BINARY_EXT.has(ext)) continue;

            try {
                const content = await this.fileService.read(file.resource, { limits: { size: MAX_FILE_SIZE } });
                const lines = content.value.split('\n');
                const relPath = file.resource.path.toString().replace(rootPath + '/', '');
                for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
                    regex.lastIndex = 0;
                    if (regex.test(lines[i])) {
                        results.push(`${relPath}:${i + 1}: ${lines[i].trimEnd()}`);
                    }
                }
            } catch {
                // skip unreadable files
            }
        }

        if (results.length === 0) return `Nenhum resultado encontrado para "${pattern}".`;
        const header = results.length >= MAX_RESULTS ? `Mostrando primeiros ${MAX_RESULTS} resultados:\n` : '';
        return header + results.join('\n');
    }

    private async collectFiles(uri: any, maxDepth: number, depth = 0): Promise<FileStat[]> {
        if (depth > maxDepth) return [];
        try {
            const stat = await this.fileService.resolve(uri);
            if (!stat.isDirectory) return [stat];
            const files: FileStat[] = [];
            for (const child of stat.children ?? []) {
                if (SKIP.has(child.name)) continue;
                if (child.isDirectory) {
                    files.push(...await this.collectFiles(child.resource, maxDepth, depth + 1));
                } else {
                    files.push(child);
                }
            }
            return files;
        } catch {
            return [];
        }
    }

    private globToRegex(glob: string): RegExp {
        const escaped = glob
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(escaped + '$', 'i');
    }
}
