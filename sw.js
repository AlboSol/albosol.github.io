// SW disabled for development (v3.5.0.0)
self.addEventListener('install', e=>{self.skipWaiting();});
self.addEventListener('activate', e=>{e.waitUntil(self.clients.claim());});
