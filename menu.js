// Menu "Categorias" com lista suspensa. Funciona em todas as páginas.
(function () {
  const alvo = document.getElementById("menuCats");
  if (!alvo) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function desenhar(produtos) {
    const cats = Array.from(new Set(produtos.map(p => (p.categoria || "").trim())))
      .filter(c => c && c !== "Sem categoria")
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const temNovos = produtos.some(p => p.novo);
    const link = (cat, texto, cls) => `<a role="menuitem" ${cls ? `class="${cls}"` : ""} href="index.html?cat=${encodeURIComponent(cat)}" data-cat="${esc(cat)}">${texto}</a>`;
    alvo.innerHTML = `
      <div class="menu-drop">
        <button type="button" class="menu-drop-btn" aria-haspopup="true" aria-expanded="false">Categorias <span aria-hidden="true">▾</span></button>
        <div class="menu-drop-lista ${cats.length > 20 ? "col3" : cats.length > 9 ? "col2" : ""}" role="menu">
          ${link("Todos", "Todos os produtos", "todos")}
          ${temNovos ? link("__novidades__", "🆕 Novidades", "novos") : ""}
          ${cats.map(c => link(c, esc(c))).join("")}
        </div>
      </div>`;

    const drop = alvo.querySelector(".menu-drop");
    const btn = alvo.querySelector(".menu-drop-btn");
    const fechar = () => { drop.classList.remove("aberto"); btn.setAttribute("aria-expanded", "false"); };
    const sumir = () => { fechar(); drop.classList.add("fechado"); if (document.activeElement && drop.contains(document.activeElement)) document.activeElement.blur(); };
    drop.addEventListener("mouseleave", () => drop.classList.remove("fechado"));
    window.addEventListener("pageshow", sumir);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      drop.classList.remove("fechado");
      const abrir = !drop.classList.contains("aberto");
      drop.classList.toggle("aberto", abrir);
      btn.setAttribute("aria-expanded", String(abrir));
    });
    document.addEventListener("click", (e) => { if (!drop.contains(e.target)) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });

    alvo.querySelector(".menu-drop-lista").addEventListener("click", (e) => {
      const a = e.target.closest("a[data-cat]");
      if (!a) return;
      sumir();
      if (typeof selecionarCategoria === "function" && document.getElementById("grid")) {
        e.preventDefault();
        selecionarCategoria(a.dataset.cat, true);
      }
    });
  }

  fetch("produtos.json", { cache: "no-store" })
    .then(r => r.json()).then(d => desenhar(d.produtos || []))
    .catch(() => desenhar([]));
})();
