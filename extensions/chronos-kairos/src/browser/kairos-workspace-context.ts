import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { EditorManager } from '@theia/editor/lib/browser';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'lib', '.chronos-ide', '.yarn', 'vendor']);
const MAX_FILE_TREE_DEPTH = 2;
const MAX_FILE_CHARS = 12_000;
const MAX_TREE_LINES = 80;

@injectable()
export class KairosWorkspaceContext {

    @inject(WorkspaceService)
    protected readonly workspace!: WorkspaceService;

    @inject(FileService)
    protected readonly fileService!: FileService;

    @inject(EditorManager)
    protected readonly editorManager!: EditorManager;

    async buildSystemPrompt(): Promise<string> {
        const parts: string[] = [
            'You are Kairos, the code-agent of Chronos IDE. You help the developer understand, write, and maintain code in the open workspace.',
            'Respond in the same language the user writes in (Portuguese or English).',
            'Use markdown for formatting: fenced code blocks with language tags, headings, lists, and **bold**.',
            'When referring to files, use paths relative to the workspace root when possible.',
        ];

        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) {
            parts.push('', '## Current workspace', 'No folder is open. Ask the user to open a workspace folder (File > Open Folder) before analyzing a repository.');
            return parts.join('\n');
        }

        const root = roots[0];
        const rootPath = root.resource.path.toString();
        parts.push('', '## Current workspace', `- Root: \`${rootPath}\``);

        const treeLines = await this.buildFileTree(root, 0);
        if (treeLines.length > 0) {
            parts.push('', '## File tree', '```', ...treeLines, '```');
        }

        const active = await this.describeActiveEditor(root.resource);
        if (active) {
            parts.push('', active);
        }

        return parts.join('\n');
    }

    protected async buildFileTree(stat: FileStat, depth: number): Promise<string[]> {
        if (depth > MAX_FILE_TREE_DEPTH) {
            return [];
        }
        const lines: string[] = [];
        try {
            const resolved = stat.isDirectory
                ? await this.fileService.resolve(stat.resource)
                : stat;
            const children = (resolved.children ?? [])
                .filter(c => !SKIP_DIRS.has(c.name))
                .sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) {
                        return a.isDirectory ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
            const indent = '  '.repeat(depth);
            for (const child of children) {
                if (lines.length >= MAX_TREE_LINES) {
                    lines.push(`${indent}...`);
                    return lines;
                }
                lines.push(`${indent}${child.name}${child.isDirectory ? '/' : ''}`);
                if (child.isDirectory && depth < MAX_FILE_TREE_DEPTH) {
                    const childResolved = await this.fileService.resolve(child.resource);
                    const sub = await this.buildFileTree(childResolved, depth + 1);
                    lines.push(...sub);
                }
            }
        } catch {
            // workspace may be unreadable — skip tree
        }
        return lines;
    }

    protected async describeActiveEditor(workspaceRoot: URI): Promise<string | undefined> {
        const widget = this.editorManager.currentEditor ?? this.editorManager.activeEditor;
        if (!widget) {
            return undefined;
        }
        const editor = widget.editor;
        const rel = workspaceRoot.relative(editor.uri)?.toString() ?? editor.uri.path.toString();
        const doc = editor.document;
        const selection = editor.selection;
        const hasSelection = selection
            && (selection.start.line !== selection.end.line
                || selection.start.character !== selection.end.character);

        let content: string;
        let label: string;
        if (hasSelection) {
            content = doc.getText(selection);
            label = `Selection in \`${rel}\` (lines ${selection.start.line + 1}-${selection.end.line + 1})`;
        } else {
            content = doc.getText();
            label = `Active file: \`${rel}\` (${doc.lineCount} lines)`;
        }

        if (content.length > MAX_FILE_CHARS) {
            content = content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)';
        }

        const ext = rel.includes('.') ? rel.split('.').pop()!.toLowerCase() : '';
        const fence = ext || 'text';
        return [
            '## Editor context',
            label,
            '',
            `\`\`\`${fence}`,
            content,
            '```',
        ].join('\n');
    }
}
