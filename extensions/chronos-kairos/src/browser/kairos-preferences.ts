import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceContribution, PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';
import { KAIROS_DEFAULT_BASE_URL, KAIROS_DEFAULT_CHRONOS_URL } from '../common/protocol';

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
        },
        'kairos.chronosBaseUrl': {
            type: 'string',
            default: KAIROS_DEFAULT_CHRONOS_URL,
            description: 'URL base do organizador Chronos para chamadas MCP (ex.: https://organizador.rezumme.ai).'
        },
        'kairos.chronosMcpToken': {
            type: 'string',
            default: '',
            description: 'Token de autenticação MCP do Chronos (rzm_...). Permite que o Kairos acesse tarefas e dados reais.'
        },
        'kairos.mode': {
            type: 'string',
            enum: ['agent', 'ask', 'plan'],
            default: 'agent',
            description: 'Modo de operação do Kairos: agent (todas as ferramentas), ask (somente leitura), plan (planejar antes de executar).'
        },
        'kairos.maxAgentSteps': {
            type: 'number',
            default: 25,
            description: 'Número máximo de iterações do loop de agente antes de parar automaticamente.'
        }
    }
};

export function bindKairosPreferences(bind: interfaces.Bind): void {
    bind(PreferenceContribution).toConstantValue({ schema: KairosPreferenceSchema });
}
