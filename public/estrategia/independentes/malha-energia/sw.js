const CACHE="pg-estrategia-energy-v1";
const ROOT=new URL("./",self.registration.scope);
const FILES=["./","./index.html","./app.js","./engine.mjs","./style.css","./manifest.webmanifest"];
const ALLOWED=new Set(FILES.map(file=>new URL(file,ROOT).pathname));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("pg-estrategia-energy-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(req.mode!=="navigate"&&!ALLOWED.has(url.pathname))return;
 event.respondWith((async()=>{
  const key=req.mode==="navigate"?new URL("index.html",ROOT).href:req;
  try{const response=await fetch(req);if(response.ok)try{await(await caches.open(CACHE)).put(key,response.clone())}catch{}return response;}
  catch{return(await caches.match(key))||Response.error();}
 })());
});