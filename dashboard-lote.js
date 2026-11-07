// Importar em lote (colar a lista copiada do Mercado Livre) e
// mudar a categoria / excluir vários produtos de uma vez.
// Usa as funções do dashboard.js: produtos, salvarProdutos, renderizarLista,
// popularSelectProdutos e publicarAutomatico.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const brl = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const idDoLink = (l) => { const m = /MLB-?(\d{6,})/i.exec(l || ""); return m ? m[1] : ""; };
  const proximoId = () => (produtos.length ? Math.max(...produtos.map(p => p.id)) + 1 : 1);

  /* =====================  SELEÇÃO NA LISTA DE PRODUTOS  ===================== */
  const marcados = new Set();
  const lista = $("listaProdutos");

  function visiveis() {
    return Array.from(lista.querySelectorAll(".dash-item"))
      .filter(i => i.style.display !== "none")
      .map(i => i.querySelector(".sel-prod"))
      .filter(Boolean);
  }

  function atualizarBarra() {
    const n = marcados.size;
    $("selContagem").textContent = n ? (n === 1 ? "1 marcado" : n + " marcados") : "Marcar produtos";
    const todos = visiveis();
    $("selTodos").checked = todos.length > 0 && todos.every(c => c.checked);
    $("btnAplicarCategoria").disabled = !n;
    $("btnExcluirMarcados").disabled = !n;
    $("btnAplicarVariacoes").disabled = !n;
  }

  function preencherCategorias() {
    const cats = Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
    $("listaCategorias").innerHTML = cats.map(c => `<option value="${esc(c)}">`).join("");
  }

  document.addEventListener("lista-renderizada", () => {
    const existentes = new Set(produtos.map(p => String(p.id)));
    Array.from(marcados).forEach(id => { if (!existentes.has(id)) marcados.delete(id); });
    lista.querySelectorAll(".sel-prod").forEach(c => { c.checked = marcados.has(c.dataset.id); });
    preencherCategorias();
    atualizarBarra();
  });

  lista.addEventListener("change", (e) => {
    const c = e.target.closest(".sel-prod");
    if (!c) return;
    if (c.checked) marcados.add(c.dataset.id); else marcados.delete(c.dataset.id);
    atualizarBarra();
  });

  $("selTodos").addEventListener("change", (e) => {
    visiveis().forEach(c => {
      c.checked = e.target.checked;
      if (c.checked) marcados.add(c.dataset.id); else marcados.delete(c.dataset.id);
    });
    atualizarBarra();
  });

  $("btnAplicarCategoria").addEventListener("click", async () => {
    const cat = $("selCategoria").value.trim();
    const status = $("statusBarraLote");
    if (!cat) { status.textContent = "Escreva a categoria primeiro."; $("selCategoria").focus(); return; }
    const n = marcados.size;
    produtos = produtos.map(p => marcados.has(String(p.id)) ? { ...p, categoria: cat } : p);
    salvarProdutos(produtos);
    marcados.clear();
    renderizarLista();
    popularSelectProdutos();
    $("selCategoria").value = "";
    await publicarAutomatico(`Categoria "${cat}" aplicada a ${n} produto(s).`, "statusBarraLote");
  });

  $("btnAplicarVariacoes").addEventListener("click", async () => {
    const status = $("statusBarraLote");
    const v = parseInt($("selVariacoes").value, 10);
    if (isNaN(v) || v < 0) { status.textContent = "Escreva o número de variações (0 remove)."; $("selVariacoes").focus(); return; }
    const n = marcados.size;
    produtos = produtos.map(p => marcados.has(String(p.id)) ? { ...p, variacoes: v } : p);
    salvarProdutos(produtos);
    marcados.clear();
    renderizarLista();
    popularSelectProdutos();
    $("selVariacoes").value = "";
    await publicarAutomatico(`${v ? v + " variações" : "Variações removidas"} aplicado(s) a ${n} produto(s).`, "statusBarraLote");
  });

  $("btnExcluirMarcados").addEventListener("click", async () => {
    const n = marcados.size;
    if (!n) return;
    if (!confirm(`Excluir ${n} produto(s) do catálogo? Isso não pode ser desfeito.`)) return;
    produtos = produtos.filter(p => !marcados.has(String(p.id)));
    salvarProdutos(produtos);
    marcados.clear();
    renderizarLista();
    popularSelectProdutos();
    await publicarAutomatico(`${n} produto(s) excluído(s).`, "statusBarraLote");
  });

  /* =====================  IMPORTAR EM LOTE  ===================== */
  let itensLote = [];

  function ehDuplicado(it) {
    const idIt = it.id;
    return produtos.some(p =>
      (idIt && idDoLink(p.linkML) === idIt) ||
      (it.link && p.linkML === it.link) ||
      norm(p.nome) === norm(it.nome));
  }

  function desenharLote() {
    const novos = itensLote.filter(i => i.situacao === "novo").length;
    const dup = itensLote.filter(i => i.situacao === "dup").length;
    const sem = itensLote.filter(i => i.situacao === "semlink").length;
    $("loteResumo").textContent =
      `${itensLote.length} anúncio(s) lido(s): ${novos} novo(s)` +
      (dup ? `, ${dup} já cadastrado(s)` : "") +
      (sem ? `, ${sem} sem link (não dá para importar sozinho)` : "") + ".";

    $("loteLista").innerHTML = itensLote.map((it, i) => {
      const rotulo = it.situacao === "dup" ? '<span class="lote-tag aviso">Já cadastrado</span>'
        : it.situacao === "semlink" ? '<span class="lote-tag erro">Sem link</span>'
        : '<span class="lote-tag ok">Novo</span>';
      return `
        <label class="lote-item ${it.situacao !== "novo" ? "apagado" : ""}">
          <input type="checkbox" class="lote-sel" data-i="${i}" ${it.marcado ? "checked" : ""} ${it.situacao === "semlink" ? "disabled" : ""}>
          <img src="${esc(it.imagem)}" alt="" loading="lazy">
          <div class="lote-info">
            <strong>${esc(it.nome)}</strong>
            <span>${it.preco ? brl(it.preco) : "sem preço"} · ${rotulo}</span>
          </div>
        </label>`;
    }).join("");
    atualizarBotaoLote();
  }

  function atualizarBotaoLote() {
    const n = itensLote.filter(i => i.marcado).length;
    $("btnAdicionarLote").textContent = n ? `Adicionar ${n} ao site` : "Adicionar ao site";
    $("btnAdicionarLote").disabled = !n;
    $("lote_todos").checked = itensLote.filter(i => i.situacao !== "semlink").every(i => i.marcado) && n > 0;
  }

  $("btnLerLote").addEventListener("click", () => {
    const status = $("statusLote");
    const texto = $("lote_texto").value.trim();
    if (!texto) { status.textContent = "Cole a lista copiada do Mercado Livre primeiro."; return; }
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { dados = null; }
    if (!dados || !Array.isArray(dados.itens)) {
      status.textContent = "❌ Esse texto não parece vir do botão 📦 Importar vários. Clique nele de novo no Mercado Livre e cole aqui.";
      return;
    }
    itensLote = dados.itens.map(it => {
      const base = { id: String(it.id || ""), nome: String(it.nome || "").trim(), preco: Number(it.preco) || 0, imagem: it.imagem || "", link: it.link || "" };
      base.situacao = it.semLink || !base.link ? "semlink" : ehDuplicado(base) ? "dup" : "novo";
      base.marcado = base.situacao === "novo";
      return base;
    }).filter(i => i.nome);
    if (!itensLote.length) { status.textContent = "❌ Não encontrei anúncios nessa lista."; return; }
    status.textContent = "";
    $("loteRevisao").hidden = false;
    desenharLote();
    $("loteRevisao").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("loteLista").addEventListener("change", (e) => {
    const c = e.target.closest(".lote-sel");
    if (!c) return;
    itensLote[Number(c.dataset.i)].marcado = c.checked;
    atualizarBotaoLote();
  });

  $("lote_todos").addEventListener("change", (e) => {
    itensLote.forEach(i => { if (i.situacao !== "semlink") i.marcado = e.target.checked; });
    desenharLote();
  });

  $("btnAdicionarLote").addEventListener("click", async () => {
    const escolhidos = itensLote.filter(i => i.marcado);
    if (!escolhidos.length) return;
    const cat = $("lote_categoria").value.trim() || "Sem categoria";
    let id = proximoId();
    escolhidos.forEach(it => {
      produtos.push({ id: id++, nome: it.nome, categoria: cat, preco: it.preco, imagem: it.imagem, linkML: it.link, destaque: false, novo: false });
    });
    salvarProdutos(produtos);
    renderizarLista();
    popularSelectProdutos();
    const n = escolhidos.length;
    $("lote_texto").value = "";
    $("loteRevisao").hidden = true;
    itensLote = [];
    await publicarAutomatico(`${n} produto(s) adicionado(s) em "${cat}". Agora, em Produtos, marque os que são da mesma categoria e clique em "Aplicar categoria".`, "statusLote");
  });
})();
