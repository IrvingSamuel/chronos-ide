import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { KairosWidget } from './kairos-widget';
import { KairosViewContribution } from './kairos-view-contribution';
import { KairosApiClient } from './kairos-api-client';
import { bindKairosPreferences } from './kairos-preferences';
import '../../src/browser/style/kairos.css';

export default new ContainerModule(bind => {
    bind(KairosApiClient).toSelf().inSingletonScope();
    bindKairosPreferences(bind);

    bindViewContribution(bind, KairosViewContribution);

    bind(KairosWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: KairosWidget.ID,
        createWidget: () => ctx.container.get(KairosWidget)
    })).inSingletonScope();
});
