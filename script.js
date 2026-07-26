// Não precisa editar este arquivo. Ele lê o produtos.json e desenha a página.

let TODOS_PRODUTOS = [];
let categoriaAtual = "Todos";
let buscaAtual = "";
let ordemAtual = "relevancia";
let listaFiltradaAtual = [];
let itensVisiveis = 12;
const ITENS_POR_PAGINA = 12;

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function criarCard(produto) {
  const imagemPrincipal = produto.imagem || (produto.imagens && produto.imagens[0]) || "";

  return `
    <article class="card" data-categoria="${produto.categoria}">
      <a class="card-media-link" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-id="${produto.id}">
        <div class="card-media">
          <img src="${imagemPrincipal}" alt="${produto.nome}" loading="lazy">
          ${produto.novo ? '<span class="badge-novo">Novo</span>' : ""}
          ${produto.destaque ? '<span class="badge-destaque-topo">Destaque</span>' : ""}
        </div>
      </a>
      <div class="card-body">
        <div class="card-top-row">
          <div class="card-cat">${produto.categoria}</div>
          <div class="card-icones">
            <button class="btn-favorito ${ehFavorito(produto.id) ? "ativo" : ""}" data-id="${produto.id}" aria-label="Favoritar">${ehFavorito(produto.id) ? "♥" : "♡"}</button>
            <button class="btn-compartilhar" data-nome="${produto.nome}" data-link="${produto.linkML}" aria-label="Compartilhar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
            </button>
          </div>
        </div>
        <h3 class="card-title"><a href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-id="${produto.id}">${produto.nome}</a></h3>
        <div class="card-price-row">
          <span class="price-por">${formatarPreco(produto.preco)}</span>
        </div>
        <a class="card-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          <img src="mercadolivre-icon.png" alt="" class="cta-icone-ml">
          Ver no Mercado Livre
        </a>
        <div class="selo-seguranca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
          Compra segura pelo Mercado Livre
        </div>
      </div>
    </article>
  `;
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

function distanciaEdicao(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99; // atalho: já é diferente demais
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function textoContemAproximado(textoCompleto, termoBusca) {
  const textoNorm = normalizarTexto(textoCompleto);
  const termoNorm = normalizarTexto(termoBusca);
  if (textoNorm.includes(termoNorm)) return true;

  // Tolera 1 letra errada por palavra (ex: "escolr" acha "escolar")
  const palavrasTexto = textoNorm.split(/\s+/);
  const palavrasTermo = termoNorm.split(/\s+/);
  return palavrasTermo.every(palavraTermo =>
    palavrasTexto.some(palavraTexto => {
      if (palavraTexto.includes(palavraTermo) || palavraTermo.includes(palavraTexto)) return true;
      if (palavraTermo.length < 4) return false;
      return distanciaEdicao(palavraTexto, palavraTermo) <= 1;
    })
  );
}

function aplicarFiltros() {
  let lista = [...TODOS_PRODUTOS];

  if (categoriaAtual === "__novidades__") {
    lista = lista.filter(p => p.novo);
  } else if (categoriaAtual === "__favoritos__") {
    const favoritos = obterFavoritos();
    lista = lista.filter(p => favoritos.includes(p.id));
  } else if (categoriaAtual !== "Todos") {
    lista = lista.filter(p => p.categoria === categoriaAtual);
  }

  if (buscaAtual.trim()) {
    lista = lista.filter(p =>
      textoContemAproximado(p.nome, buscaAtual) ||
      textoContemAproximado(p.descricao || "", buscaAtual) ||
      textoContemAproximado(p.categoria, buscaAtual)
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

  listaFiltradaAtual = lista;
  itensVisiveis = ITENS_POR_PAGINA;
  renderizarGrid(lista);
}

function renderizarGrid(lista) {
  const grid = document.getElementById("grid");
  if (!grid) return;
  if (!lista.length) {
    grid.innerHTML = `<div class="empty-state">Nenhum produto encontrado. Tente outra busca ou categoria.</div>`;
    return;
  }

  const visiveis = lista.slice(0, itensVisiveis);
  grid.innerHTML = visiveis.map(criarCard).join("");

  const areaBotao = document.getElementById("areaCarregarMais");
  if (areaBotao) {
    areaBotao.innerHTML = itensVisiveis < lista.length
      ? `<button class="btn-carregar-mais" id="btnCarregarMais">Carregar mais produtos</button>`
      : "";

    const btn = document.getElementById("btnCarregarMais");
    if (btn) {
      btn.addEventListener("click", () => {
        itensVisiveis += ITENS_POR_PAGINA;
        renderizarGrid(listaFiltradaAtual);
      });
    }
  }
}

function renderizarFiltros(produtos) {
  const categorias = ["Todos", ...new Set(produtos.map(p => p.categoria))];
  const filtros = document.getElementById("filtros");
  const filtrosMobile = document.getElementById("filtrosMobile");
  if (!filtros) return;

  const temNovidades = produtos.some(p => p.novo);

  filtros.innerHTML = categorias
    .map((cat, i) => `<button class="filter-btn ${i === 0 ? "active" : ""}" data-cat="${cat}">${cat}</button>`)
    .join("")
    + (temNovidades ? `<button class="filter-btn filter-novidades" data-cat="__novidades__">🆕 Novidades</button>` : "")
    + `<button class="filter-btn filter-favoritos" data-cat="__favoritos__">❤ Favoritos</button>`;

  if (filtrosMobile) {
    filtrosMobile.innerHTML = categorias
      .map(cat => `<option value="${cat}">${cat === "Todos" ? "Categorias" : cat}</option>`)
      .join("")
      + (temNovidades ? `<option value="__novidades__">🆕 Novidades</option>` : "")
      + `<option value="__favoritos__">❤ Favoritos</option>`;
  }

  function selecionarCategoria(cat) {
    filtros.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    if (filtrosMobile) filtrosMobile.value = cat;
    categoriaAtual = cat;
    aplicarFiltros();
  }

  filtros.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    selecionarCategoria(btn.dataset.cat);
  });

  if (filtrosMobile) {
    filtrosMobile.addEventListener("change", () => selecionarCategoria(filtrosMobile.value));
  }
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
      const img = `<img src="${b.imagem}" alt="Banner ${i + 1}" ${i === 0 ? "" : 'loading="lazy"'}>`;
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

// ---------- Vistos recentemente ----------
const VISTOS_CHAVE = "estamparty_vistos";
const VISTOS_MAX = 8;

function registrarVisto(produto) {
  let vistos = [];
  try { vistos = JSON.parse(localStorage.getItem(VISTOS_CHAVE)) || []; } catch (e) { /* ignora */ }

  vistos = vistos.filter(v => v.id !== produto.id);
  vistos.unshift({
    id: produto.id,
    nome: produto.nome,
    imagem: produto.imagem || (produto.imagens && produto.imagens[0]) || "",
    preco: produto.preco,
    linkML: produto.linkML
  });
  vistos = vistos.slice(0, VISTOS_MAX);
  localStorage.setItem(VISTOS_CHAVE, JSON.stringify(vistos));
}

function renderizarVistosRecentemente() {
  const wrap = document.getElementById("vistosRecentementeWrap");
  if (!wrap) return;

  let vistos = [];
  try { vistos = JSON.parse(localStorage.getItem(VISTOS_CHAVE)) || []; } catch (e) { /* ignora */ }

  if (!vistos.length) { wrap.style.display = "none"; return; }

  wrap.style.display = "";
  wrap.innerHTML = `
    <h2 class="vistos-titulo">Vistos recentemente</h2>
    <div class="vistos-trilho">
      ${vistos.map(v => `
        <a class="vistos-item" href="${v.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          <img src="${v.imagem}" alt="${v.nome}">
          <div class="vistos-item-nome">${v.nome}</div>
          <div class="vistos-item-preco">${formatarPreco(v.preco)}</div>
        </a>
      `).join("")}
    </div>
  `;
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-id]");
  if (!link || !link.closest(".card")) return;
  const id = Number(link.dataset.id);
  const produto = TODOS_PRODUTOS.find(p => p.id === id);
  if (produto) registrarVisto(produto);
});

document.addEventListener("DOMContentLoaded", carregarBanners);

document.addEventListener("DOMContentLoaded", async () => {
  TODOS_PRODUTOS = await carregarProdutos();
  if (!TODOS_PRODUTOS.length) return; // erro já foi mostrado dentro de carregarProdutos()
  renderizarFiltros(TODOS_PRODUTOS);
  configurarBusca();
  aplicarFiltros();
  renderizarVistosRecentemente();
});

