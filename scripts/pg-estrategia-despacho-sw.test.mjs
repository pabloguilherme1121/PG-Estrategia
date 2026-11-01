import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

function handler(file,scope) {
  const handlers=new Map();
  const self={registration:{scope},location:{origin:new URL(scope).origin},
    addEventListener(type,callback){handlers.set(type,callback);}};
  runInNewContext(readFileSync(file,"utf8"),{self,URL,Set,Promise,Response,
    caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
  return handlers.get("fetch");
}
test("Resgates: SW pai não intercepta jogo e motor independente",()=>{
  const root="https://example.test/PG-Arcade/estrategia/independentes/";
  const fetchHandler=handler("public/estrategia/independentes/sw.js",root);
  for(const path of ["central-resgates/","central-resgates/app.js","central-resgates/engine.mjs"]){
    let caught=false;
    fetchHandler({request:{method:"GET",url:root+path,mode:path.endsWith("/")?"navigate":"cors"},
      respondWith(){caught=true;}});
    assert.equal(caught,false,path);
  }
});
test("Resgates: SW filho só intercepta arquivos próprios",()=>{
  const root="https://example.test/PG-Arcade/estrategia/independentes/central-resgates/";
  const fetchHandler=handler("public/estrategia/independentes/central-resgates/sw.js",root);
  for(const path of ["","index.html","engine.mjs","app.js","style.css","manifest.webmanifest"]){
    let caught=false;
    fetchHandler({request:{method:"GET",url:root+path,mode:path?"cors":"navigate"},
      respondWith(){caught=true;}});
    assert.equal(caught,true,path);
  }
  for(const path of ["../rede-frequencias/engine.mjs","secrets.json"]){
    let caught=false;
    fetchHandler({request:{method:"GET",url:root+path,mode:"cors"},
      respondWith(){caught=true;}});
    assert.equal(caught,false,path);
  }
});
