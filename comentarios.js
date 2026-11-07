// Carrossel de prints de comentários de clientes (formato 9:16, como stories do Instagram).
(function () {
  const wrap = document.getElementById("comentariosWrap");
  if (!wrap) return;

  fetch("comentarios.json", { cache: "no-store" })
    .then(r => r.json())
    .then(d => montar((d.comentarios || []).filter(c => c && c.imagem)))
    .catch(() => { wrap.style.display = "none"; });

  function montar(itens) {
    if (!itens.length) { wrap.style.display = "none"; return; }
    wrap.innerHTML = `
      <div class="secao-cab"><h2>Quem comprou, amou 💛</h2></div>
      <p class="comentarios-sub">Comentários reais de clientes no nosso Instagram.</p>
      <div class="comentarios-carrossel">
        <button type="button" class="com-seta com-prev" aria-label="Anterior">‹</button>
        <div class="comentarios-trilho" id="comTrilho" tabindex="0">
          ${itens.map((c, i) => `
            <figure class="comentario-card">
              <button type="button" class="comentario-abrir" data-i="${i}" aria-label="Ampliar comentário ${i + 1}">
                <img src="${c.imagem}" alt="Comentário de cliente no Instagram" loading="lazy">
              </button>
            </figure>`).join("")}
        </div>
        <button type="button" class="com-seta com-next" aria-label="Próximo">›</button>
      </div>
      <p class="comentarios-insta"><a href="https://www.instagram.com/estampartypaper/" target="_blank" rel="noopener noreferrer">Siga a gente no Instagram @estampartypaper</a></p>`;

    const trilho = wrap.querySelector("#comTrilho");
    const passo = () => { const c = trilho.querySelector(".comentario-card"); return c ? c.getBoundingClientRect().width + 14 : 200; };
    const ir = (dir) => {
      const fim = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
      if (dir > 0 && fim) trilho.scrollTo({ left: 0, behavior: "smooth" });
      else trilho.scrollBy({ left: dir * passo(), behavior: "smooth" });
    };
    wrap.querySelector(".com-prev").addEventListener("click", () => ir(-1));
    wrap.querySelector(".com-next").addEventListener("click", () => ir(1));

    let pausado = false, timer = null;
    const ligar = () => { clearInterval(timer); timer = setInterval(() => { if (!pausado && !document.hidden) ir(1); }, 4500); };
    ["mouseenter", "touchstart", "focusin"].forEach(ev => trilho.addEventListener(ev, () => { pausado = true; }, { passive: true }));
    ["mouseleave", "touchend", "focusout"].forEach(ev => trilho.addEventListener(ev, () => { pausado = false; }, { passive: true }));
    if (itens.length > 1) ligar();

    // ampliar ao clicar
    trilho.addEventListener("click", (e) => {
      const b = e.target.closest(".comentario-abrir");
      if (!b) return;
      const ov = document.createElement("div");
      ov.className = "com-overlay";
      ov.innerHTML = `<button type="button" class="com-fechar" aria-label="Fechar">×</button><img src="${itens[Number(b.dataset.i)].imagem}" alt="Comentário ampliado">`;
      const sair = () => { ov.remove(); document.removeEventListener("keydown", tecla); };
      const tecla = (ev) => { if (ev.key === "Escape") sair(); };
      ov.addEventListener("click", sair);
      document.addEventListener("keydown", tecla);
      document.body.appendChild(ov);
    });
  }
})();
