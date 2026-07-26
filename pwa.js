if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Se falhar (ex: rodando localmente sem servidor), o site continua funcionando normal
    });
  });
}
