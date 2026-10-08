const CACHE='morning-briefing-v2';
const HOME=new URL('./',self.location.href).href;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./push-client.js','./manifest.webmanifest','./icon.svg'])));});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('morning-briefing-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(HOME).pathname))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(async()=>await caches.match(e.request)||new Response('Offline',{status:503})));});
self.addEventListener('push',e=>{let d={};try{d=e.data?.json()||{};}catch{}e.waitUntil(self.registration.showNotification(d.title||'Morning Financial Briefing',{body:d.body||'Nuovo briefing disponibile',tag:d.tag||'morning-briefing',icon:'./icon.svg',data:{url:HOME}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const open=windows.find(c=>c.url.startsWith(HOME));if(open){await open.navigate(HOME);return open.focus();}return self.clients.openWindow(HOME);})());});

