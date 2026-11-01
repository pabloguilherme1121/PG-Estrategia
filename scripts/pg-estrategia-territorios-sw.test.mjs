import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {runInNewContext} from "node:vm";
const root="public/estrategia/independentes/territorios-de-pedra/";
test("territórios possui assets do jogo e service worker com escopo próprio",()=>{
 for(const name of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest","sw.js"])
  assert.ok(existsSync(root+name),name);
 const source=readFileSync(root+"sw.js","utf8");
 assert.match(source,/self\.registration\.scope/);
 assert.match(source,/url\.origin!==self\.location\.origin/);
 assert.match(source,/!url\.pathname\.startsWith\(ROOT\.pathname\)/);
 assert.match(source,/"pg-estrategia-territorios-"/);
});
test("service worker territorial não intercepta páginas e APIs fora da arena",()=>{
 const source=readFileSync(root+"sw.js","utf8"),scope="https://example.test/PG-Arcade/estrategia/independentes/territorios-de-pedra/";
 const events=new Map(),self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(n,fn)=>events.set(n,fn)};
 runInNewContext(source,{self,URL,Set,Promise,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 const fetchHandler=events.get("fetch");assert.equal(typeof fetchHandler,"function");
 let intercepted=false;
 for(const url of [scope+"../portos-em-turnos/",scope+"../../../",scope+"../../app.js"]){
  fetchHandler({request:{url:new URL(url).href,method:"GET",mode:"navigate"},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false,url);
 }
 fetchHandler({request:{url:scope+"index.html",method:"POST",mode:"cors"},respondWith(){intercepted=true;}});
 assert.equal(intercepted,false);
 fetchHandler({request:{url:scope+"app.js",method:"GET",mode:"cors"},respondWith(){intercepted=true;}});
 assert.equal(intercepted,true);
});
