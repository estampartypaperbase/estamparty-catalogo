function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarEmbedVideo(link) {
  if (!link) return null;

  const instagram = link.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
  if (instagram) {
    return { tipo: "instagram", url: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed` };
  }

  const shortsMatch = link.match(/youtube\.com\/shorts\/([^/?]+)/);
  const youtuBeMatch = link.match(/youtu\.be\/([^/?]+)/);
  const watchMatch = link.match(/youtube\.com\/watch\?v=([^&]+)/);
  const idYoutube = (shortsMatch || youtuBeMatch || watchMatch || [])[1];
  if (idYoutube) {
    return { tipo: "youtube", url: `https://www.youtube.com/embed/${idYoutube}` };
  }

  return null;
}

function montarGaleria(produto) {
  const imagens = (produto.imagens && produto.imagens.length) ? produto.imagens : [produto.imagem];
  if (imagens.length <= 1) {
    return `<div class="produto-media"><img id="imgPrincipal" src="${imagens[0]}" alt="${produto.nome}"></div>`;
  }

  const miniaturas = imagens.map((url, i) => `
    <button class="galeria-mini ${i === 0 ? "ativa" : ""}" data-src="${url}">
      <img src="${url}" alt="Foto ${i + 1}">
    </button>
  `).join("");

  return `
    <div class="produto-media">
      <img id="imgPrincipal" src="${imagens[0]}" alt="${produto.nome}">
    </div>
    <div class="galeria-miniaturas">${miniaturas}</div>
  `;
}

function montarAvaliacao(produto) {
  if (!produto.avaliacao || (!produto.avaliacao.media && !produto.avaliacao.qtd)) return "";
  const media = produto.avaliacao.media ? `⭐ ${produto.avaliacao.media}` : "";
  const qtd = produto.avaliacao.qtd ? `(${produto.avaliacao.qtd} avaliações)` : "";
  return `<div class="produto-avaliacao">${media} ${qtd}</div>`;
}

function montarEspecificacoes(produto) {
  if (!produto.especificacoes || !produto.especificacoes.length) return "";

  const linhas = produto.especificacoes.map(linha => {
    const [chave, ...resto] = linha.split(":");
    const valor = resto.join(":").trim();
    return valor
      ? `<tr><th>${chave.trim()}</th><td>${valor}</td></tr>`
      : `<tr><td colspan="2">${linha}</td></tr>`;
  }).join("");

  return `
    <h2 class="specs-titulo">Características do produto</h2>
    <table class="specs-tabela"><tbody>${linhas}</tbody></table>
  `;
}

function montarVideo(produto) {
  const embed = gerarEmbedVideo(produto.video);
  if (!embed) return "";

  const classe = embed.tipo === "youtube" ? "produto-video-youtube" : "produto-instagram";
  return `
    <h2 class="specs-titulo">Vídeo</h2>
    <iframe class="${classe}" src="${embed.url}" loading="lazy" allowtransparency="true" frameborder="0" scrolling="no" allowfullscreen></iframe>
  `;
}

function renderizarProduto(produto, todos) {
  document.getElementById("tituloPagina").textContent = `${produto.nome} — Estamparty`;
  document.getElementById("metaDescricao").setAttribute("content", produto.descricao);
  document.getElementById("ogTitulo").setAttribute("content", produto.nome);
  document.getElementById("ogDescricao").setAttribute("content", produto.descricao);
  document.getElementById("ogImagem").setAttribute("content", produto.imagem || (produto.imagens && produto.imagens[0]) || "");

  const relacionados = todos
    .filter(p => p.categoria === produto.categoria && p.id !== produto.id)
    .slice(0, 3);

  const wrap = document.getElementById("produtoWrap");
  wrap.innerHTML = `
    <a href="index.html" class="voltar">← Voltar ao catálogo</a>
    <div class="produto-grid">
      ${montarGaleria(produto)}
      <div class="produto-info">
        <div class="card-cat">${produto.categoria}</div>
        <h1>${produto.nome}</h1>
        ${montarAvaliacao(produto)}
        <p class="produto-desc">${produto.descricao}</p>
        <div class="card-price-row" style="margin-bottom:20px;">
          <span class="price-por" style="font-size:2rem;">${formatarPreco(produto.preco)}</span>
        </div>
        <a class="card-cta produto-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          Comprar no Mercado Livre
        </a>
        <p class="produto-aviso">Você será direcionado ao Mercado Livre para finalizar a compra com segurança.</p>
      </div>
    </div>

    ${montarVideo(produto)}
    ${montarEspecificacoes(produto)}

    ${relacionados.length ? `
      <h2 class="relacionados-titulo">Você também pode gostar</h2>
      <div class="grid relacionados-grid">
        ${relacionados.map(p => `
          <article class="card">
            <a href="produto.html?id=${p.id}">
              <div class="card-media"><img src="${p.imagem || (p.imagens && p.imagens[0]) || ""}" alt="${p.nome}"></div>
            </a>
            <div class="card-body">
              <h3 class="card-title"><a href="produto.html?id=${p.id}">${p.nome}</a></h3>
              <div class="card-price-row"><span class="price-por">${formatarPreco(p.preco)}</span></div>
            </div>
          </article>
        `).join("")}
      </div>
    ` : ""}
  `;

  const miniaturas = wrap.querySelectorAll(".galeria-mini");
  const imgPrincipal = document.getElementById("imgPrincipal");
  miniaturas.forEach(btn => {
    btn.addEventListener("click", () => {
      imgPrincipal.src = btn.dataset.src;
      miniaturas.forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
    });
  });
}

async function iniciar() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const wrap = document.getElementById("produtoWrap");

  try {
    const resposta = await fetch("produtos.json", { cache: "no-store" });
    const dados = await resposta.json();
    const produtos = dados.produtos || [];
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
      wrap.innerHTML = `<div class="empty-state">Produto não encontrado. <a href="index.html">Voltar ao catálogo</a>.</div>`;
      return;
    }
    renderizarProduto(produto, produtos);
  } catch (erro) {
    wrap.innerHTML = `<div class="empty-state">
      Não foi possível carregar aqui no modo arquivo local. Publique no GitHub Pages
      ou use a extensão "Live Server" do VS Code pra testar.
    </div>`;
  }
}

iniciar();
