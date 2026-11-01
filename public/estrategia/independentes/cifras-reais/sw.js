const CACHE='pg-estrategia-cifras-v1';
const ROOT=new URL('./',self.registration.scope);
const FILES=['./','./index.html','./style.css','./engine.mjs','./app.js','./pg-bot.mjs'];
const APPROVED=new Set(FILES.map(path=>new URL(path,ROOT).pathname));
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pg-estrategia-cifras-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(request.mode!=='navigate'&&!APPROVED.has(url.pathname))return;
 event.respondWith((async()=>{
  const key=request.mode==='navigate'?new URL('index.html',ROOT).href:request;
  try{
   const response=await fetch(request);
   if(response.ok)try{await(await caches.open(CACHE)).put(key,response.clone());}catch{/* optional */}
   return response;
  }catch{
   try{return(await caches.match(key))||Response.error();}catch{return Response.error();}
  }
 })());
});