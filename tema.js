(function () {
  const CHAVE = "estamparty_tema";
  const salvo = localStorage.getItem(CHAVE);
  if (salvo === "escuro") {
    document.documentElement.setAttribute("data-tema", "escuro");
  }

  function criarBotao() {
    const acoes = document.querySelector(".acoes");
    const header = acoes || document.querySelector(".site-header");
    if (!header) return;

    const btn = document.createElement("button");
    btn.className = acoes ? "acao" : "toggle-tema";
    btn.setAttribute("aria-label", "Alternar modo escuro");
    btn.innerHTML = '<span class="emoji">' + (document.documentElement.getAttribute("data-tema") === "escuro" ? "☀️" : "🌙") + '</span>' + (acoes ? "<span>Tema</span>" : "");
    header.appendChild(btn);

    btn.addEventListener("click", () => {
      const escuro = document.documentElement.getAttribute("data-tema") === "escuro";
      if (escuro) {
        document.documentElement.removeAttribute("data-tema");
        localStorage.setItem(CHAVE, "claro");
        btn.querySelector(".emoji") ? btn.querySelector(".emoji").textContent = "🌙" : btn.textContent = "🌙";
      } else {
        document.documentElement.setAttribute("data-tema", "escuro");
        localStorage.setItem(CHAVE, "escuro");
        btn.querySelector(".emoji") ? btn.querySelector(".emoji").textContent = "☀️" : btn.textContent = "☀️";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", criarBotao);
})();
