// Aba "Categorias": criar, renomear, excluir categorias e mover produtos em massa.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SEM = "Sem categoria", TODOS = "__todos__";
  let atual = SEM;
  const marcados = new Set();

  const nomesProdutos = () => produtos.map(p => (p.categoria || "").trim() || SEM);
  function todasCategorias() {
    const set = new Set(categoriasLista.map(c => c.trim()).filter(Boolean));
    nomesProdutos().forEach(c => { if (c !== SEM) set.add(c); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  const daCategoria = (c) => c === TODOS ? produtos : produtos.filter(p => ((p.categoria || "").trim() || SEM) === c);

  function guardarLista() { try { localStorage.setItem(CATS_KEY, JSON.stringify(categoriasLista)); } catch (e) {} }
  async function publicar(msg) { await publicarAutomatico(msg, "statusCats"); }
  function atualizarTudo() {
    salvarProdutos(produtos); guardarLista();
    renderizarLista(); popularSelectProdutos(); desenhar();
  }

  function desenhar() {
    const cats = todasCategorias();
    if (atual !== SEM && atual !== TODOS && !cats.includes(atual)) atual = SEM;
    const linha = (id, nome, n, extra) => `
      <div class="cat-linha ${atual === id ? "ativa" : ""}" data-cat="${esc(id)}">
        <button type="button" class="cat-nome">${esc(nome)} <span>${n}</span></button>${extra || ""}
      </div>`;
    $("catsLista").innerHTML =
      linha(SEM, SEM, daCategoria(SEM).length) +
      cats.map(c => linha(c, c, daCategoria(c).length,
        `<button type="button" class="cat-acao" data-acao="renomear" title="Renomear">✏️</button><button type="button" class="cat-acao" data-acao="excluir" title="Excluir categoria">🗑️</button>`)).join("") +
      linha(TODOS, "Todos os produtos", produtos.length);

    const op = [SEM, ...cats];
    const val = $("catDestino").value;
    $("catDestino").innerHTML = '<option value="">Mover para…</option>' + op.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    if (op.includes(val)) $("catDestino").value = val;

    const lista = daCategoria(atual);
    Array.from(marcados).forEach(id => { if (!lista.some(p => String(p.id) === id)) marcados.delete(id); });
    $("catsTitulo").textContent = (atual === TODOS ? "Todos os produtos" : atual) + " · " + lista.length;
    $("catsProdutos").innerHTML = lista.length ? lista.map(p => `
      <label class="cat-prod ${marcados.has(String(p.id)) ? "marcado" : ""}">
        <input type="checkbox" class="cat-sel" data-id="${p.id}" ${marcados.has(String(p.id)) ? "checked" : ""}>
        <img src="${esc(p.imagem)}" alt="" loading="lazy">
        <span class="cat-prod-nome">${esc(p.nome)}</span>
        <small>${esc((p.categoria || "").trim() || SEM)}</small>
      </label>`).join("") : '<div class="dash-hint">Nenhum produto aqui.</div>';
    barra();
  }

  function barra() {
    const n = marcados.size, lista = daCategoria(atual);
    $("catContagem").textContent = n ? (n === 1 ? "1 marcado" : n + " marcados") : "Marcar produtos";
    $("catSelTodos").checked = lista.length > 0 && lista.every(p => marcados.has(String(p.id)));
    $("btnMoverCat").disabled = !n;
  }

  $("btnCriarCat").addEventListener("click", async () => {
    const nome = $("catNova").value.trim();
    if (!nome) { $("statusCats").textContent = "Escreva o nome da categoria."; return; }
    if (todasCategorias().some(c => c.toLowerCase() === nome.toLowerCase())) { $("statusCats").textContent = "Essa categoria já existe."; return; }
    categoriasLista.push(nome); $("catNova").value = ""; atual = nome;
    atualizarTudo(); await publicar(`Categoria "${nome}" criada.`);
  });
  $("catNova").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("btnCriarCat").click(); } });

  $("catsLista").addEventListener("click", async (e) => {
    const linha = e.target.closest(".cat-linha"); if (!linha) return;
    const cat = linha.dataset.cat, acao = e.target.closest(".cat-acao");
    if (!acao) { atual = cat; desenhar(); return; }
    if (acao.dataset.acao === "renomear") {
      const novo = (prompt(`Novo nome para "${cat}":`, cat) || "").trim();
      if (!novo || novo === cat) return;
      if (todasCategorias().some(c => c !== cat && c.toLowerCase() === novo.toLowerCase())) { $("statusCats").textContent = "Já existe uma categoria com esse nome."; return; }
      produtos = produtos.map(p => (p.categoria || "").trim() === cat ? { ...p, categoria: novo } : p);
      categoriasLista = categoriasLista.filter(c => c !== cat).concat(novo);
      atual = novo; atualizarTudo(); await publicar(`Categoria renomeada para "${novo}".`);
    } else {
      const n = daCategoria(cat).length;
      if (!confirm(`Excluir a categoria "${cat}"? ${n ? n + " produto(s) vão para \"" + SEM + "\"." : ""}`)) return;
      produtos = produtos.map(p => (p.categoria || "").trim() === cat ? { ...p, categoria: SEM } : p);
      categoriasLista = categoriasLista.filter(c => c !== cat);
      atual = SEM; atualizarTudo(); await publicar(`Categoria "${cat}" excluída.`);
    }
  });

  $("catsProdutos").addEventListener("change", (e) => {
    const c = e.target.closest(".cat-sel"); if (!c) return;
    if (c.checked) marcados.add(c.dataset.id); else marcados.delete(c.dataset.id);
    c.closest(".cat-prod").classList.toggle("marcado", c.checked); barra();
  });
  $("catSelTodos").addEventListener("change", (e) => {
    daCategoria(atual).forEach(p => { if (e.target.checked) marcados.add(String(p.id)); else marcados.delete(String(p.id)); });
    desenhar();
  });

  $("btnMoverCat").addEventListener("click", async () => {
    const destino = $("catDestino").value;
    if (!destino) { $("statusCats").textContent = "Escolha para qual categoria mover."; $("catDestino").focus(); return; }
    const n = marcados.size;
    produtos = produtos.map(p => marcados.has(String(p.id)) ? { ...p, categoria: destino } : p);
    marcados.clear(); atualizarTudo();
    await publicar(`${n} produto(s) movido(s) para "${destino}".`);
  });

  document.addEventListener("lista-renderizada", () => {
    $("listaCategorias").innerHTML = todasCategorias().map(c => `<option value="${esc(c)}">`).join("");
    if ($("view-categorias").classList.contains("ativo")) desenhar();
  });
  document.querySelector('[data-view="categorias"]').addEventListener("click", desenhar);
  desenhar();
})();
