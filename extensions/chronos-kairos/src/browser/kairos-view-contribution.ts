import { injectable } from '@theia/core/shared/inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser';
import { KairosWidget } from './kairos-widget';

export const KAIROS_TOGGLE_COMMAND_ID = 'chronos.kairos.toggle';

@injectable()
export class KairosViewContribution extends AbstractViewContribution<KairosWidget> {
    constructor() {
        super({
            widgetId: KairosWidget.ID,
            widgetName: KairosWidget.LABEL,
            defaultWidgetOptions: { area: 'right', rank: 200 },
            toggleCommandId: KAIROS_TOGGLE_COMMAND_ID,
            toggleKeybinding: 'ctrlcmd+shift+k'
        });
    }
}
