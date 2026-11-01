const CACHE="pg-estrategia-territorios-v1",ROOT=new URL("./",self.registration.scope);
const FILES=["./","./index.html","./app.js","./engine.mjs","./style.css","./manifest.webmanifest"];
const ALLOWED=new Set(FILES.map(file=>new URL(file,ROOT).pathname));
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("pg-estrategia-territorios-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const request=e.request,url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(request.mode!=="navigate"&&!ALLOWED.has(url.pathname))return;
 e.respondWith((async()=>{const key=request.mode==="navigate"?new URL("index.html",ROOT):request;
 try{const response=await fetch(request);if(response.ok){try{await(await caches.open(CACHE)).put(key,response.clone());}catch{}}return response;}
 catch{try{return await caches.match(key)||Response.error();}catch{return Response.error();}}})());});
