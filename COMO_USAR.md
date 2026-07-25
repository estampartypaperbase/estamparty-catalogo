# Como usar o site da Estamparty

## 1. O que tem nessa pasta agora
- `index.html` — catálogo (busca, filtro, ordenar)
- `produto.html` — página individual de cada produto
- `sobre.html` — página institucional
- `dashboard.html` — painel de cadastro de produtos
- `bookmarklet.html` — botão pra importar dados de um anúncio do ML com 1 clique
- `admin/` — painel oficial via Decap CMS (alternativa mais robusta, opcional — veja passo 6)
- `produtos.json` — **onde os dados dos produtos ficam guardados**
- `style.css`, `produto.css`, `dashboard.css` — visual
- `script.js`, `produto.js`, `dashboard.js` — lógica
- `logo.png` — sua logo
- `sitemap.xml`, `robots.txt` — SEO básico (trocar "SEU-DOMINIO-AQUI" pelo domínio real depois)
- `ml-proxy/` — function auxiliar (não essencial se você usa o bookmarklet)

## 2. Publicar no GitHub Pages
Como o site busca o `produtos.json` via `fetch`, dois cliques no `index.html` não
funcionam — é preciso publicar:

1. Crie uma conta gratuita em github.com (se não tiver)
2. Crie um repositório novo (ex: `estamparty-catalogo`), público
3. Suba todos os arquivos dessa pasta pro repositório
4. Vá em **Settings > Pages**, em "Branch" escolha `main` e salve
5. Em 1-2 minutos, o GitHub te dá um link tipo `https://seu-usuario.github.io/estamparty-catalogo/`

Domínio próprio depois é opcional: compra em qualquer registrador e aponta em
Settings > Pages > "Custom domain".

## 3. Importando um produto do Mercado Livre (bookmarklet)
1. Acesse `SEU-LINK-DO-GITHUB-PAGES/bookmarklet.html`
2. Siga as instruções da página pra arrastar o botão **"📥 Importar pro Estamparty"**
   pra barra de favoritos do navegador
3. Daí em diante: abra um anúncio no Mercado Livre → clique no botão salvo → uma aba
   nova abre no dashboard já com nome, foto, preço e descrição preenchidos
4. Confira os dados, escolha a **categoria** (não vem sozinha), e troque o campo de
   link pelo seu **link de afiliado de verdade** (gerado no Portal do Afiliado do ML)
5. Clique em **"Salvar produto"**

Isso preenche o formulário — o produto só entra no site depois do passo 4 abaixo
(publicar).

## 4. Publicando as alterações — opção rápida (recomendada)
Configure uma vez e o dashboard salva direto no GitHub com 1 clique, sem baixar nada:

1. No GitHub, clique na sua **foto de perfil** → **Settings**
2. Menu da esquerda → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**
3. Dê um nome (ex: "Dashboard Estamparty")
4. Em **Repository access**, escolha **"Only select repositories"** → selecione
   `estamparty-catalogo`
5. Em **Permissions**, ache **"Contents"** e mude pra **"Read and write"**
6. **Generate token** e **copie o token** (só aparece uma vez)
7. No dashboard do site, seção **"⚙️ Publicar direto no GitHub"**:
   - "Usuário/Repositório": ex `estampartypaperbase/estamparty-catalogo`
   - "Token": cole o token copiado
   - Clique em **"Salvar configuração"**

Daí em diante, depois de cadastrar/editar produtos, clique em **"☁️ Publicar no
GitHub"** — ele salva sozinho, e o site atualiza em 1-2 minutos.

⚠️ Esse token só tem acesso a esse repositório específico (por causa das permissões
escolhidas), e fica salvo só no seu navegador — mesmo assim, não use em computador
compartilhado e não compartilhe o token com ninguém.

## 5. Publicando as alterações — opção manual (sem token)
Se preferir não configurar o token:

1. No dashboard, clique em **"⬇ Baixar produtos.json"**
2. No GitHub, abra o arquivo `produtos.json` → ícone de lápis → apague tudo → cole o
   conteúdo do arquivo baixado → **"Commit changes"**
3. O site atualiza em 1-2 minutos

## 6. Alternativa mais robusta (opcional): painel oficial via GitHub
Existe também um painel mais completo (pasta `admin/`, usando Decap CMS), mas ele exige
configurar um "OAuth proxy" separado — mais passos que o token da seção 4. Só vale a
pena se no futuro mais de uma pessoa for cadastrar produtos. Se quiser configurar,
me chama que eu te guio.

## 7. Editando `produtos.json` na mão (pra quem quiser)
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
- `video`: link de post/reels do Instagram — o site converte num player
- `linkML`: use o link de afiliado do Portal do Afiliado do Mercado Livre

## 8. WhatsApp
Em `index.html`, `produto.html` e `sobre.html`, procure `wa.me/5512920021678` e
troque pelo seu número (`55` + DDD + número, sem espaços, ex: `5511999998888`).

## 9. SEO (sitemap.xml e robots.txt)
Depois de ter o domínio final, abra `sitemap.xml` e `robots.txt` e troque
`SEU-DOMINIO-AQUI` pelo endereço real do site.

## 10. Sobre a busca automática — o que funcionou e o que não
Tentamos primeiro usar a API oficial do Mercado Livre, mas ela está bloqueando acesso
sem login para a maioria dos desenvolvedores atualmente. A solução que funcionou de
verdade foi o **bookmarklet** (seção 3) — ele lê a página igual você vê no navegador,
sem bloqueio nenhum, porque roda com a sua própria sessão. É o caminho recomendado.
A pasta `ml-proxy/` (function na Vercel) foi uma tentativa anterior e pode ser
ignorada/removida se quiser simplificar.

## 11. Página de vídeos do YouTube (youtube.html)
Puxa automaticamente todos os vídeos do canal `@EstampartyVideos` usando a API
gratuita do YouTube. Configuração única:

1. Acesse **console.cloud.google.com** (pode entrar com a mesma conta do Google
   que usa no YouTube)
2. Crie um projeto novo (nome qualquer, ex: "Estamparty Site")
3. No menu, vá em **"APIs e serviços" → "Biblioteca"**
4. Procure por **"YouTube Data API v3"** e clique em **"Ativar"**
5. Vá em **"APIs e serviços" → "Credenciais"** → **"Criar credenciais"** →
   **"Chave de API"**
6. Copie a chave gerada (uma sequência de letras/números)
7. **Importante — restrinja a chave por segurança:** clique na chave recém-criada →
   em "Restrições do aplicativo" escolha **"Sites"** → adicione
   `https://estampartypaperbase.github.io/*` → em "Restrições de API" escolha
   **"Restringir chave"** e marque só "YouTube Data API v3" → Salvar
8. Abra o arquivo `youtube.js`, ache a linha `const YT_API_KEY = ...` e cole sua
   chave no lugar de `"SUA_CHAVE_DA_API_AQUI"`
9. Suba o `youtube.js` atualizado pro repositório

Pronto — a página `youtube.html` passa a listar os vídeos automaticamente. É
gratuito até um limite bem alto de uso diário (dificilmente um catálogo pequeno
vai ultrapassar). Os vídeos só carregam de verdade (com som/player) quando a
pessoa clica na miniatura, pra não pesar o carregamento da página.

## 13. Novidades da página inicial
- **Carregar mais**: o catálogo mostra 12 produtos e revela mais 12 a cada clique,
  sem precisar de configuração
- **Nossa recomendação**: seção especial com foto grande, galeria, vídeo e
  descrição completa (com "Ver mais"). Gerencie no dashboard, seção
  "⭐ Nossa recomendação"
- **Formulário de novidades**: pessoas deixam nome e WhatsApp pra receber
  novidades. Veja a seção 14 pra configurar
- **Banner de LGPD**: aparece uma vez pra cada visitante, com link pra política
  de privacidade (`privacidade.html`)

## 14. Configurando o formulário de novidades (Formspree, gratuito)
O formulário usa o Formspree, um serviço gratuito (até 50 envios/mês no plano
grátis) que recebe as respostas por e-mail, sem precisar de servidor:

1. Acesse **formspree.io** e crie uma conta gratuita
2. Clique em **"New Form"**, dê um nome (ex: "Estamparty Novidades")
3. Copie a URL do formulário, algo como `https://formspree.io/f/abcdwxyz`
4. Abra o arquivo `newsletter.js`, ache a linha `const FORMSPREE_URL = ...` e
   troque pela sua URL
5. Suba o `newsletter.js` atualizado pro repositório

Pronto — cada cadastro chega no seu e-mail (o mesmo usado pra criar a conta no
Formspree). Dá pra ver o histórico completo também no painel do Formspree.

## 14.1 Opcional: também salvar numa planilha do Google Sheets
Além do e-mail do Formspree, dá pra fazer cada cadastro cair automaticamente numa
planilha, usando um recurso gratuito do Google (Apps Script):

1. Crie uma planilha nova no Google Sheets, com os cabeçalhos na primeira linha:
   `Data`, `Nome`, `WhatsApp`, `Consentimento`
2. No menu da planilha, vá em **Extensões → Apps Script**
3. Apague o conteúdo padrão e cole o código do arquivo `google-apps-script.js`
   que te entreguei
4. Clique em **"Implantar" → "Nova implantação"**
5. No ícone de engrenagem, escolha **"App da Web"**
6. Em "Executar como": **Eu**. Em "Quem pode acessar": **Qualquer pessoa**
7. Clique em **"Implantar"**, autorize o acesso quando pedir
8. Copie o link gerado (termina em `/exec`)
9. Abra o `newsletter.js`, ache `const GOOGLE_SHEETS_URL = ...` e cole o link
10. Suba o `newsletter.js` atualizado pro repositório

Pronto — cada cadastro agora vai **pro e-mail (Formspree) e pra planilha ao mesmo
tempo**. Se quiser usar só a planilha (sem o e-mail), pode ignorar o Formspree,
mas ele continua sendo útil como um "backup" caso a planilha dê algum problema.

## 16. Painel de SEO
Já configurei título, descrição e palavras-chave otimizadas pro seu nicho
(agenda escolar personalizada, papelaria personalizada, planner, etc). Também
adicionei dados estruturados (o que ajuda o Google a entender que você é uma loja),
sitemap.xml atualizado com todas as páginas, e a tag de compartilhamento (Open Graph).

Se quiser ajustar título/descrição/palavras-chave no futuro, sem mexer em código,
use o dashboard, seção **"🔍 SEO"**. Publique normalmente pelo botão — o mesmo
token do GitHub que você já configurou é reaproveitado.

**Um passo extra recomendado (fora daqui, no Google):**
1. Acesse **search.google.com/search-console**
2. Adicione seu site (a URL do GitHub Pages, ou o domínio próprio se já tiver)
3. Envie o sitemap: `sitemap.xml`
4. Isso ajuda o Google a indexar o site mais rápido (às vezes dias, ao invés de semanas)

## 18. Segurança: renovando o token do GitHub
Por segurança, é uma boa prática trocar o token do dashboard de tempos em tempos
(a cada 3-6 meses, por exemplo):
1. No GitHub: foto de perfil → Settings → Developer settings → Personal access
   tokens → Fine-grained tokens
2. Ache o token antigo ("Dashboard Estamparty") e clique em **"Delete"**
3. Gere um novo (mesmo processo da seção 4), com as mesmas permissões
4. Cole o novo token no dashboard, na seção ⚙️, e salve

## 19. Backup dos seus dados
Recomendo baixar uma cópia de segurança de tempos em tempos (ex: 1x por mês):
1. No dashboard, clique em **"⬇ Baixar produtos.json"**
2. Guarde esse arquivo numa pasta no seu computador (ex: "Backups Estamparty")
Isso te protege contra qualquer imprevisto (exclusão acidental, problema no GitHub, etc).

## 20. Configurando o Google Analytics (gratuito)
Pra saber quantas pessoas visitam seu site, de onde vêm e quais produtos são mais
clicados:
1. Acesse **analytics.google.com** e crie uma conta gratuita
2. Crie uma propriedade nova, escolha "Web"
3. Copie o **ID de medição** (formato `G-XXXXXXXXXX`)
4. Abra o arquivo `analytics.js`, troque `"G-SEU-ID-AQUI"` pelo seu ID
5. Suba o `analytics.js` atualizado

Os dados de visita começam a aparecer no painel do Analytics em algumas horas.

## 21. Páginas novas dessa versão
- **`faq.html`** — Perguntas Frequentes, com sanfona de pergunta/resposta
- **`404.html`** — página de erro personalizada (o GitHub Pages já usa ela
  automaticamente pra qualquer link quebrado do site)
- **Favicon** — o iconezinho da Tuguinha agora aparece na aba do navegador

## 22. Resumo de tudo que tem nessa versão
- Busca por texto e ordenação no catálogo
- Página própria por produto, com relacionados
- Página "Sobre"
- Botão flutuante de WhatsApp
- Tags Open Graph pra compartilhamento
- SEO básico (sitemap + robots.txt)
- Importação de produtos do ML por bookmarklet (1 clique)
- Publicação direto no GitHub pelo dashboard (token pessoal)
- Painel oficial via GitHub (Decap CMS) como alternativa mais robusta, opcional
