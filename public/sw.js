// Service worker mínimo: deixa o site instalável como app. Não guarda nada em cache,
// então toda atualização publicada aparece na hora.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
