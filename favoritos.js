const FAVORITOS_CHAVE = "estamparty_favoritos";

function obterFavoritos() {
  try { return JSON.parse(localStorage.getItem(FAVORITOS_CHAVE)) || []; }
  catch (e) { return []; }
}

function ehFavorito(id) {
  return obterFavoritos().includes(id);
}

function alternarFavorito(id) {
  let favoritos = obterFavoritos();
  if (favoritos.includes(id)) {
    favoritos = favoritos.filter(f => f !== id);
  } else {
    favoritos.push(id);
  }
  localStorage.setItem(FAVORITOS_CHAVE, JSON.stringify(favoritos));
  return favoritos.includes(id);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-favorito");
  if (!btn) return;
  e.preventDefault();
  const id = Number(btn.dataset.id);
  const agora = alternarFavorito(id);
  btn.classList.toggle("ativo", agora);
  btn.textContent = agora ? "♥" : "♡";

  if (typeof categoriaAtual !== "undefined" && categoriaAtual === "__favoritos__" && typeof aplicarFiltros === "function") {
    aplicarFiltros();
  }
});

document.addEventListener("click", async (e) => {
  const btnCompartilhar = e.target.closest(".btn-compartilhar");
  if (!btnCompartilhar) return;
  e.preventDefault();

  const nome = btnCompartilhar.dataset.nome;
  const link = btnCompartilhar.dataset.link;

  if (navigator.share) {
    try { await navigator.share({ title: nome, url: link }); }
    catch (erro) { /* usuário cancelou o compartilhamento, tudo bem */ }
  } else {
    try {
      await navigator.clipboard.writeText(link);
      const original = btnCompartilhar.innerHTML;
      btnCompartilhar.textContent = "Copiado!";
      setTimeout(() => { btnCompartilhar.innerHTML = original; }, 1500);
    } catch (erro) { /* clipboard indisponível, ignora silenciosamente */ }
  }
});
