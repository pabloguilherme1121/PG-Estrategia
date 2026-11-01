import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function handler(file,scope){
 const handlers=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(name,fn){handlers.set(name,fn)}};
 runInNewContext(readFileSync(file,"utf8"),{self,URL,Promise,Response,Set,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 return handlers.get("fetch");
}
test("Malha: SW pai não intercepta a rota do jogo independente",()=>{
 const root="https://example.test/PG-Arcade/estrategia/independentes/";
 const parent=handler("public/estrategia/independentes/sw.js",root);
 for(const path of ["malha-energia/","malha-energia/app.js","malha-energia/engine.mjs"]){
  let handled=false;
  parent({request:{method:"GET",url:root+path,mode:path.endsWith("/")?"navigate":"cors"},respondWith(){handled=true}});
  assert.equal(handled,false,path);
 }
});
test("Malha: SW filho isola seu shell de outros jogos",()=>{
 const root="https://example.test/PG-Arcade/estrategia/independentes/malha-energia/";
 const child=handler("public/estrategia/independentes/malha-energia/sw.js",root);
 for(const path of ["","index.html","app.js","engine.mjs"]){
  let handled=false;
  child({request:{method:"GET",url:root+path,mode:path?"cors":"navigate"},respondWith(){handled=true}});
  assert.equal(handled,true,path);
 }
 let cross=false;
 child({request:{method:"GET",url:root+"../app.js",mode:"cors"},respondWith(){cross=true}});
 assert.equal(cross,false);
});
