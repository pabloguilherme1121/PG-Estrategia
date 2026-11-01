import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function handler(file,scope){
 const events=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(name,fn){events.set(name,fn)}};
 runInNewContext(readFileSync(file,"utf8"),{self,URL,Promise,Set,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 return events.get("fetch");
}
test("Torre: SW do catálogo não intercepta páginas e motor do subsite",()=>{
 const scope="https://example.test/PG-Arcade/estrategia/independentes/";
 const parent=handler("public/estrategia/independentes/sw.js",scope);
 for(const path of ["torre-logistica/","torre-logistica/app.js","torre-logistica/engine.mjs"]){
  let handled=false;
  parent({request:{method:"GET",url:scope+path,mode:path.endsWith("/")?"navigate":"cors"},respondWith(){handled=true}});
  assert.equal(handled,false,path);
 }
});
test("Torre: SW do subsite não captura outros jogos",()=>{
 const scope="https://example.test/PG-Arcade/estrategia/independentes/torre-logistica/";
 const child=handler("public/estrategia/independentes/torre-logistica/sw.js",scope);
 for(const path of ["","index.html","app.js","engine.mjs"]){
  let handled=false;
  child({request:{method:"GET",url:scope+path,mode:path?"cors":"navigate"},respondWith(){handled=true}});
  assert.equal(handled,true,path);
 }
 let escaped=false;
 child({request:{method:"GET",url:scope+"../pontes-arquipelago/app.js",mode:"cors"},respondWith(){escaped=true}});
 assert.equal(escaped,false);
});
