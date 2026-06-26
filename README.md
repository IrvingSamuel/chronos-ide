# Chronos IDE

IDE própria do ecossistema **Chronos**, baseada em [Eclipse Theia](https://theia-ide.org/) 1.73, com o agente de IA **Kairos** embutido. Distribuída como aplicativo desktop (`.deb` / `.exe` / `.AppImage`) e como IDE no navegador (`ide.chronos.com.pt`).

> Ecossistema: **Chronos** (produto) · **Kairos** (agente) · **Aion** (memória) · **Hermes** (ferramentas).

## Estrutura (monorepo Yarn workspaces)

```
chronos-ide/
├── applications/
│   ├── browser/      # alvo navegador (servido em ide.chronos.com.pt)
│   └── electron/     # alvo desktop + electron-builder (.deb/.exe/.AppImage)
├── extensions/
│   ├── chronos-branding/   # nome, logo, favicon, splash, página inicial
│   └── chronos-kairos/     # painel de chat (SSE) ligado a api.chronos.com.pt
├── .github/workflows/ide-release.yml   # build dos instaladores (matrix Win/Linux)
└── deploy/                 # nginx + systemd para o host navegador
```

## Requisitos

- **Node.js ≥ 22** e **Yarn 1.x (classic)** — `npm install -g yarn@1.22.22`
- Linux: `build-essential libx11-dev libxkbfile-dev libsecret-1-dev` (deps nativas)

## Desenvolvimento

```bash
yarn install                 # instala tudo (baixa Electron; pode demorar)
yarn build:extensions        # compila chronos-branding e chronos-kairos

# Alvo navegador
yarn start:browser           # http://127.0.0.1:3000

# Alvo desktop (Electron)
yarn build:electron
yarn start:electron
```

## Gerar instaladores

> ⚠️ **`.exe` só pode ser gerado em Windows.** Em Linux saem `.deb`/`.AppImage`.
> A forma recomendada e portátil é via **GitHub Actions** (`.github/workflows/ide-release.yml`):
> dispare o workflow manualmente (*Run workflow*) ou crie uma tag `v0.1.0` — os instaladores
> saem como artefatos (e anexados ao Release, no caso da tag).

Localmente (apenas para o SO atual):

```bash
yarn package:electron        # saída em applications/electron/dist/
```

## Configurar o agente Kairos

O painel Kairos (atalho **Ctrl/Cmd+Shift+K**) fala com o `kairos-agent-server`. Em
**Preferências › kairos**:

| Preferência         | Padrão                      | Descrição                                   |
|---------------------|-----------------------------|---------------------------------------------|
| `kairos.apiBaseUrl` | `https://api.chronos.com.pt`| URL do servidor do agente                   |
| `kairos.apiToken`   | *(vazio)*                   | Token Bearer emitido em `console.chronos.com.pt` |
| `kairos.model`      | `gemini-2.5-flash`          | Modelo padrão                               |

## Trocar a logo / marca

Os assets são placeholders gerados a partir de `extensions/chronos-branding/resources/chronos-logo.svg`.
Para usar a logo oficial, substitua:
- `extensions/chronos-branding/resources/chronos-logo.svg` (fonte) e a constante em
  `extensions/chronos-branding/src/browser/chronos-logo.ts` (favicon + welcome);
- `applications/electron/resources/icons/icon.png` (512×512) e `icon.ico` (Windows);
- `applications/electron/resources/ChronosSplash.svg` (splash do desktop);
- `applications/*/resources/preload.html` (tela de carregamento).

O nome ("Chronos IDE") vem de `theia.frontend.config.applicationName` nos `package.json` das aplicações.

## Hospedar o host navegador (ide.chronos.com.pt)

Veja `deploy/`:
- `deploy/nginx/ide.chronos.com.pt.conf` — reverse proxy (WebSocket) → `127.0.0.1:7001`
- `deploy/systemd/chronos-theia.service` — roda `node src-gen/backend/main.js` (Node do nvm, porta 7001)

Fluxo: `yarn build:browser` no servidor → ajustar caminhos do service → `systemctl enable --now chronos-theia` → habilitar o site no nginx.
