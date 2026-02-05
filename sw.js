self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try{
      // delete all caches
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }catch(e){}
    // unregister self
    try{
      const regs = await self.registration.unregister();
    }catch(e){}
    try{ await self.clients.claim(); }catch(e){}
    // try to reload controlled clients
    try{
      const clients = await self.clients.matchAll({type:'window'});
      for(const c of clients){ try{ c.navigate(c.url); }catch(e){} }
    }catch(e){}
  })());
});
// Network passthrough (no caching)
self.addEventListener('fetch', (event) => {});
