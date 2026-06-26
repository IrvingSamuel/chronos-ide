import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { GettingStartedWidget } from '@theia/getting-started/lib/browser/getting-started-widget';
import { ChronosGettingStartedWidget } from './chronos-getting-started-widget';
import { ChronosBrandingContribution } from './chronos-frontend-contribution';
import '../../src/browser/style/branding.css';

export default new ContainerModule((bind, _unbind, _isBound, rebind) => {
    // Título da janela + favicon
    bind(ChronosBrandingContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ChronosBrandingContribution);

    // Página inicial (welcome) com a marca Chronos
    rebind(GettingStartedWidget).to(ChronosGettingStartedWidget);
});
