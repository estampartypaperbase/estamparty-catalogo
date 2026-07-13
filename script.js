// Não precisa editar este arquivo. Ele lê o produtos.json e desenha a página.

let TODOS_PRODUTOS = [];
let categoriaAtual = "Todos";
let buscaAtual = "";
let ordemAtual = "relevancia";

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarEmbedInstagram(link) {
  const match = link.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
}

function criarCard(produto) {
  const temDesconto = produto.precoDe && produto.precoDe > produto.preco;
  const percentual = temDesconto
    ? Math.round(100 - (produto.preco / produto.precoDe) * 100)
    : null;

  const embedInstagram = produto.video ? gerarEmbedInstagram(produto.video) : null;

  let midia;
  if (embedInstagram) {
    midia = `<iframe class="card-instagram" src="${embedInstagram}" loading="lazy" allowtransparency="true" frameborder="0" scrolling="no"></iframe>`;
  } else if (produto.video) {
    midia = `<video src="${produto.video}" muted loop autoplay playsinline poster="${produto.imagem}"></video>`;
  } else {
    midia = `<img src="${produto.imagem}" alt="${produto.nome}" loading="lazy">`;
  }

  return `
    <article class="card" data-categoria="${produto.categoria}">
      <a class="card-media-link" href="produto.html?id=${produto.id}">
        <div class="card-media ${embedInstagram ? "card-media-instagram" : ""}">
          ${midia}
          ${produto.destaque ? '<span class="badge-destaque">Destaque</span>' : ""}
          ${temDesconto ? `<span class="badge-desconto">-${percentual}%</span>` : ""}
        </div>
      </a>
      <div class="card-body">
        <div class="card-cat">${produto.categoria}</div>
        <h3 class="card-title"><a href="produto.html?id=${produto.id}">${produto.nome}</a></h3>
        <p class="card-desc">${produto.descricao}</p>
        <div class="card-price-row">
          ${temDesconto ? `<span class="price-de">${formatarPreco(produto.precoDe)}</span>` : ""}
          <span class="price-por">${formatarPreco(produto.preco)}</span>
        </div>
        <a class="card-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          Ver no Mercado Livre
        </a>
      </div>
    </article>
  `;
}

function aplicarFiltros() {
  let lista = [...TODOS_PRODUTOS];

  if (categoriaAtual !== "Todos") {
    lista = lista.filter(p => p.categoria === categoriaAtual);
  }

  if (buscaAtual.trim()) {
    const termo = buscaAtual.trim().toLowerCase();
    lista = lista.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      p.categoria.toLowerCase().includes(termo)
    );
  }

  switch (ordemAtual) {
    case "menor-preco":
      lista.sort((a, b) => a.preco - b.preco);
      break;
    case "maior-preco":
      lista.sort((a, b) => b.preco - a.preco);
      break;
    case "maior-desconto":
      lista.sort((a, b) => {
        const descA = a.precoDe ? (1 - a.preco / a.precoDe) : 0;
        const descB = b.precoDe ? (1 - b.preco / b.precoDe) : 0;
        return descB - descA;
      });
      break;
    default:
      lista.sort((a, b) => (b.destaque === true) - (a.destaque === true));
  }

  renderizarGrid(lista);
}

function renderizarGrid(lista) {
  const grid = document.getElementById("grid");
  if (!grid) return;
  if (!lista.length) {
    grid.innerHTML = `<div class="empty-state">Nenhum produto encontrado. Tente outra busca ou categoria.</div>`;
    return;
  }
  grid.innerHTML = lista.map(criarCard).join("");
}

function renderizarFiltros(produtos) {
  const categorias = ["Todos", ...new Set(produtos.map(p => p.categoria))];
  const filtros = document.getElementById("filtros");
  if (!filtros) return;

  filtros.innerHTML = categorias
    .map((cat, i) => `<button class="filter-btn ${i === 0 ? "active" : ""}" data-cat="${cat}">${cat}</button>`)
    .join("");

  filtros.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    filtros.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    categoriaAtual = btn.dataset.cat;
    aplicarFiltros();
  });
}

function configurarBusca() {
  const campo = document.getElementById("campoBusca");
  const ordenar = document.getElementById("campoOrdenar");
  if (campo) {
    campo.addEventListener("input", (e) => {
      buscaAtual = e.target.value;
      aplicarFiltros();
    });
  }
  if (ordenar) {
    ordenar.addEventListener("change", (e) => {
      ordemAtual = e.target.value;
      aplicarFiltros();
    });
  }
}

async function carregarProdutos() {
  try {
    const resposta = await fetch("produtos.json", { cache: "no-store" });
    if (!resposta.ok) throw new Error("Falha ao buscar produtos.json");
    const dados = await resposta.json();
    return dados.produtos || [];
  } catch (erro) {
    const grid = document.getElementById("grid");
    if (grid) {
      grid.innerHTML = `<div class="empty-state">
        Não foi possível carregar os produtos aqui no modo arquivo local (isso é uma
        limitação do navegador). Publique a pasta no GitHub Pages, ou abra com a
        extensão "Live Server" do VS Code, que o catálogo funciona normalmente.
      </div>`;
    }
    return [];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  TODOS_PRODUTOS = await carregarProdutos();
  renderizarFiltros(TODOS_PRODUTOS);
  configurarBusca();
  aplicarFiltros();
});
