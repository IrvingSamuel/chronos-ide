import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceContribution, PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
import { KAIROS_DEFAULT_BASE_URL } from '../common/protocol';

export const KairosPreferenceSchema: PreferenceSchema = {
    properties: {
        'kairos.apiBaseUrl': {
            type: 'string',
            default: KAIROS_DEFAULT_BASE_URL,
            description: 'URL base do servidor do agente Kairos (ex.: https://api.chronos.com.pt).'
        },
        'kairos.apiToken': {
            type: 'string',
            default: '',
            description: 'Token Bearer emitido pelo console Kairos (console.chronos.com.pt). Necessário para autenticar as requisições.'
        },
        'kairos.model': {
            type: 'string',
            default: 'gemini-2.5-flash',
            description: 'Modelo padrão usado pelo Kairos (ex.: gemini-2.5-flash, gemini-2.5-pro).'
        }
    }
};

export function bindKairosPreferences(bind: interfaces.Bind): void {
    bind(PreferenceContribution).toConstantValue({ schema: KairosPreferenceSchema });
}
