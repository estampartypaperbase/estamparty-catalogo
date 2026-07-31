(async function iniciarAnalytics() {
  try {
    const resposta = await fetch("analytics.json", { cache: "no-store" });
    const dados = await resposta.json();
    const gaId = dados.gaId;

    if (!gaId) return; // ainda não configurado no dashboard

    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", gaId);
  } catch (erro) {
    // Sem analytics.json ainda: site continua funcionando normal
  }
})();
