const CACHE = "pg-estrategia-originais-shell-v28";
const ROOT = new URL("./", self.registration.scope);
const FILES = ["./", "./index.html", "./app.js", "./pg-bot.mjs", "./style.css", "./search.js", "./naval.mjs", "./siege.mjs", "./hex.mjs", "./squad.mjs", "./towers.mjs", "./frontier.mjs", "./winter.mjs", "./draughts.mjs", "./market.mjs", "./manifest.webmanifest"];
const APPROVED = new Set(FILES.map(file => new URL(file, ROOT).pathname));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("pg-estrategia-originais-") && key !== CACHE)
      .map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  // Apenas o shell pode responder por navegações do catálogo.
  // Cada sub-jogo gerencia a própria rota e cache sem interferência.
  const isCatalogNavigation = url.pathname === ROOT.pathname || url.pathname === new URL("index.html", ROOT).pathname;
  if (request.mode === "navigate" && !isCatalogNavigation) return;
  if (request.mode !== "navigate" && !APPROVED.has(url.pathname)) return;
  event.respondWith((async () => {
    const key = request.mode === "navigate" ? new URL("index.html", ROOT).href : request;
    try {
      const response = await fetch(request);
      if (response.ok) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(key, response.clone());
        } catch { /* browsing online must still work when storage is full */ }
      }
      return response;
    } catch {
      try { return await caches.match(key) || Response.error(); }
      catch { return Response.error(); }
    }
  })());
});
