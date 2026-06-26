import { injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { CHRONOS_LOGO_SVG } from './chronos-logo';

/**
 * Ajusta o título da janela/aba e o favicon para a identidade do Chronos IDE.
 * O nome em si vem de `theia.frontend.config.applicationName` ("Chronos IDE").
 */
@injectable()
export class ChronosBrandingContribution implements FrontendApplicationContribution {

    onStart(_app: FrontendApplication): void {
        const appName = FrontendApplicationConfigProvider.get().applicationName || 'Chronos IDE';
        document.title = appName;
        this.applyFavicon();
    }

    protected applyFavicon(): void {
        try {
            const url = 'data:image/svg+xml;base64,' + btoa(CHRONOS_LOGO_SVG);
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.type = 'image/svg+xml';
            link.href = url;
        } catch {
            // favicon é cosmético — falha não deve quebrar a aplicação
        }
    }
}
