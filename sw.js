const CACHE="ruokasi-v3-2-4-6";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.json","./icon.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",(e)=>{e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).catch(()=>caches.match("./index.html"))));});


// network-first fetch to avoid stale UI
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html');
  const isAsset = url.pathname.endsWith('/app.js') || url.pathname.endsWith('/style.css') || url.pathname.endsWith('/index.html');

  if(isHTML || isAsset){
    event.respondWith((async ()=>{
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      }catch(e){
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }
  event.respondWith(caches.match(req).then(r => r || fetch(req)));
});
