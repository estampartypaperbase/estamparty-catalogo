// Não precisa editar este arquivo. Ele lê o produtos.json e desenha a página.

let TODOS_PRODUTOS = [];
let categoriaAtual = "Todos";
let buscaAtual = "";
let ordemAtual = "relevancia";

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function criarCard(produto) {
  const imagemPrincipal = produto.imagem || (produto.imagens && produto.imagens[0]) || "";

  return `
    <article class="card" data-categoria="${produto.categoria}">
      <a class="card-media-link" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
        <div class="card-media">
          <img src="${imagemPrincipal}" alt="${produto.nome}" loading="lazy">
          ${produto.novo ? '<span class="badge-novo">Novo</span>' : ""}
          ${produto.destaque ? '<span class="badge-destaque-topo">Destaque</span>' : ""}
        </div>
      </a>
      <div class="card-body">
        <div class="card-cat">${produto.categoria}</div>
        <h3 class="card-title"><a href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">${produto.nome}</a></h3>
        <div class="card-price-row">
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

async function carregarBanners() {
  const slider = document.getElementById("heroSlider");
  if (!slider) return;

  try {
    const resposta = await fetch("banners.json", { cache: "no-store" });
    const dados = await resposta.json();
    const ehMobile = window.matchMedia("(max-width: 900px)").matches;
    const listaEscolhida = ehMobile ? dados.bannersMobile : dados.bannersDesktop;
    const banners = (listaEscolhida || []).slice(0, 3);
    if (!banners.length) { slider.style.display = "none"; return; }

    slider.innerHTML = banners.map((b, i) => {
      const img = `<img src="${b.imagem}" alt="Banner ${i + 1}">`;
      const conteudo = b.link
        ? `<a href="${b.link}" target="_blank" rel="noopener noreferrer">${img}</a>`
        : img;
      return `<div class="hero-slider-slide ${i === 0 ? "ativo" : ""}">${conteudo}</div>`;
    }).join("") + (banners.length > 1 ? `
      <div class="hero-slider-dots">
        ${banners.map((_, i) => `<span class="${i === 0 ? "ativo" : ""}"></span>`).join("")}
      </div>
    ` : "");

    if (banners.length > 1) {
      let atual = 0;
      const slides = slider.querySelectorAll(".hero-slider-slide");
      const dots = slider.querySelectorAll(".hero-slider-dots span");
      setInterval(() => {
        slides[atual].classList.remove("ativo");
        dots[atual].classList.remove("ativo");
        atual = (atual + 1) % slides.length;
        slides[atual].classList.add("ativo");
        dots[atual].classList.add("ativo");
      }, 4000);
    }
  } catch (erro) {
    slider.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", carregarBanners);

document.addEventListener("DOMContentLoaded", async () => {
  TODOS_PRODUTOS = await carregarProdutos();
  if (!TODOS_PRODUTOS.length) return; // erro já foi mostrado dentro de carregarProdutos()
  renderizarFiltros(TODOS_PRODUTOS);
  configurarBusca();
  aplicarFiltros();
});

