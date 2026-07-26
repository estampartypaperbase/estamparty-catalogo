const CACHE_NOME = "estamparty-v1";
const ARQUIVOS_ESSENCIAIS = [
  "index.html",
  "style.css",
  "script.js",
  "logo.png",
  "favicon.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE_NOME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  // Dados (JSON) sempre buscados da rede, pra nunca mostrar catálogo desatualizado
  if (evento.request.url.endsWith(".json")) return;

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      return respostaCache || fetch(evento.request).catch(() => respostaCache);
    })
  );
});
