import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {runInNewContext} from "node:vm";
const root="public/estrategia/independentes/portos-em-turnos/";
test("portos possui documentos, motor e service worker isolados",()=>{
 for(const name of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest","sw.js"])
  assert.ok(existsSync(root+name),name);
 const source=readFileSync(root+"sw.js","utf8");
 assert.match(source,/self\.registration\.scope/);
 assert.match(source,/url\.origin!==self\.location\.origin/);
 assert.match(source,/!url\.pathname\.startsWith\(ROOT\.pathname\)/);
 assert.match(source,/"pg-estrategia-portos-"/);
});
test("service worker de portos nunca intercepta jogo vizinho nem escrita",()=>{
 const source=readFileSync(root+"sw.js","utf8");
 const scope="https://example.test/PG-Arcade/estrategia/independentes/portos-em-turnos/";
 const events=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(n,fn)=>events.set(n,fn)};
 runInNewContext(source,{self,URL,Set,Promise,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 const handler=events.get("fetch");assert.equal(typeof handler,"function");
 let intercepted=false;
 for(const url of [scope+"../central-resgates/",scope+"../../../",scope+"../../outro.js"]){
  handler({request:{url:new URL(url).href,method:"GET",mode:"navigate"},respondWith(){intercepted=true}});
  assert.equal(intercepted,false,url);
 }
 handler({request:{url:scope+"index.html",method:"POST",mode:"cors"},respondWith(){intercepted=true}});
 assert.equal(intercepted,false);
 handler({request:{url:scope+"app.js",method:"GET",mode:"cors"},respondWith(){intercepted=true}});
 assert.equal(intercepted,true);
});
