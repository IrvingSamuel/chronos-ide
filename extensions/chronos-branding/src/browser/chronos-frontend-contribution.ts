import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { CommandRegistry } from '@theia/core/lib/common';
import { CHRONOS_LOGO_URL } from './chronos-logo';

@injectable()
export class ChronosBrandingContribution implements FrontendApplicationContribution {

    @inject(CommandRegistry)
    protected readonly commands!: CommandRegistry;

    onStart(_app: FrontendApplication): void {
        const appName = FrontendApplicationConfigProvider.get().applicationName || 'Chronos IDE';
        document.title = appName;
        this.applyFavicon();
        this.openChronosSidebarOnFirstLaunch();
    }

    protected applyFavicon(): void {
        try {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.type = 'image/png';
            link.href = CHRONOS_LOGO_URL;
        } catch {
            // favicon is cosmetic — failure must not break the app
        }
    }

    protected openChronosSidebarOnFirstLaunch(): void {
        const key = 'chronos.sidebarShown';
        if (localStorage.getItem(key)) {
            return;
        }
        localStorage.setItem(key, '1');
        setTimeout(() => {
            if (this.commands.getCommand('chronos.account') && this.commands.isEnabled('chronos.account')) {
                this.commands.executeCommand('chronos.account');
            }
        }, 2000);
    }
}
