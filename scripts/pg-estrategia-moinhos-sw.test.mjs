import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const sw=readFileSync("public/estrategia/independentes/moinhos-pedra/sw.js","utf8");
const parent=readFileSync("public/estrategia/independentes/sw.js","utf8");
test("Moinhos possui cache próprio somente para seus arquivos",()=>{
 assert.match(sw,/self\.registration\.scope/);
 assert.match(sw,/url\.origin!==self\.location\.origin/);
 assert.match(sw,/!url\.pathname\.startsWith\(ROOT\.pathname\)/);
 assert.match(sw,/engine\.mjs/);
 assert.doesNotMatch(sw,/caches\.delete\([^)]*pg-estrategia-warehouse/);
});
test("Service worker do catálogo não intercepta o subsite Moinhos",()=>{
 const root="https://example.test/PG-Arcade/estrategia/independentes/",handlers=new Map();
 const self={registration:{scope:root},location:{origin:new URL(root).origin},addEventListener:(name,fn)=>handlers.set(name,fn)};
 runInNewContext(parent,{self,URL,Promise,Set,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 let called=false;
 handlers.get("fetch")({request:{method:"GET",url:root+"moinhos-pedra/",mode:"navigate"},respondWith(){called=true;}});
 assert.equal(called,false);
});
