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

async function publicarNoGitHub(caminhoArquivo, objetoConteudo) {
  const config = carregarConfig();
  if (!config.repo || !config.token) {
    throw new Error("Configure o repositório e o token do GitHub primeiro (seção ⚙️ abaixo).");
  }

  const apiUrl = `https://api.github.com/repos/${config.repo}/contents/${caminhoArquivo}`;
  const headers = {
    "Authorization": `Bearer ${config.token}`,
    "Accept": "application/vnd.github+json"
  };

  const respAtual = await fetch(apiUrl, { headers });
  if (!respAtual.ok) {
    throw new Error("Não consegui acessar o repositório. Confira o nome (usuario/repositorio) e o token.");
  }
  const dadosAtuais = await respAtual.json();

  const conteudo = JSON.stringify(objetoConteudo, null, 2);
  const respSalvar = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Atualiza ${caminhoArquivo} via dashboard`,
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
  document.getElementById("f_imagem").value = produto.imagem || (produto.imagens && produto.imagens[0]) || "";
  document.getElementById("f_linkML").value = produto.linkML;
  document.getElementById("f_destaque").checked = !!produto.destaque;
  document.getElementById("f_novo").checked = !!produto.novo;

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

  const dados = {
    id: editandoId ?? (produtos.length ? Math.max(...produtos.map(p => p.id)) + 1 : 1),
    nome: document.getElementById("f_nome").value.trim(),
    categoria: document.getElementById("f_categoria").value.trim(),
    preco: parseFloat(document.getElementById("f_preco").value),
    imagem: document.getElementById("f_imagem").value.trim(),
    linkML: document.getElementById("f_linkML").value.trim(),
    destaque: document.getElementById("f_destaque").checked,
    novo: document.getElementById("f_novo").checked
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
    document.getElementById("f_imagem").value = dados.imagem || "";
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
    await publicarNoGitHub("produtos.json", { produtos });
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
  const imagemPrincipal = imagens[0] || params.get("imagem") || "";

  document.getElementById("f_nome").value = params.get("nome") || "";
  document.getElementById("f_preco").value = params.get("preco") || "";
  document.getElementById("f_imagem").value = imagemPrincipal;
  document.getElementById("f_linkBusca").value = params.get("link") || "";
  document.getElementById("f_linkML").value = params.get("link") || "";

  document.getElementById("statusBusca").textContent =
    "✅ Dados trazidos do bookmarklet! Confira, ajuste a categoria e troque o link pelo de afiliado antes de salvar.";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Upload direto de imagem pro GitHub ----------
function base64FromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function enviarImagemParaGitHub(file, pasta) {
  const config = carregarConfig();
  if (!config.repo || !config.token) {
    throw new Error("Configure o repositório e o token do GitHub primeiro (seção ⚙️ abaixo).");
  }
  if (file.size > 1000000) {
    throw new Error("Imagem muito grande (limite de ~1MB pra upload direto). Comprima a imagem ou use um link de URL.");
  }

  const nomeLimpo = file.name.replace(/[^a-zA-Z0-9.\-]/g, "-");
  const caminho = `${pasta}/${Date.now()}-${nomeLimpo}`;
  const conteudoBase64 = await base64FromFile(file);

  const apiUrl = `https://api.github.com/repos/${config.repo}/contents/${caminho}`;
  const resp = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${config.token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload de imagem via dashboard: ${nomeLimpo}`,
      content: conteudoBase64
    })
  });

  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new Error(erro.message || "Falha ao enviar imagem.");
  }

  const dados = await resp.json();
  return { caminho, nomeArquivo: caminho.split("/").pop(), sha: dados.content.sha };

  return caminho;
}

// ---------- Upload direto de banner (some ao adicionar, entra na lista) ----------
async function excluirImagemGitHub(pasta, nomeArquivo, sha) {
  const config = carregarConfig();
  const apiUrl = `https://api.github.com/repos/${config.repo}/contents/${pasta}/${nomeArquivo}`;
  const resp = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${config.token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: `Remove imagem via dashboard: ${nomeArquivo}`, sha })
  });
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new Error(erro.message || "Falha ao excluir a imagem.");
  }
}

document.getElementById("btnEnviarBanner").addEventListener("click", async () => {
  const arquivo = document.getElementById("b_arquivo");
  const status = document.getElementById("statusUploadBanner");
  const file = arquivo.files[0];

  if (!file) { status.textContent = "Escolha uma imagem primeiro."; return; }
  if (banners.length >= 3) { status.textContent = "Máximo de 3 banners. Remova um da lista antes de enviar outro."; return; }

  status.textContent = "Enviando imagem pro GitHub...";
  try {
    const resultado = await enviarImagemParaGitHub(file, "banner-imagens");
    banners.push({ imagem: resultado.caminho, link: "", nomeArquivo: resultado.nomeArquivo, sha: resultado.sha });
    salvarBannersLocal();
    renderizarBanners();
    arquivo.value = "";
    status.textContent = "✅ Banner enviado e adicionado! Clique em \"Publicar banners no GitHub\" pra ativar no site.";
  } catch (erro) {
    status.textContent = "❌ " + erro.message;
  }
});

// ---------- Banners do slider (até 3) ----------
const BANNERS_STORAGE_KEY = "estamparty_banners";
let banners = [];

function carregarBannersSalvos() {
  try { return JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}

function salvarBannersLocal() {
  localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners));
}

function renderizarBanners() {
  const lista = document.getElementById("listaBanners");
  document.getElementById("contadorBanners").textContent = banners.length;
  if (!banners.length) {
    lista.innerHTML = `<div class="dash-empty">Nenhum banner ativo ainda. Envie uma imagem acima.</div>`;
    return;
  }
  lista.innerHTML = banners.map((b, i) => `
    <div class="dash-item">
      <img src="${b.imagem}?v=${Date.now()}" alt="">
      <div class="dash-item-info">
        <strong>Banner ${i + 1}</strong>
        <span>${b.link || "sem link ao clicar"}</span>
      </div>
      <div class="dash-item-actions">
        <button class="btn-editar" data-i="${i}">Editar link</button>
        <button class="btn-excluir" data-i="${i}">Remover</button>
      </div>
    </div>
  `).join("");
}

document.getElementById("listaBanners").addEventListener("click", async (e) => {
  const btnEditar = e.target.closest(".btn-editar");
  if (btnEditar) {
    const i = Number(btnEditar.dataset.i);
    const novoLink = prompt("Link ao clicar nesse banner (deixe em branco pra remover o link):", banners[i].link || "");
    if (novoLink !== null) {
      banners[i].link = novoLink;
      salvarBannersLocal();
      renderizarBanners();
    }
  }
  const btnExcluir = e.target.closest(".btn-excluir");
  if (btnExcluir) {
    const i = Number(btnExcluir.dataset.i);
    const banner = banners[i];
    if (!confirm("Remover esse banner? A imagem também será excluída do GitHub.")) return;

    if (banner.nomeArquivo && banner.sha) {
      try { await excluirImagemGitHub("banner-imagens", banner.nomeArquivo, banner.sha); }
      catch (erro) { /* mesmo se falhar em excluir do GitHub, remove da lista local */ }
    }

    banners.splice(i, 1);
    salvarBannersLocal();
    renderizarBanners();
  }
});

document.getElementById("btnExportarBanners").addEventListener("click", () => {
  const conteudo = JSON.stringify({ banners }, null, 2);
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "banners.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btnPublicarBanners").addEventListener("click", async () => {
  const status = document.getElementById("statusPublicarBanners");
  status.textContent = "Publicando no GitHub...";
  try {
    await publicarNoGitHub("banners.json", { banners });
    status.textContent = "✅ Publicado! O site atualiza em 1-2 minutos.";
  } catch (erro) {
    status.textContent = "❌ " + erro.message;
  }
});

(function iniciarBanners() {
  banners = carregarBannersSalvos();
  renderizarBanners();
})();

(async function iniciarDashboard() {
  produtos = await carregarProdutos();
  renderizarLista();
  preencherFormDaURL();

  const config = carregarConfig();
  if (config.repo) document.getElementById("cfg_repo").value = config.repo;
  if (config.token) document.getElementById("cfg_token").value = config.token;
})();
