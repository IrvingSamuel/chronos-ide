import { injectable, inject } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import URI from '@theia/core/lib/common/uri';

export interface KairosSkill {
    name: string;
    path: string;
    content: string;
}

const SKILL_DIRS = ['.kairos/skills', '.cursor/skills'];
const SKILL_FILE = 'SKILL.md';
const MAX_SKILL_SIZE = 16_000;

@injectable()
export class KairosSkillLoader {

    @inject(FileService) protected readonly fileService!: FileService;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;

    async listSkills(): Promise<KairosSkill[]> {
        const roots = this.workspace.tryGetRoots();
        if (roots.length === 0) return [];

        const root = roots[0].resource;
        const skills: KairosSkill[] = [];

        for (const dir of SKILL_DIRS) {
            const dirUri = root.resolve(dir);
            try {
                const stat = await this.fileService.resolve(dirUri);
                if (!stat.isDirectory || !stat.children) continue;

                for (const child of stat.children) {
                    if (!child.isDirectory) continue;
                    const skillUri = child.resource.resolve(SKILL_FILE);
                    try {
                        const content = await this.fileService.read(skillUri, { limits: { size: MAX_SKILL_SIZE } });
                        skills.push({
                            name: child.name,
                            path: `${dir}/${child.name}/${SKILL_FILE}`,
                            content: content.value,
                        });
                    } catch {
                        // skill dir without SKILL.md — skip
                    }
                }
            } catch {
                // dir doesn't exist — skip
            }
        }

        return skills;
    }

    async getSkill(name: string): Promise<KairosSkill | undefined> {
        const skills = await this.listSkills();
        return skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    }

    buildSkillsPromptSection(skills: KairosSkill[]): string {
        if (skills.length === 0) return '';
        const parts = ['', '## Available Skills'];
        for (const skill of skills) {
            parts.push(`- **${skill.name}** (${skill.path})`);
        }
        parts.push('', 'Use the /skill command or mention a skill by name to load its instructions.');
        return parts.join('\n');
    }
}
