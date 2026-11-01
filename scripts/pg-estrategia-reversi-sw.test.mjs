import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function fetchHandler(file,scope){
 const events=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(type,handler){events.set(type,handler)}};
 runInNewContext(readFileSync(file,"utf8"),{self,URL,Promise,Set,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 return events.get("fetch");
}
test("SW do laboratório não intercepta Reversi, Mercado nem Conselho",()=>{
 const base="https://example.test/PG-Arcade/estrategia/independentes/";
 const parent=fetchHandler("public/estrategia/independentes/sw.js",base);
 for(const name of ["reversi-tatico/","mercado-de-rotas/","conselho-de-reinos/"]){
  let handled=false;
  parent({request:{url:base+name,method:"GET",mode:"navigate"},respondWith(){handled=true}});
  assert.equal(handled,false,name);
 }
});
test("SW Reversi armazena engine e PG Bot apenas no escopo do título",()=>{
 const base="https://example.test/PG-Arcade/estrategia/independentes/";
 const scope=base+"reversi-tatico/";
 const src=readFileSync("public/estrategia/independentes/reversi-tatico/sw.js","utf8");
 assert.match(src,/"\.\/pg-bot\.mjs"/);
 const child=fetchHandler("public/estrategia/independentes/reversi-tatico/sw.js",scope);
 for(const path of ["engine.mjs","pg-bot.mjs","app.js",""]){
  let handled=false;
  child({request:{url:scope+path,method:"GET",mode:path?"cors":"navigate"},respondWith(){handled=true}});
  assert.equal(handled,true,path);
 }
 let outside=false;
 child({request:{url:base+"naval.mjs",method:"GET",mode:"cors"},respondWith(){outside=true}});
 assert.equal(outside,false);
});