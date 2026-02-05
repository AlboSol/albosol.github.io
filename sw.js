// Ruokasi SW baseline build 20260204235421
const CACHE = "ruokasi-baseline-20260204235421";
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll([
        "./",
        "./index.html?v=20260204235421",
        "./style.css?v=20260204235421",
        "./app.js?v=20260204235421",
        "./manifest.json?v=20260204235421",
        "./icon.png?v=20260204235421",
        "./sw-reset.html?v=20260204235421",
      ]);
    } catch (_) {}
    self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith("ruokasi-") && k !== CACHE ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});
function isNav(req) {
  return req.mode === "navigate" || (req.method==="GET" && (req.headers.get("accept")||"").includes("text/html"));
}
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNav(req)) {
    event.respondWith((async () => {
      try { return await fetch(req, { cache: "no-store" }); }
      catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match("./index.html?v=20260204235421")) || (await cache.match("./")) || new Response("Offline", {status:503});
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fresh = fetch(req).then(r => { cache.put(req, r.clone()); return r; }).catch(() => cached);
    return cached || fresh;
  })());
});
