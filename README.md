# Electron + Next.js

Projeto base para desenvolvimento de aplicativo desktop com **Electron** e **Next.js**.

## Estrutura

- `electron/` — processo principal do Electron (`main.js`, `preload.js`)
- `app/` — aplicação Next.js (App Router)
- Em desenvolvimento: Electron abre a janela em `http://localhost:3000`
- Em produção: Next.js é exportado como estático (`out/`) e servido pelo Electron

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Comandos

```bash
# Instalar dependências
npm install

# Desenvolvimento (Next.js + Electron)
npm run dev

# Build para produção (gera pasta out/ com o Next.js estático)
npm run build

# Rodar o app em modo produção (após npm run build)
npm run start

# Gerar instalador (após npm run build)
npm run dist
```

## Desenvolvimento

1. `npm install`
2. `npm run dev` — inicia o servidor Next.js e, quando estiver pronto, abre a janela do Electron.
3. Edite os arquivos em `app/` (e em `electron/` se precisar). O Next.js recarrega automaticamente.

## API do Electron no frontend

O preload expõe `window.electronAPI` com:

- `platform` — sistema operacional (win32, darwin, linux)
- `versions` — versões de Node, Chrome e Electron

Exemplo:

```ts
if (window.electronAPI) {
  console.log(window.electronAPI.platform);
  console.log(window.electronAPI.versions.electron);
}
```

Para expor mais funções do Electron (arquivos, diálogos, etc.), edite `electron/preload.js` e use `contextBridge.exposeInMainWorld`.
