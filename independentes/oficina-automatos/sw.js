const CACHE='pg-estrategia-oficina-v1';
const ROOT=new URL('./',self.registration.scope);
const FILES=['./','./index.html','./style.css','./app.js','./engine.mjs','./manifest.webmanifest'];
const ALLOWED=new Set(FILES.map(path=>new URL(path,ROOT).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pg-estrategia-oficina-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
 if(u.origin!==self.location.origin||!u.pathname.startsWith(ROOT.pathname))return;
 if(req.mode!=='navigate'&&!ALLOWED.has(u.pathname))return;
 e.respondWith((async()=>{const cacheKey=req.mode==='navigate'?new URL('index.html',ROOT).href:req;
  try{const res=await fetch(req);if(res.ok){try{const cache=await caches.open(CACHE);await cache.put(cacheKey,res.clone())}catch{}}return res}
  catch{try{return await caches.match(cacheKey)||Response.error()}catch{return Response.error()}}
 })());
});