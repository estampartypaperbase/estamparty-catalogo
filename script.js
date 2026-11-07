// Não precisa editar este arquivo. Ele lê o produtos.json e desenha a página.

let TODOS_PRODUTOS = [];
let categoriaAtual = "Todos";
let buscaAtual = "";
let ordemAtual = "relevancia";
let colecaoAtual = null;
let faixaAtual = null;
let listaFiltradaAtual = [];
let itensVisiveis = 12;
const ITENS_POR_PAGINA = 12;

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function textoCategoriaCard(p) {
  const cat = p.categoria && p.categoria !== "Sem categoria" ? p.categoria : "";
  const n = Number(p.variacoes) || 0;
  const v = n > 0 ? `<span class="card-var">${n} ${n === 1 ? "variação" : "variações"}</span>` : "";
  return cat && v ? `${cat} <span class="card-sep">·</span> ${v}` : (cat || v);
}

function criarCard(produto) {
  const imagemPrincipal = produto.imagem || (produto.imagens && produto.imagens[0]) || "";
  const fav = ehFavorito(produto.id);

  return `
    <article class="card" data-categoria="${produto.categoria}">
      <div class="card-topo">
        <a class="card-media-link" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-id="${produto.id}">
          <div class="card-media">
            <img src="${imagemPrincipal}" alt="${produto.nome}" loading="lazy">
          </div>
        </a>
        <div class="card-selos">
          ${produto.novo ? '<span class="badge-novo">Novo</span>' : ""}
          ${produto.destaque ? '<span class="badge-destaque-topo">Destaque</span>' : ""}
        </div>
        <div class="card-icones">
          <button class="btn-favorito ${fav ? "ativo" : ""}" data-id="${produto.id}" aria-label="Favoritar">${fav ? "♥" : "♡"}</button>
          <button class="btn-compartilhar" data-nome="${produto.nome}" data-link="${produto.linkML}" aria-label="Compartilhar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-cat">${textoCategoriaCard(produto)}</div>
        <h3 class="card-title"><a href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-id="${produto.id}">${produto.nome}</a></h3>
        <div class="card-price-row">
          <span class="price-por">${formatarPreco(produto.preco)}</span>
        </div>
        <a class="card-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
          <img src="mercadolivre-icon.png" alt="" class="cta-icone-ml">
          Comprar no Mercado Livre
        </a>
        <div class="selo-seguranca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
          Compra segura
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
  const termoNorm = normalizarTexto(termoBusca).trim();
  if (!textoNorm.trim() || !termoNorm) return false; // texto vazio nunca combina
  if (textoNorm.includes(termoNorm)) return true;

  // Tolera 1 letra errada por palavra (ex: "escolr" acha "escolar")
  const palavrasTexto = textoNorm.split(/\s+/).filter(Boolean);
  const palavrasTermo = termoNorm.split(/\s+/).filter(Boolean);
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

  if (colecaoAtual) lista = lista.filter(p => produtoDaColecao(p, colecaoAtual));
  if (faixaAtual) lista = lista.filter(p => p.preco > faixaAtual.min && p.preco <= faixaAtual.max);

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
    case "mais-novos":
      lista.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      break;
    default:
      lista.sort((a, b) => (b.destaque === true) - (a.destaque === true));
  }

  listaFiltradaAtual = lista;
  itensVisiveis = ITENS_POR_PAGINA;
  renderizarGrid(lista);
}

function atualizarDadosEstruturados(produtos) {
  const antigo = document.getElementById("dadosEstruturadosProdutos");
  if (antigo) antigo.remove();
  if (!produtos.length) return;

  const itemListElement = produtos.map((p, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "Product",
      "name": p.nome,
      "image": p.imagem || (p.imagens && p.imagens[0]) || "",
      "description": p.descricao || `${p.nome} personalizado pela Estamparty. Compra segura pelo Mercado Livre e envio para todo o Brasil.`,
      "sku": String(p.id),
      "brand": { "@type": "Brand", "name": "Estamparty" },
      "category": p.categoria,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BRL",
        "price": Number(p.preco).toFixed(2),
        "priceValidUntil": new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": "Estamparty" },
        "url": p.linkML
      }
    }
  }));

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "dadosEstruturadosProdutos";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": itemListElement
  });
  document.head.appendChild(script);
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
  atualizarDadosEstruturados(visiveis);

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

function emojiDaCategoria(nome) {
  const n = normalizarTexto(nome);
  if (n.includes("agenda")) return "📒";
  if (n.includes("planner")) return "📅";
  if (n.includes("caderno")) return "📓";
  if (n.includes("present") || n.includes("kit")) return "🎁";
  if (n.includes("eucaristia") || n.includes("batiz") || n.includes("crisma")) return "✝️";
  if (n.includes("lembranc")) return "🎀";
  if (n.includes("festa") || n.includes("aniversar")) return "🎉";
  return "🛍️";
}

function selecionarCategoria(cat, rolar) {
  const filtros = document.getElementById("filtros");
  const filtrosMobile = document.getElementById("filtrosMobile");
  if (filtros) filtros.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
  if (filtrosMobile) filtrosMobile.value = cat;
  categoriaAtual = cat;
  if (!selecionandoColecao) { colecaoAtual = null; marcarColecaoAtiva(null); }
  const titulo = document.getElementById("tituloProdutos");
  if (titulo) {
    titulo.textContent = cat === "Todos" ? "Nossos produtos"
      : cat === "__novidades__" ? "Novidades"
      : cat === "__favoritos__" ? "Seus favoritos" : cat;
  }
  aplicarFiltros();
  if (!selecionandoColecao) atualizarSEOCategoria(cat);
  if (rolar) {
    const alvo = document.getElementById("produtos");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------- SEO por categoria (título, descrição, endereço canônico) ----------
const SEO_BASE_URL = "https://estampartypaperbase.github.io/estamparty-catalogo/";
const SEO_ORIGINAL = {
  title: document.title,
  desc: (document.querySelector('meta[name="description"]') || {}).content || ""
};
function atualizarSEOCategoria(cat) {
  const ehReal = cat && cat !== "Todos" && !cat.startsWith("__");
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
  const meta = document.querySelector('meta[name="description"]');
  if (ehReal) {
    const n = TODOS_PRODUTOS.filter(p => p.categoria === cat).length;
    document.title = `${cat} | Papelaria personalizada Estamparty`;
    if (meta) meta.content = `Veja ${n} modelo(s) de ${cat.toLowerCase()} na Estamparty, papelaria personalizada. Compra segura pelo Mercado Livre e envio para todo o Brasil.`;
    canon.href = SEO_BASE_URL + "?cat=" + encodeURIComponent(cat);
  } else {
    document.title = SEO_ORIGINAL.title;
    if (meta) meta.content = SEO_ORIGINAL.desc;
    canon.href = SEO_BASE_URL;
  }
  try {
    const url = new URL(location.href);
    if (ehReal) url.searchParams.set("cat", cat); else url.searchParams.delete("cat");
    history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
  } catch (e) { /* sem problema */ }
}

// ---------- Coleções por tema ----------
let selecionandoColecao = false;
const COLECOES_DESTAQUE = [
  { id: "escolar", titulo: "Agendas Escolares", sub: "Volta às aulas com a cara do seu filho(a)", termos: ["agenda escolar", "agendas escolares"], cls: "azul" },
  { id: "creche", titulo: "Agenda Creche e Maternal", sub: "A rotina da escolinha, do jeito do pequeno", termos: ["creche", "maternal"], cls: "amarelo" }
];
const COLECOES_TEMAS = [
  { id: "aulas", titulo: "🎒 Volta às aulas", termos: ["escolar", "creche", "maternal", "caderno", "estudo"] },
  { id: "fe", titulo: "✝️ Igreja e fé", termos: ["devocional", "crisma", "igreja", "oracao", "biblia", "eucaristia", "batiz"] },
  { id: "formatura", titulo: "🎓 Formatura", termos: ["formatura", "formando"] },
  { id: "natal", titulo: "🎄 Natal", termos: ["natal"] },
  { id: "planners", titulo: "📅 Planners", termos: ["planner"] },
  { id: "diarios", titulo: "📔 Diários e memórias", termos: ["diario"] }
];
function produtoDaColecao(p, c) {
  const t = normalizarTexto(`${p.nome} ${p.categoria || ""} ${p.descricao || ""}`);
  return c.termos.some(x => t.includes(normalizarTexto(x)));
}
function marcarColecaoAtiva(id) {
  document.querySelectorAll("[data-colecao]").forEach(el => el.classList.toggle("ativa", el.dataset.colecao === id));
}
function selecionarColecao(id) {
  const c = [...COLECOES_DESTAQUE, ...COLECOES_TEMAS].find(x => x.id === id);
  if (!c) return;
  selecionandoColecao = true;
  selecionarCategoria("Todos", false);
  selecionandoColecao = false;
  colecaoAtual = c;
  marcarColecaoAtiva(id);
  const titulo = document.getElementById("tituloProdutos");
  if (titulo) titulo.textContent = c.titulo.replace(/^[^\wÀ-ú]+\s*/, "");
  aplicarFiltros();
  const alvo = document.getElementById("produtos");
  if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderizarColecoes(produtos) {
  const secao = document.getElementById("colecoesSecao");
  const dest = document.getElementById("colecoesDestaque");
  const chips = document.getElementById("colecoesChips");
  if (!secao || !dest || !chips) return;
  const achados = (c) => produtos.filter(p => produtoDaColecao(p, c));
  const cards = COLECOES_DESTAQUE.map(c => ({ c, lista: achados(c) })).filter(x => x.lista.length);
  const temas = COLECOES_TEMAS.map(c => ({ c, n: achados(c).length })).filter(x => x.n);
  if (!cards.length && !temas.length) { secao.hidden = true; return; }
  dest.innerHTML = cards.map(({ c, lista }) => {
    const img = (lista.find(p => p.imagem) || {}).imagem || "";
    return `<button type="button" class="colecao-card ${c.cls}" data-colecao="${c.id}">
      <span class="colecao-txt"><small>Coleção em destaque</small><b>${c.titulo}</b><em>${c.sub}</em><span class="colecao-cta">Ver ${lista.length} modelo${lista.length > 1 ? "s" : ""} →</span></span>
      ${img ? `<span class="colecao-img"><img src="${img}" alt="" loading="lazy"></span>` : ""}
    </button>`;
  }).join("");
  chips.innerHTML = temas.map(({ c, n }) => `<button type="button" class="colecao-chip" data-colecao="${c.id}">${c.titulo} <span>${n}</span></button>`).join("");
  secao.hidden = false;
  secao.addEventListener("click", (e) => {
    const b = e.target.closest("[data-colecao]");
    if (b) selecionarColecao(b.dataset.colecao);
  });
}

// ---------- Faixa de preço ----------
function configurarFaixaPreco(produtos) {
  const sel = document.getElementById("campoFaixa");
  if (!sel) return;
  const precos = produtos.map(p => Number(p.preco)).filter(n => n > 0).sort((a, b) => a - b);
  if (new Set(precos).size < 4) { sel.hidden = true; return; }
  const q = (f) => Math.round(precos[Math.floor((precos.length - 1) * f)] / 5) * 5;
  const cortes = [...new Set([q(0.25), q(0.5), q(0.75)])].filter(v => v > 0 && v < precos[precos.length - 1]);
  if (!cortes.length) { sel.hidden = true; return; }
  const fmt = (v) => "R$ " + v;
  const faixas = [{ min: 0, max: cortes[0], rot: "Até " + fmt(cortes[0]) }];
  for (let i = 0; i < cortes.length - 1; i++) faixas.push({ min: cortes[i], max: cortes[i + 1], rot: fmt(cortes[i]) + " a " + fmt(cortes[i + 1]) });
  faixas.push({ min: cortes[cortes.length - 1], max: Infinity, rot: "Acima de " + fmt(cortes[cortes.length - 1]) });
  sel.innerHTML = '<option value="">Faixa de preço</option>' + faixas.map((f, i) => `<option value="${i}">${f.rot}</option>`).join("");
  sel.hidden = false;
  sel.addEventListener("change", () => {
    faixaAtual = sel.value === "" ? null : faixas[Number(sel.value)];
    aplicarFiltros();
  });
}

function renderizarFiltros(produtos) {
  const categorias = ["Todos", ...new Set(produtos.map(p => p.categoria).filter(c => c && c !== "Sem categoria"))];
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
  const campo2 = document.getElementById("buscaProdutos");
  if (campo) {
    campo.addEventListener("input", (e) => {
      buscaAtual = e.target.value;
      if (campo2) campo2.value = buscaAtual;
      aplicarFiltros();
    });
  }
  if (campo2) {
    campo2.addEventListener("input", (e) => {
      buscaAtual = e.target.value;
      if (campo) campo.value = buscaAtual;
      aplicarFiltros();
    });
    const formBP = document.getElementById("formBuscaProdutos");
    if (formBP) formBP.addEventListener("submit", (e) => {
      e.preventDefault();
      campo2.blur();
      const grid = document.getElementById("grid");
      if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const formBusca = document.getElementById("formBusca");
  if (formBusca) {
    formBusca.addEventListener("submit", (e) => {
      e.preventDefault();
      const alvo = document.getElementById("produtos");
      if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const ladoNovidades = document.getElementById("ladoNovidades");
  if (ladoNovidades) {
    ladoNovidades.addEventListener("click", () => {
      const existe = TODOS_PRODUTOS.some(p => p.novo);
      selecionarCategoria(existe ? "__novidades__" : "Todos", true);
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
    const banners = (listaEscolhida || []).slice(0, 5);
    if (!banners.length) { slider.style.display = "none"; return; }
    const hero = document.getElementById("heroPrincipal");
    if (hero) hero.classList.add("com-banners");

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
  if (!TODOS_PRODUTOS.length) {
    const grid = document.getElementById("grid");
    if (grid && !grid.querySelector(".empty-state")) {
      grid.innerHTML = `<div class="empty-state"><b>Novidades em breve</b>Estamos preparando o catálogo. Enquanto isso, fale com a gente no WhatsApp.</div>`;
    }
    return; // erro já foi mostrado dentro de carregarProdutos()
  }
  renderizarFiltros(TODOS_PRODUTOS);
  renderizarColecoes(TODOS_PRODUTOS);
  configurarFaixaPreco(TODOS_PRODUTOS);
  configurarBusca();

  const params = new URLSearchParams(location.search);
  const buscaUrl = params.get("busca");
  const catUrl = params.get("cat");
  if (buscaUrl) {
    buscaAtual = buscaUrl;
    const campo = document.getElementById("campoBusca");
    if (campo) campo.value = buscaUrl;
    const campo2 = document.getElementById("buscaProdutos");
    if (campo2) campo2.value = buscaUrl;
  }
  aplicarFiltros();
  if (catUrl) selecionarCategoria(catUrl, true);
  else if (buscaUrl) {
    const alvo = document.getElementById("produtos");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  renderizarVistosRecentemente();
});

