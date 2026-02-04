// Ruokasi SW hotfix (single fetch handler) build 20260204221201
const CACHE = "ruokasi-cache-20260204221201";
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Best-effort cache; network may be blocked during install
    try { await cache.addAll(CORE.map(u => u + "?v=20260204221201")); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith("ruokasi-cache-") && k !== CACHE ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

function isNavigation(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept") && request.headers.get("accept").includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so updates come through
  if (isNavigation(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type":"text/plain" } });
      }
    })());
    return;
  }

  // Stale-while-revalidate for other assets
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((fresh) => {
      cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
