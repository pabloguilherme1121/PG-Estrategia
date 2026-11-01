const CACHE="pg-estrategia-conselho-v2";
const ROOT=new URL("./",self.registration.scope);
const FILES=["./","./index.html","./app.js","./engine.mjs","./pg-bot.mjs","./style.css"];
const ALLOWED=new Set(FILES.map(file=>new URL(file,ROOT).pathname));
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>
 k.startsWith("pg-estrategia-conselho-")&&k!==CACHE).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(request.mode!=="navigate"&&!ALLOWED.has(url.pathname))return;
 event.respondWith((async()=>{
  const key=request.mode==="navigate"?new URL("index.html",ROOT).href:request;
  try{
   const response=await fetch(request);
   if(response.ok){try{await(await caches.open(CACHE)).put(key,response.clone());}catch{/* cache optional */}}
   return response;
  }catch{try{return(await caches.match(key))||Response.error();}catch{return Response.error();}}
 })());
});
