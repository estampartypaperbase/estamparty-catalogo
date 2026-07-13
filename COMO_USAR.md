# Como usar o site da Estamparty

## 1. O que tem nessa pasta agora
- `index.html` — catálogo (busca, filtro, ordenar)
- `produto.html` — página individual de cada produto
- `sobre.html` — página institucional
- `dashboard.html` — painel simples (salva só no seu navegador, exporta `produtos.json`)
- `admin/` — painel oficial (Decap CMS), salva direto no GitHub — veja o passo 4
- `produtos.json` — **onde os dados dos produtos ficam guardados**
- `style.css`, `produto.css`, `dashboard.css` — visual
- `script.js`, `produto.js`, `dashboard.js` — lógica
- `logo.png` — sua logo
- `sitemap.xml`, `robots.txt` — SEO básico (trocar "SEU-DOMINIO-AQUI" pelo domínio real depois)

## 2. Antes de tudo: publique no GitHub Pages
Como o site agora busca o `produtos.json` via `fetch`, **dois cliques no `index.html` não
funcionam mais** (é uma trava de segurança do navegador pra arquivos locais). A partir de
agora, teste sempre publicado:

1. Crie uma conta gratuita em github.com (se não tiver)
2. Crie um repositório novo (ex: `estamparty-catalogo`) — pode ser público
3. Suba todos os arquivos dessa pasta pro repositório (arrastar e soltar funciona,
   ou "Add file > Upload files" no site do GitHub)
4. Vá em **Settings > Pages**, em "Branch" escolha `main` e salve
5. Em 1-2 minutos, o GitHub te dá um link tipo `https://seu-usuario.github.io/estamparty-catalogo/`
6. Esse link já é o site funcionando de verdade — é nele que você testa daqui pra frente

Depois, se quiser um domínio próprio (ex: `estamparty.com.br`), você compra o domínio em
qualquer registrador e aponta pro GitHub Pages em Settings > Pages > "Custom domain".

## 3. Cadastrando produtos — opção simples (dashboard.html)
1. Publique o site (passo 2)
2. Abra `SEU-LINK-DO-GITHUB-PAGES/dashboard.html`
3. Preencha o formulário e clique em "Salvar produto"
4. No fim da página, clique em **"⬇ Baixar produtos.json"**
5. Vá no GitHub, no seu repositório, clique no arquivo `produtos.json` > ícone de lápis
   (editar) > apague tudo > cole o conteúdo do arquivo que você baixou > "Commit changes"
6. O site atualiza sozinho em 1-2 minutos

Funciona bem, mas tem esse passo manual de colar no GitHub toda vez.

## 4. Cadastrando produtos — opção completa (painel do GitHub, sem passo manual)
Essa é a melhoria grande: um painel que salva direto no repositório, sem você baixar nada.
Só precisa configurar uma vez:

1. Abra o arquivo `admin/config.yml`
2. Troque `SEU-USUARIO/SEU-REPOSITORIO` pelo nome do seu repositório no GitHub
   (ex: `joaosilva/estamparty-catalogo`)
3. Esse painel precisa de uma autorização seu-site ↔ GitHub (chamada de "OAuth"),
   que exige um pequeno intermediário gratuito. O caminho mais simples:
   - Acesse https://github.com/vencax/netlify-cms-github-oauth-provider
   - Clique no botão de "Deploy to Vercel" (gratuito, leva 2 minutos, pede só login
     com GitHub)
   - Na Vercel, ele vai pedir `OAUTH_CLIENT_ID` e `OAUTH_CLIENT_SECRET` — esses você
     gera em github.com > Settings > Developer settings > OAuth Apps > New OAuth App
     (Homepage URL = link do seu GitHub Pages; Callback URL = o link que a Vercel te
     der + `/callback`)
   - No fim, a Vercel te dá um link tipo `https://seu-projeto.vercel.app`
4. Volte no `admin/config.yml` e troque `SEU-OAUTH-PROXY.vercel.app` por esse link
5. Suba essa alteração pro GitHub
6. Acesse `SEU-LINK-DO-GITHUB-PAGES/admin/` — vai pedir login com GitHub, e depois
   disso você cadastra produto num formulário bonito, clica em salvar, e ele já
   commita no repositório sozinho

Esse passo 4 é o único "chato" de configurar, mas é feito **uma vez só**. Se preferir,
me chama que eu te guio ao vivo nessa parte, ou por enquanto use a opção 3 (mais simples).

## 5. Editando `produtos.json` na mão (pra quem quiser)
Também dá pra editar direto pelo GitHub (ícone de lápis no arquivo `produtos.json`).
Formato de cada produto:

```json
{
  "id": 5,
  "nome": "Nome do produto",
  "categoria": "Decoração",
  "preco": 49.90,
  "precoDe": 69.90,
  "imagem": "https://link-da-foto.jpg",
  "video": "",
  "descricao": "Descrição curta e chamativa.",
  "linkML": "https://mercadolivre.com/sec/SEU-LINK-DE-AFILIADO",
  "destaque": false
}
```

- `precoDe` e `video`: deixe como `""` se não tiver
- `video`: cole o link de um post/reels do Instagram — o site converte num player
- `imagem`: no anúncio do Mercado Livre, botão direito na foto > "Copiar endereço da imagem"
- `linkML`: use o link de afiliado do Portal do Afiliado do Mercado Livre

## 6. WhatsApp
Em `index.html`, `produto.html` e `sobre.html`, procure por `wa.me/5500000000000` e
troque pelo seu número, no formato `55` + DDD + número, sem espaços nem símbolos
(ex: `5511999998888`).

## 7. SEO (sitemap.xml e robots.txt)
Depois de ter o domínio final (do GitHub Pages ou próprio), abra `sitemap.xml` e
`robots.txt` e troque `SEU-DOMINIO-AQUI` pelo endereço real do site.

## 8. Resumo do que veio novo nessa versão
- Busca por texto e ordenação (menor preço, maior desconto) no catálogo
- Página própria por produto (`produto.html`), com produtos relacionados
- Página "Sobre"
- Botão flutuante de WhatsApp
- Tags Open Graph (link bonito ao compartilhar no WhatsApp/Instagram)
- `sitemap.xml` e `robots.txt` pra SEO básico
- Painel oficial via GitHub (Decap CMS) — resolve de vez o problema de salvar só
  no navegador
