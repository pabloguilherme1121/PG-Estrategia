/* The strategy microsite owns only its subpath. Network-first keeps new deploys
 * fresh and falls back to the most recently cached working version offline. */
const CACHE = "pg-estrategia-shell-v4";
const FILES = [
  "./", "./index.html", "./style.css", "./app.js", "./catalog.mjs",
  "./core.mjs", "./icon.svg", "./manifest.webmanifest",
  "./pg-bot.css", "./pg-bot-help.mjs", "./strategy-hub.mjs",
];
const SCOPE = new URL("./", self.registration.scope);
const allowedAssets = new Set(FILES.map(path => new URL(path, SCOPE).pathname));

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("pg-estrategia-shell-") && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (url.pathname.startsWith(new URL("independentes/", SCOPE).pathname)) return;
  const navigation = request.mode === "navigate";
  if (!navigation && !allowedAssets.has(url.pathname)) return;
  event.respondWith((async () => {
    const cacheKey = navigation ? new URL("index.html", SCOPE).href : request;
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Storage quota failures should never prevent loading a valid online file.
        try {
          const cache = await caches.open(CACHE);
          await cache.put(cacheKey, response.clone());
        } catch { /* Network response remains usable even if storage is blocked. */ }
      }
      return response;
    } catch {
      try {
        return (await caches.match(cacheKey)) || Response.error();
      } catch {
        return Response.error();
      }
    }
  })());
});
