import React from '@theia/core/shared/react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { GettingStartedWidget } from '@theia/getting-started/lib/browser/getting-started-widget';
import { CHRONOS_LOGO_URL } from './chronos-logo';

/**
 * Página inicial (welcome) com a identidade do Chronos IDE.
 * Substitui a tela "Getting Started" padrão do Theia.
 */
@injectable()
export class ChronosGettingStartedWidget extends GettingStartedWidget {

    @inject(CommandRegistry)
    protected readonly chronosCommands!: CommandRegistry;

    protected render(): React.ReactNode {
        const appName = FrontendApplicationConfigProvider.get().applicationName || 'Chronos IDE';
        return (
            <div className='chronos-gs'>
                <div className='chronos-gs-hero'>
                    <img className='chronos-gs-logo' src={CHRONOS_LOGO_URL} alt='Chronos' />
                    <h1 className='chronos-gs-title'>{appName}</h1>
                    <p className='chronos-gs-tag'>
                        O ambiente de desenvolvimento do ecossistema Chronos, com o agente <b>Kairos</b>.
                    </p>
                </div>
                <div className='chronos-gs-actions'>
                    <button className='chronos-gs-btn primary' onClick={this.openKairos}>Abrir o painel Kairos</button>
                    <button className='chronos-gs-btn' onClick={this.openFolder}>Abrir pasta…</button>
                    <button className='chronos-gs-btn' onClick={this.newFile}>Novo arquivo</button>
                    <button className='chronos-gs-btn' onClick={this.openCommands}>Paleta de comandos</button>
                </div>
                <div className='chronos-gs-foot'>Chronos&nbsp;·&nbsp;Kairos&nbsp;·&nbsp;Aion&nbsp;·&nbsp;Hermes</div>
            </div>
        );
    }

    protected openKairos = () => this.safeExec('chronos.kairos.toggle');
    protected openFolder = () => this.safeExec('workspace:openFolder', 'workspace:open', 'workspace:openWorkspace');
    protected newFile = () => this.safeExec('file.newUntitledFile', 'workbench.action.files.newUntitledFile', 'workbench.action.files.newUntitledTextFile');
    protected openCommands = () => this.safeExec('workbench.action.showCommands', 'core.quickCommand');

    /** Executa o primeiro comando existente e habilitado da lista (degradação suave). */
    protected safeExec(...ids: string[]): void {
        for (const id of ids) {
            if (this.chronosCommands.getCommand(id) && this.chronosCommands.isEnabled(id)) {
                this.chronosCommands.executeCommand(id);
                return;
            }
        }
    }
}
