import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function handler(file,scope){
 const callbacks=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(name,fn){callbacks.set(name,fn)}};
 runInNewContext(readFileSync(file,"utf8"),{self,URL,Promise,Set,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 return callbacks.get("fetch");
}
test("Pontes: shell do catálogo não intercepta subsite próprio",()=>{
 const scope="https://example.test/PG-Arcade/estrategia/independentes/";
 const parent=handler("public/estrategia/independentes/sw.js",scope);
 for(const path of ["pontes-arquipelago/","pontes-arquipelago/app.js","pontes-arquipelago/engine.mjs"]){
  let handled=false;
  parent({request:{method:"GET",url:scope+path,mode:path.endsWith("/")?"navigate":"cors"},respondWith(){handled=true}});
  assert.equal(handled,false,path);
 }
});
test("Pontes: SW filho isola o jogo e não intercepta outros sites",()=>{
 const scope="https://example.test/PG-Arcade/estrategia/independentes/pontes-arquipelago/";
 const child=handler("public/estrategia/independentes/pontes-arquipelago/sw.js",scope);
 for(const path of ["","index.html","app.js","engine.mjs"]){
  let handled=false;
  child({request:{method:"GET",url:scope+path,mode:path?"cors":"navigate"},respondWith(){handled=true}});
  assert.equal(handled,true,path);
 }
 let cross=false;
 child({request:{method:"GET",url:scope+"../malha-energia/app.js",mode:"cors"},respondWith(){cross=true}});
 assert.equal(cross,false);
});
