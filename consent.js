(function () {
  const CHAVE = "estamparty_consentimento_lgpd";
  if (localStorage.getItem(CHAVE)) return;

  const banner = document.createElement("div");
  banner.className = "lgpd-banner";
  banner.innerHTML = `
    <p>
      Usamos apenas os dados que você mesmo nos envia (como no formulário de novidades)
      para melhorar sua experiência. Saiba mais na nossa
      <a href="privacidade.html">Política de Privacidade</a>.
    </p>
    <button id="lgpdAceitar" class="btn-primario-site">Entendi</button>
  `;
  document.body.appendChild(banner);

  document.getElementById("lgpdAceitar").addEventListener("click", () => {
    localStorage.setItem(CHAVE, "1");
    banner.remove();
  });
})();
