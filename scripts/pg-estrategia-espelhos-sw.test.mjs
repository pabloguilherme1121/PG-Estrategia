import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function fetchHandler(file,scope){
  const map=new Map();
  const self={registration:{scope},location:{origin:new URL(scope).origin},
    addEventListener(event,callback){map.set(event,callback);}};
  runInNewContext(readFileSync(file,"utf8"),{self,URL,Set,Promise,Response,
    caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
  return map.get("fetch");
}
test("Espelhos: cache do catálogo não intercepta o jogo independente",()=>{
  const root="https://example.test/PG-Arcade/estrategia/independentes/";
  const listener=fetchHandler("public/estrategia/independentes/sw.js",root);
  for(const path of ["espelhos-sinal/","espelhos-sinal/app.js","espelhos-sinal/engine.mjs"]){
    let intercepted=false;
    listener({request:{method:"GET",url:root+path,mode:path.endsWith("/")?"navigate":"cors"},
      respondWith(){intercepted=true;}});
    assert.equal(intercepted,false,path);
  }
});
test("Espelhos: cache isolado não captura jogos vizinhos nem arquivos desconhecidos",()=>{
  const root="https://example.test/PG-Arcade/estrategia/independentes/espelhos-sinal/";
  const listener=fetchHandler("public/estrategia/independentes/espelhos-sinal/sw.js",root);
  for(const path of ["","index.html","app.js","engine.mjs","style.css"]){
    let intercepted=false;
    listener({request:{method:"GET",url:root+path,mode:path?"cors":"navigate"},
      respondWith(){intercepted=true;}});
    assert.equal(intercepted,true,path);
  }
  for(const path of ["../linha-contencao/engine.mjs","unknown.js"]){
    let intercepted=false;
    listener({request:{method:"GET",url:root+path,mode:"cors"},respondWith(){intercepted=true;}});
    assert.equal(intercepted,false,path);
  }
});
