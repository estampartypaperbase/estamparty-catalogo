// Dashboard de produtos — Estamparty
// Guarda os produtos no localStorage deste navegador e permite exportar
// um novo produtos.js pra substituir o arquivo do site.

const STORAGE_KEY = "estamparty_produtos";

// Troque pelo link da sua function depois de publicar na Vercel (veja o COMO_USAR.md)
const API_BUSCA_ML = "https://estamparty-ml-proxy.vercel.app/api/buscar-produto";

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
  document.getElementById("f_precoDe").value = produto.precoDe || "";
  document.getElementById("f_imagem").value = produto.imagem;
  document.getElementById("f_video").value = produto.video || "";
  document.getElementById("f_descricao").value = produto.descricao;
  document.getElementById("f_linkML").value = produto.linkML;
  document.getElementById("f_destaque").checked = !!produto.destaque;

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
    precoDe: document.getElementById("f_precoDe").value
      ? parseFloat(document.getElementById("f_precoDe").value) : "",
    imagem: document.getElementById("f_imagem").value.trim(),
    video: document.getElementById("f_video").value.trim(),
    descricao: document.getElementById("f_descricao").value.trim(),
    linkML: document.getElementById("f_linkML").value.trim(),
    destaque: document.getElementById("f_destaque").checked
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

(async function iniciarDashboard() {
  produtos = await carregarProdutos();
  renderizarLista();
})();
