import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { KairosTool } from '../kairos-tool-registry';

@injectable()
export class ReadFileTool implements KairosTool {
    readonly name = 'read_file';
    readonly description = 'Ler o conteúdo de um arquivo do workspace. Use caminho relativo ao root do workspace.';
    readonly readOnly = true;
    readonly parameters = {
        type: 'object',
        required: ['path'],
        properties: {
            path: { type: 'string', description: 'Caminho do arquivo relativo ao workspace root.' },
            offset: { type: 'number', description: 'Linha inicial (1-based). Omita para ler desde o início.' },
            limit: { type: 'number', description: 'Número máximo de linhas a retornar.' },
        },
    };

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) {
            return 'Erro: nenhum workspace aberto.';
        }
        const filePath = String(args.path || '');
        if (!filePath) {
            return 'Erro: caminho do arquivo é obrigatório.';
        }
        const uri = roots[0].resource.resolve(filePath);
        try {
            const content = await this.fileService.read(uri);
            let lines = content.value.split('\n');
            const offset = typeof args.offset === 'number' ? Math.max(0, args.offset - 1) : 0;
            const limit = typeof args.limit === 'number' ? args.limit : undefined;
            if (offset > 0 || limit) {
                lines = lines.slice(offset, limit ? offset + limit : undefined);
            }
            const numbered = lines.map((line, i) => `${String(offset + i + 1).padStart(6)}|${line}`);
            if (numbered.length > 500) {
                return numbered.slice(0, 500).join('\n') + `\n... (truncado, ${lines.length} linhas totais)`;
            }
            return numbered.join('\n');
        } catch {
            return `Erro: não foi possível ler "${filePath}".`;
        }
    }
}
