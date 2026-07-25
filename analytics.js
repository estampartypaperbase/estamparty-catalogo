// Troque pelo seu ID de medição do Google Analytics (formato G-XXXXXXXXXX)
// Veja o passo a passo no COMO_USAR.md
const GA_MEASUREMENT_ID = "G-SEU-ID-AQUI";

(function () {
  if (GA_MEASUREMENT_ID.includes("SEU-ID-AQUI")) return;

  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
})();
