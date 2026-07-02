import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { KairosWidget } from './kairos-widget';
import { KairosViewContribution } from './kairos-view-contribution';
import { KairosApiClient } from './kairos-api-client';
import { KairosWorkspaceContext } from './kairos-workspace-context';
import { KairosOrchestrator } from './kairos-orchestrator';
import { KairosToolRegistry, KairosTool } from './kairos-tool-registry';
import { KairosSkillLoader } from './kairos-skill-loader';
import { ReadFileTool } from './tools/read-file.tool';
import { WriteFileTool } from './tools/write-file.tool';
import { SearchReplaceTool } from './tools/search-replace.tool';
import { ListDirTool } from './tools/list-dir.tool';
import { GrepTool } from './tools/grep.tool';
import { RunTerminalTool } from './tools/run-terminal.tool';
import { ChronosTasksListTool, ChronosTasksCreateTool, ChronosTasksGetTool } from './tools/chronos-mcp.tool';
import { bindKairosPreferences } from './kairos-preferences';
import '../../src/browser/style/kairos.css';

export default new ContainerModule(bind => {
    bind(KairosApiClient).toSelf().inSingletonScope();
    bind(KairosWorkspaceContext).toSelf().inSingletonScope();
    bind(KairosToolRegistry).toSelf().inSingletonScope();
    bind(KairosSkillLoader).toSelf().inSingletonScope();
    bind(KairosOrchestrator).toSelf().inSingletonScope();
    bindKairosPreferences(bind);

    // Tools
    bind(KairosTool).to(ReadFileTool).inSingletonScope();
    bind(KairosTool).to(WriteFileTool).inSingletonScope();
    bind(KairosTool).to(SearchReplaceTool).inSingletonScope();
    bind(KairosTool).to(ListDirTool).inSingletonScope();
    bind(KairosTool).to(GrepTool).inSingletonScope();
    bind(KairosTool).to(RunTerminalTool).inSingletonScope();
    bind(KairosTool).to(ChronosTasksListTool).inSingletonScope();
    bind(KairosTool).to(ChronosTasksCreateTool).inSingletonScope();
    bind(KairosTool).to(ChronosTasksGetTool).inSingletonScope();

    bindViewContribution(bind, KairosViewContribution);

    bind(KairosWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: KairosWidget.ID,
        createWidget: () => ctx.container.get(KairosWidget)
    })).inSingletonScope();
});
