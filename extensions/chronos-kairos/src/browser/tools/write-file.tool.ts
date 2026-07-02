import { injectable, inject } from '@theia/core/shared/inversify';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { KairosTool } from '../kairos-tool-registry';

@injectable()
export class WriteFileTool implements KairosTool {
    readonly name = 'write_file';
    readonly description = 'Escrever conteúdo em um arquivo do workspace. Cria o arquivo se não existir, sobrescreve se existir.';
    readonly readOnly = false;
    readonly parameters = {
        type: 'object',
        required: ['path', 'content'],
        properties: {
            path: { type: 'string', description: 'Caminho do arquivo relativo ao workspace root.' },
            content: { type: 'string', description: 'Conteúdo completo a ser escrito no arquivo.' },
        },
    };

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) return 'Erro: nenhum workspace aberto.';
        const filePath = String(args.path || '');
        const content = String(args.content ?? '');
        if (!filePath) return 'Erro: caminho do arquivo é obrigatório.';

        const uri = roots[0].resource.resolve(filePath);
        try {
            const buf = BinaryBuffer.wrap(new TextEncoder().encode(content));
            try {
                await this.fileService.readFile(uri);
                await this.fileService.writeFile(uri, buf);
            } catch {
                await this.fileService.createFile(uri, buf);
            }
            const lineCount = content.split('\n').length;
            return `Arquivo "${filePath}" salvo com sucesso (${lineCount} linhas).`;
        } catch (e) {
            return `Erro ao escrever "${filePath}": ${e instanceof Error ? e.message : 'erro desconhecido'}.`;
        }
    }
}
