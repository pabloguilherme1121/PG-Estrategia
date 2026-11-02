const CACHE="pg-estrategia-nonograma-v1",ROOT=new URL("./",self.registration.scope);
const FILES=["./","./index.html","./app.js","./engine.mjs","./style.css","./manifest.webmanifest"];
const VALID=new Set(FILES.map(file=>new URL(file,ROOT).pathname));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("pg-estrategia-nonograma-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{const request=event.request,url=new URL(request.url);if(request.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname)||request.mode!=="navigate"&&!VALID.has(url.pathname))return;
 event.respondWith((async()=>{const key=request.mode==="navigate"?new URL("index.html",ROOT):request;
 try{const response=await fetch(request);if(response.ok){try{(await caches.open(CACHE)).put(key,response.clone());}catch{}}return response;}catch{return await caches.match(key)||Response.error();}})());});
