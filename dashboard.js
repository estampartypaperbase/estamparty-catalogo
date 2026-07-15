// Dashboard de produtos — Estamparty
// Guarda os produtos no localStorage deste navegador e permite exportar
// um novo produtos.js pra substituir o arquivo do site.

const STORAGE_KEY = "estamparty_produtos";
const CONFIG_KEY = "estamparty_github_config";

// Troque pelo link da sua function depois de publicar na Vercel (veja o COMO_USAR.md)
const API_BUSCA_ML = "https://estamparty-ml-proxy.vercel.app/api/buscar-produto";

function carregarConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; }
  catch (e) { return {}; }
}

function salvarConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function base64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function publicarNoGitHub(listaProdutos) {
  const config = carregarConfig();
  if (!config.repo || !config.token) {
    throw new Error("Configure o repositório e o token do GitHub primeiro (seção ⚙️ acima).");
  }

  const apiUrl = `https://api.github.com/repos/${config.repo}/contents/produtos.json`;
  const headers = {
    "Authorization": `Bearer ${config.token}`,
    "Accept": "application/vnd.github+json"
  };

  // 1. Pega o SHA atual do arquivo (o GitHub exige isso pra saber que estamos
  //    atualizando o arquivo certo, e não sobrescrevendo por engano)
  const respAtual = await fetch(apiUrl, { headers });
  if (!respAtual.ok) {
    throw new Error("Não consegui acessar o repositório. Confira o nome (usuario/repositorio) e o token.");
  }
  const dadosAtuais = await respAtual.json();

  // 2. Envia o novo conteúdo
  const conteudo = JSON.stringify({ produtos: listaProdutos }, null, 2);
  const respSalvar = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Atualiza produtos.json via dashboard",
      content: base64Utf8(conteudo),
      sha: dadosAtuais.sha
    })
  });

  if (!respSalvar.ok) {
    const erro = await respSalvar.json().catch(() => ({}));
    throw new Error(erro.message || "Falha ao salvar no GitHub.");
  }
}

async function carregarProdutos() {
  const salvos = localStorage.getItem(STORAGE_KEY);
  if (salvos) {
    try { return JSON.parse(salvos); } catch (e) { /* ignora e cai no seed */ }
  }
  try {
    const resposta = await fetch("produtos.json", { cache: "no-store" });
    const dados = await resposta.json();
    return dados.produtos || [];
  } catch (e) {
    return [];
  }
}

function salvarProdutos(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

let produtos = [];
let editandoId = null;

const form = document.getElementById("formProduto");
const lista = document.getElementById("listaProdutos");
const contador = document.getElementById("contador");
const formTitulo = document.getElementById("formTitulo");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");

function limparForm() {
  form.reset();
  document.getElementById("f_id").value = "";
  editandoId = null;
  formTitulo.textContent = "Novo produto";
  btnSalvar.textContent = "Salvar produto";
  btnCancelar.style.display = "none";
}

function preencherForm(produto) {
  document.getElementById("f_id").value = produto.id;
  document.getElementById("f_nome").value = produto.nome;
  document.getElementById("f_categoria").value = produto.categoria;
  document.getElementById("f_preco").value = produto.preco;
  document.getElementById("f_imagens").value = (produto.imagens || [produto.imagem]).filter(Boolean).join("\n");
  document.getElementById("f_video").value = produto.video || "";
  document.getElementById("f_descricao").value = produto.descricao;
  document.getElementById("f_linkML").value = produto.linkML;
  document.getElementById("f_destaque").checked = !!produto.destaque;
  document.getElementById("f_novo").checked = !!produto.novo;
  document.getElementById("f_avMedia").value = produto.avaliacao?.media || "";
  document.getElementById("f_avQtd").value = produto.avaliacao?.qtd || "";
  document.getElementById("f_especificacoes").value = (produto.especificacoes || []).join("\n");

  editandoId = produto.id;
  formTitulo.textContent = "Editando: " + produto.nome;
  btnSalvar.textContent = "Salvar alterações";
  btnCancelar.style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderizarLista() {
  contador.textContent = produtos.length;

  if (!produtos.length) {
    lista.innerHTML = `<div class="dash-empty">Nenhum produto cadastrado ainda. Use o formulário acima.</div>`;
    return;
  }

  lista.innerHTML = produtos.map(p => `
    <div class="dash-item">
      <img src="${p.imagem}" alt="">
      <div class="dash-item-info">
        <strong>${p.nome} ${p.destaque ? "⭐" : ""}</strong>
        <span>${p.categoria} · R$ ${Number(p.preco).toFixed(2)}</span>
      </div>
      <div class="dash-item-actions">
        <button class="btn-editar" data-id="${p.id}">Editar</button>
        <button class="btn-excluir" data-id="${p.id}">Excluir</button>
      </div>
    </div>
  `).join("");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const imagens = document.getElementById("f_imagens").value
    .split("\n").map(s => s.trim()).filter(Boolean);

  const especificacoes = document.getElementById("f_especificacoes").value
    .split("\n").map(s => s.trim()).filter(Boolean);

  const avMedia = document.getElementById("f_avMedia").value.trim();
  const avQtd = document.getElementById("f_avQtd").value.trim();

  const dados = {
    id: editandoId ?? (produtos.length ? Math.max(...produtos.map(p => p.id)) + 1 : 1),
    nome: document.getElementById("f_nome").value.trim(),
    categoria: document.getElementById("f_categoria").value.trim(),
    preco: parseFloat(document.getElementById("f_preco").value),
    imagem: imagens[0] || "",
    imagens: imagens,
    video: document.getElementById("f_video").value.trim(),
    descricao: document.getElementById("f_descricao").value.trim(),
    linkML: document.getElementById("f_linkML").value.trim(),
    destaque: document.getElementById("f_destaque").checked,
    novo: document.getElementById("f_novo").checked,
    avaliacao: (avMedia || avQtd) ? { media: avMedia, qtd: avQtd } : null,
    especificacoes: especificacoes
  };

  if (editandoId) {
    produtos = produtos.map(p => (p.id === editandoId ? dados : p));
  } else {
    produtos.push(dados);
  }

  salvarProdutos(produtos);
  renderizarLista();
  limparForm();
});

btnCancelar.addEventListener("click", limparForm);

document.getElementById("btnBuscarML").addEventListener("click", async () => {
  const link = document.getElementById("f_linkBusca").value.trim();
  const status = document.getElementById("statusBusca");

  if (!link) {
    status.textContent = "Cole um link do anúncio primeiro.";
    return;
  }

  if (API_BUSCA_ML.includes("SEU-PROJETO-ML-PROXY")) {
    status.textContent = "⚠️ A busca automática ainda não foi configurada (veja o COMO_USAR.md).";
    return;
  }

  status.textContent = "Buscando dados no Mercado Livre...";

  try {
    const resposta = await fetch(`${API_BUSCA_ML}?link=${encodeURIComponent(link)}`);
    const dados = await resposta.json();

    if (dados.erro) {
      status.textContent = "❌ " + dados.erro;
      return;
    }

    document.getElementById("f_nome").value = dados.nome || "";
    document.getElementById("f_preco").value = dados.preco || "";
    document.getElementById("f_imagens").value = dados.imagem || "";
    document.getElementById("f_descricao").value = dados.descricao || "";
    document.getElementById("f_linkML").value = link;

    status.textContent = "✅ Dados encontrados! Confira e ajuste o que precisar antes de salvar.";
  } catch (erro) {
    status.textContent = "❌ Não consegui buscar. Verifique o link e tente de novo.";
  }
});

lista.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.classList.contains("btn-editar")) {
    const produto = produtos.find(p => p.id === id);
    if (produto) preencherForm(produto);
  }

  if (btn.classList.contains("btn-excluir")) {
    if (confirm("Excluir este produto do catálogo?")) {
      produtos = produtos.filter(p => p.id !== id);
      salvarProdutos(produtos);
      renderizarLista();
      if (editandoId === id) limparForm();
    }
  }
});

document.getElementById("btnSalvarConfig").addEventListener("click", () => {
  const repo = document.getElementById("cfg_repo").value.trim();
  const token = document.getElementById("cfg_token").value.trim();
  const status = document.getElementById("statusConfig");

  if (!repo || !token) {
    status.textContent = "Preencha os dois campos.";
    return;
  }

  salvarConfig({ repo, token });
  status.textContent = "✅ Configuração salva neste navegador.";
});

document.getElementById("btnPublicar").addEventListener("click", async () => {
  const status = document.getElementById("statusPublicar");
  status.textContent = "Publicando no GitHub...";
  try {
    await publicarNoGitHub(produtos);
    status.textContent = "✅ Publicado! O site atualiza em 1-2 minutos.";
  } catch (erro) {
    status.textContent = "❌ " + erro.message;
  }
});

document.getElementById("btnExportar").addEventListener("click", () => {
  const conteudo = JSON.stringify({ produtos }, null, 2);
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "produtos.json";
  a.click();
  URL.revokeObjectURL(url);
});

function preencherFormDaURL() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("nome")) return;

  let imagens = [];
  try { imagens = JSON.parse(params.get("imagens") || "[]"); } catch (e) { /* ignora */ }
  if (!imagens.length && params.get("imagem")) imagens = [params.get("imagem")];

  let especificacoes = [];
  try { especificacoes = JSON.parse(params.get("especificacoes") || "[]"); } catch (e) { /* ignora */ }

  document.getElementById("f_nome").value = params.get("nome") || "";
  document.getElementById("f_preco").value = params.get("preco") || "";
  document.getElementById("f_imagens").value = imagens.join("\n");
  document.getElementById("f_descricao").value = params.get("descricao") || "";
  document.getElementById("f_avMedia").value = params.get("avMedia") || "";
  document.getElementById("f_avQtd").value = params.get("avQtd") || "";
  document.getElementById("f_especificacoes").value = especificacoes.join("\n");
  document.getElementById("f_linkBusca").value = params.get("link") || "";
  document.getElementById("f_linkML").value = params.get("link") || "";

  document.getElementById("statusBusca").textContent =
    "✅ Dados trazidos do bookmarklet! Confira, ajuste a categoria e troque o link pelo de afiliado antes de salvar.";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

(async function iniciarDashboard() {
  produtos = await carregarProdutos();
  renderizarLista();
  preencherFormDaURL();

  const config = carregarConfig();
  if (config.repo) document.getElementById("cfg_repo").value = config.repo;
  if (config.token) document.getElementById("cfg_token").value = config.token;
})();
