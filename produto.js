function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarEmbedInstagram(link) {
  const match = link.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
}

function renderizarProduto(produto, todos) {
  document.getElementById("tituloPagina").textContent = `${produto.nome} — Estamparty`;
  document.getElementById("metaDescricao").setAttribute("content", produto.descricao);
  document.getElementById("ogTitulo").setAttribute("content", produto.nome);
  document.getElementById("ogDescricao").setAttribute("content", produto.descricao);
  document.getElementById("ogImagem").setAttribute("content", produto.imagem);

  const temDesconto = produto.precoDe && produto.precoDe > produto.preco;
  const embedInstagram = produto.video ? gerarEmbedInstagram(produto.video) : null;

  let midia;
  if (embedInstagram) {
    midia = `<iframe class="produto-instagram" src="${embedInstagram}" loading="lazy" allowtransparency="true" frameborder="0" scrolling="no"></iframe>`;
  } else {
    midia = `<img src="${produto.imagem}" alt="${produto.nome}">`;
  }

  const relacionados = todos
    .filter(p => p.categoria === produto.categoria && p.id !== produto.id)
    .slice(0, 3);

  const wrap = document.getElementById("produtoWrap");
  wrap.innerHTML = `
    <a href="index.html" class="voltar">← Voltar ao catálogo</a>
    <div class="produto-grid">
      <div class="produto-media">${midia}</div>
      <div class="produto-info">
        <div class="card-cat">${produto.categoria}</div>
        <h1>${produto.nome}</h1>
        <p class="produto-desc">${produto.descricao}</p>
        <div class="card-price-row" style="margin-bottom:20px;">
          ${temDesconto ? `<span class="price-de">${formatarPreco(produto.precoDe)}</span>` : ""}
          <span class="price-por" style="font-size:2rem;">${formatarPreco(produto.preco)}</span>
        </div>
        <a class="card-cta produto-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          Comprar no Mercado Livre
        </a>
        <p class="produto-aviso">Você será direcionado ao Mercado Livre para finalizar a compra com segurança.</p>
      </div>
    </div>

    ${relacionados.length ? `
      <h2 class="relacionados-titulo">Você também pode gostar</h2>
      <div class="grid relacionados-grid">
        ${relacionados.map(p => `
          <article class="card">
            <a href="produto.html?id=${p.id}">
              <div class="card-media"><img src="${p.imagem}" alt="${p.nome}"></div>
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
