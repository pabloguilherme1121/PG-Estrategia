import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const independent=readFileSync("public/estrategia/independentes/index.html","utf8");
const portal=readFileSync("public/estrategia/index.html","utf8");
const buttons=[...independent.matchAll(/<button\b[^>]*\bdata-select="([^"]+)"/g)].map(m=>m[1]);
const links=[...independent.matchAll(/<a\b[^>]*\bclass="choice(?:\s|")[^>]*href="\.\/([^/]+)\/"/g)].map(m=>m[1]);
const count=buttons.length+links.length;
test("contagem da coleção é única em todos os títulos, independente da campanha 150",()=>{
 assert.equal(new Set([...buttons,...links]).size,count);
 assert.ok(count>=31);
 assert.match(independent,new RegExp("<h1>"+count+" jogos\\."));
 assert.match(independent,new RegExp(count+" motores independentes"));
 assert.match(portal,new RegExp(count+" jogos independentes"));
 assert.doesNotMatch(independent,/vinte e oito novos t[ií]tulos|Trinta formas de pensar/i);
});
test("busca independente oferece campo acessível, status e filtro de cartões",()=>{
 assert.match(independent,/id="independent-search"/);
 assert.match(independent,/type="search"/);
 assert.match(independent,/id="independent-results"/);
 assert.match(independent,/id="independent-empty"/);
 assert.match(independent,/search\.js/);
 const src=readFileSync("public/estrategia/independentes/search.js","utf8");
 assert.match(src,/normalize\(/);
 assert.match(src,/dataset/);
 assert.match(src,/hidden/);
});

test("SW do catálogo armazena o filtro e não sequestra as rotas dos jogos",async()=>{
 const {runInNewContext}=await import("node:vm");
 const source=readFileSync("public/estrategia/independentes/sw.js","utf8");
 assert.match(source,/"\.\/search\.js"/);
 const scope="https://example.test/PG-Arcade/estrategia/independentes/";
 const handlers=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(name,fn)=>handlers.set(name,fn)};
 runInNewContext(source,{self,URL,Set,Promise,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 const handle=handlers.get("fetch");assert.equal(typeof handle,"function");
 for(const slug of links){
  let called=false;handle({request:{method:"GET",url:scope+slug+"/",mode:"navigate"},respondWith(){called=true;}});
  assert.equal(called,false,"O shell não pode responder pelo jogo "+slug);
 }
 let searchHandled=false;
 handle({request:{method:"GET",url:scope+"search.js",mode:"cors"},respondWith(){searchHandled=true;}});
 assert.equal(searchHandled,true,"O filtro precisa funcionar offline");
});
