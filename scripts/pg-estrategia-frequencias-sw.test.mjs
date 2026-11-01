import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

function getHandler(path,scope){
  const events=new Map();
  const self={registration:{scope},location:{origin:new URL(scope).origin},
    addEventListener(name,listener){events.set(name,listener)}};
  runInNewContext(readFileSync(path,"utf8"),{self,URL,Set,Promise,Response,
    caches:{match:async()=>undefined,open:async()=>({})},
    fetch:async()=>new Response("OK")});
  return events.get("fetch");
}
test("Frequências: service worker pai não intercepta páginas nem motor filho",()=>{
  const scope="https://example.test/PG-Arcade/estrategia/independentes/";
  const parent=getHandler("public/estrategia/independentes/sw.js",scope);
  for(const path of ["rede-frequencias/","rede-frequencias/app.js","rede-frequencias/engine.mjs"]){
    let handled=false;
    parent({request:{method:"GET",url:scope+path,
      mode:path.endsWith("/")?"navigate":"cors"},respondWith(){handled=true;}});
    assert.equal(handled,false,path);
  }
});
test("Frequências: service worker próprio não acessa recursos de outros jogos",()=>{
  const scope="https://example.test/PG-Arcade/estrategia/independentes/rede-frequencias/";
  const child=getHandler("public/estrategia/independentes/rede-frequencias/sw.js",scope);
  for(const path of ["","app.js","engine.mjs","style.css","manifest.webmanifest"]){
    let handled=false;
    child({request:{method:"GET",url:scope+path,mode:path?"cors":"navigate"},
      respondWith(){handled=true;}});
    assert.equal(handled,true,path);
  }
  for(const path of ["../guardioes-biomas/app.js","private.txt"]){
    let handled=false;
    child({request:{method:"GET",url:scope+path,mode:"cors"},respondWith(){handled=true;}});
    assert.equal(handled,false,path);
  }
});
