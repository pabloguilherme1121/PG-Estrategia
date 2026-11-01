import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function handler(file,scope){
  const map=new Map();
  const self={registration:{scope},location:{origin:new URL(scope).origin},
    addEventListener(type,fn){map.set(type,fn)}};
  runInNewContext(readFileSync(file,"utf8"),{self,URL,Set,Promise,Response,
    caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
  return map.get("fetch");
}
test("Contenção: cache do catálogo não intercepta microsite",()=>{
  const base="https://example.test/PG-Arcade/estrategia/independentes/";
  const fetchHandler=handler("public/estrategia/independentes/sw.js",base);
  for(const path of ["linha-contencao/","linha-contencao/app.js","linha-contencao/engine.mjs"]){
    let intercepted=false;
    fetchHandler({request:{method:"GET",url:base+path,mode:path.endsWith("/")?"navigate":"cors"},
      respondWith(){intercepted=true;}});
    assert.equal(intercepted,false,path);
  }
});
test("Contenção: cache filho limita recursos ao próprio jogo",()=>{
  const base="https://example.test/PG-Arcade/estrategia/independentes/linha-contencao/";
  const fetchHandler=handler("public/estrategia/independentes/linha-contencao/sw.js",base);
  for(const path of ["","app.js","engine.mjs","style.css","manifest.webmanifest"]){
    let intercepted=false;
    fetchHandler({request:{method:"GET",url:base+path,mode:path?"cors":"navigate"},
      respondWith(){intercepted=true;}});
    assert.equal(intercepted,true,path);
  }
  for(const path of ["../central-resgates/app.js","private.json"]){
    let intercepted=false;
    fetchHandler({request:{method:"GET",url:base+path,mode:"cors"},
      respondWith(){intercepted=true;}});
    assert.equal(intercepted,false,path);
  }
});
