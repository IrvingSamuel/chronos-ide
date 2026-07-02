import { injectable, inject } from '@theia/core/shared/inversify';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { KairosTool } from '../kairos-tool-registry';

@injectable()
export class SearchReplaceTool implements KairosTool {
    readonly name = 'search_replace';
    readonly description = 'Substituir uma string exata em um arquivo. Falha se old_string não for encontrada ou não for única (a menos que replace_all=true).';
    readonly readOnly = false;
    readonly parameters = {
        type: 'object',
        required: ['path', 'old_string', 'new_string'],
        properties: {
            path: { type: 'string', description: 'Caminho do arquivo relativo ao workspace root.' },
            old_string: { type: 'string', description: 'Texto exato a ser substituído.' },
            new_string: { type: 'string', description: 'Texto que vai substituir o old_string.' },
            replace_all: { type: 'boolean', description: 'Se true, substitui todas as ocorrências.' },
        },
    };

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async execute(args: Record<string, unknown>): Promise<string> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) return 'Erro: nenhum workspace aberto.';
        const filePath = String(args.path || '');
        const oldStr = String(args.old_string ?? '');
        const newStr = String(args.new_string ?? '');
        if (!filePath || !oldStr) return 'Erro: path e old_string são obrigatórios.';

        const uri = roots[0].resource.resolve(filePath);
        try {
            const content = await this.fileService.read(uri);
            let text = content.value;
            const replaceAll = !!args.replace_all;

            if (!text.includes(oldStr)) {
                return `Erro: old_string não encontrada em "${filePath}".`;
            }

            if (!replaceAll) {
                const firstIdx = text.indexOf(oldStr);
                const secondIdx = text.indexOf(oldStr, firstIdx + 1);
                if (secondIdx !== -1) {
                    return `Erro: old_string encontrada múltiplas vezes em "${filePath}". Use replace_all=true ou forneça mais contexto.`;
                }
                text = text.slice(0, firstIdx) + newStr + text.slice(firstIdx + oldStr.length);
            } else {
                text = text.split(oldStr).join(newStr);
            }

            const buf = BinaryBuffer.wrap(new TextEncoder().encode(text));
            await this.fileService.writeFile(uri, buf);
            return `Substituição realizada em "${filePath}" com sucesso.`;
        } catch (e) {
            return `Erro ao editar "${filePath}": ${e instanceof Error ? e.message : 'erro desconhecido'}.`;
        }
    }
}
