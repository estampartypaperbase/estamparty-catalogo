// Navegação do menu lateral e busca na lista de produtos do painel.
// Não mexe em nenhum dado: só mostra e esconde partes da tela.
(function () {
  const CHAVE = "estamparty_painel_aba";
  const botoes = document.querySelectorAll(".dash-menu-item");
  const telas = document.querySelectorAll(".dash-view");

  function abrir(nome) {
    if (!document.getElementById("view-" + nome)) nome = "produtos";
    telas.forEach(t => t.classList.toggle("ativo", t.id === "view-" + nome));
    botoes.forEach(b => b.classList.toggle("ativo", b.dataset.view === nome));
    try { localStorage.setItem(CHAVE, nome); } catch (e) { /* sem problema */ }
    if (location.hash !== "#" + nome) history.replaceState(null, "", "#" + nome);
    window.scrollTo({ top: 0 });
  }

  botoes.forEach(b => b.addEventListener("click", () => abrir(b.dataset.view)));

  let inicial = location.hash.replace("#", "");
  if (!inicial) { try { inicial = localStorage.getItem(CHAVE) || ""; } catch (e) { inicial = ""; } }
  abrir(inicial || "produtos");

  // Busca dentro da lista de produtos cadastrados
  const filtro = document.getElementById("filtroLista");
  const lista = document.getElementById("listaProdutos");
  function aplicarFiltro() {
    if (!filtro || !lista) return;
    const termo = filtro.value.trim().toLowerCase();
    lista.querySelectorAll(".dash-item").forEach(item => {
      item.style.display = !termo || item.textContent.toLowerCase().includes(termo) ? "" : "none";
    });
  }
  if (filtro && lista) {
    filtro.addEventListener("input", aplicarFiltro);
    new MutationObserver(aplicarFiltro).observe(lista, { childList: true });
  }
})();
