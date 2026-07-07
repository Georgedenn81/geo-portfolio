# Portfólio — George Denison

Site de portfólio estático (HTML/CSS/JS puro, sem framework/build) hospedado na
Vercel. Idioma de trabalho com o George: **português**.

## Arquivos principais
- `portfolio.html` — o site público. Tudo num arquivo: estilos, markup e JS.
- `admin.html` — painel administrativo (senha `geo@2025`). Edita o conteúdo e
  publica direto no GitHub via API.
- `api/translate.js` — função serverless na Vercel que traduz PT→EN.
- `vercel.json` — rewrite de `/` → `/portfolio.html`.
- `img/` — imagens; `video/` — vídeos.

## Como o conteúdo flui
1. No `admin.html` o George edita os dados (objeto `data`) — **só em português**.
2. Ao **PUBLICAR**, o admin lê o `portfolio.html` do GitHub, injeta os dados no
   bloco `<script id="__geo_admin_data__" type="application/json">` e dá commit.
3. A Vercel faz deploy automático no push. Domínio: **georgedenison.com**
   (DNS na Namecheap: A `@`→`216.198.79.1`, CNAME `www`→`cname.vercel-dns.com`).
   URL Vercel: `portfolio-seven-ashen-18.vercel.app`.
4. No site, `loadPortfolioData()` lê esse bloco e `applyAdminData()` renderiza.

Repositório: `Georgedenn81/geo-portfolio` (branch `main`). **O admin commita
sozinho** — sempre `git fetch`/`rebase` antes de dar push manual.

## Internacionalização (PT→EN)
- O admin é **só PT**. Ao publicar, `addTranslations()` (em `admin.html`) gera os
  campos `*_en` (ex.: `title_en`) chamando `/api/translate`, com cache em `LS`
  (`geo_tx_cache`) para não re-traduzir o que não mudou. Falha de tradução
  **nunca bloqueia** o publish (cai para PT).
- `api/translate.js`: usa DeepL se a env var `DEEPL_API_KEY` existir na Vercel;
  senão usa fallback gratuito do Google (sem chave). Traduz linha a linha
  preservando quebras (`\n`) e marcadores de destaque `*...*`.
- No site, `tv(obj, key)` devolve PT ou `key_en` conforme o idioma; o toggle
  re-renderiza tudo (`setLang`). Idioma persiste em `localStorage` (`geo_lang`).
- ⚠️ A tradução só roda quando o admin é aberto pela **URL da Vercel** (o
  `/api/translate` não existe em `file://`/preview).

## Textos editáveis das seções (aba "Sobre" → "Textos das Seções")
Campos `data.meet`, `data.about`, `data.quote`. Nos títulos grandes: `\n` = quebra
de linha, `*palavra*` = destaque verde. `fmtHeadline()` (site) converte em HTML.

## Convenções e armadilhas conhecidas
- **`LS` em vez de `localStorage`** no `admin.html`: wrapper com fallback em
  memória (o admin roda em sandbox no preview, onde `localStorage` lança erro).
- **Cards em destaque:** mostram a thumbnail; o vídeo só toca no lightbox ao
  clicar (NÃO usar modo background do Vimeo no card).
- **Limpeza de imagens:** ao publicar, `cleanupOrphanImages()` apaga do `img/` o
  que não está mais referenciado (salvaguarda: não apaga se a lista vier vazia).
- Uploads no admin prefixam timestamp ao nome (pode empilhar prefixos); a
  limpeza ao publicar evita acúmulo.
- **`.vercelignore` NÃO pode excluir `img/` nem `video/`** — o que estiver lá
  fica fora do deploy e dá 404 no ar mesmo estando no git (foi a causa do
  vídeo do hero sumir em 2026-07). Hoje só exclui `monteirodacosta/`.
- **Guarda automática:** o workflow `.github/workflows/checa-midia.yml` roda
  `scripts/checa_midia.py` a cada push e falha (GitHub avisa por e-mail) se
  alguma mídia referenciada no `portfolio.html` não existir no repo ou estiver
  no `.vercelignore`. Rode local antes de mexer em mídia:
  `python3 scripts/checa_midia.py`.
- A validação do publish (`collectMediaRefs` no admin) cobre URLs com `/img/`
  **e** `/video/`.
- **Aba do admin aberta = dado velho.** O admin publica o que está no estado
  local dele; uma aba antiga pode republicar caminhos/dados desatualizados por
  cima de correções. Depois de qualquer mudança via git, recarregar o admin
  (Cmd+Shift+R) antes de publicar.

## Deploy / verificação
- Deploy = push para `main` (auto-deploy Vercel). George autorizou publicar
  sempre, sem perguntar a cada vez.
- Este projeto é estático e sem servidor local configurado. Para verificar
  mudanças publicadas: checar dados/recursos via `curl` na URL da Vercel, ou
  pedir ao George para abrir e dar `Cmd+Shift+R`.
