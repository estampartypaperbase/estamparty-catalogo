// v3: busca sempre a versão mais nova na internet e só usa a cópia guardada quando estiver sem conexão.
const CACHE_NOME = "estamparty-v3";
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
  if (evento.request.method !== "GET") return;
  // Dados (JSON) sempre buscados da rede, pra nunca mostrar catálogo desatualizado
  if (evento.request.url.endsWith(".json")) return;

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, copia)).catch(() => {});
        return resposta;
      })
      .catch(() => caches.match(evento.request))
  );
});
