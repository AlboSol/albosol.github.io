// Ruokasi SW stable build 20260204231145
const CACHE = "ruokasi-cache-20260204231145";
const CORE = [
  "./",
  "./index.html?v=20260204231145",
  "./style.css?v=20260204231145",
  "./app.js?v=20260204231145",
  "./manifest.json?v=20260204231145",
  "./icon.png?v=20260204231145",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(CORE); } catch (_) {}
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

function isNav(req) {
  return req.mode === "navigate" ||
    (req.method === "GET" && (req.headers.get("accept")||"").includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations (HTML)
  if (isNav(req)) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: "no-store" });
      } catch (e) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match("./index.html?v=20260204231145") || await cache.match("./");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Cache-first for assets with background update
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
