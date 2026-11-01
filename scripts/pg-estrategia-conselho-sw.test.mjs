import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

function makeFetchHandler(file,scope){
 const handlers=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(name,callback){handlers.set(name,callback);}};
 runInNewContext(readFileSync(file,"utf8"),{self,URL,Promise,Response,Set,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response("ok")});
 return handlers.get("fetch");
}
test("Conselho possui shell isolado do catálogo e do Mercado de Rotas",()=>{
 const root="https://example.test/PG-Arcade/estrategia/independentes/";
 const parent=makeFetchHandler("public/estrategia/independentes/sw.js",root);
 let intercepted=false;
 parent({request:{method:"GET",url:root+"conselho-de-reinos/",mode:"navigate"},respondWith(){intercepted=true;}});
 assert.equal(intercepted,false);
 const child=makeFetchHandler("public/estrategia/independentes/conselho-de-reinos/sw.js",root+"conselho-de-reinos/");
 let handled=false;
 child({request:{method:"GET",url:root+"conselho-de-reinos/engine.mjs",mode:"cors"},respondWith(){handled=true;}});
 assert.equal(handled,true);
 let botAvailable=false;
 child({request:{method:"GET",url:root+"conselho-de-reinos/pg-bot.mjs",mode:"cors"},respondWith(){botAvailable=true;}});
 assert.equal(botAvailable,true,"ajuda do PG Bot precisa pertencer ao cache do Conselho");
 let outside=false;
 child({request:{method:"GET",url:root+"mercado-de-rotas/",mode:"navigate"},respondWith(){outside=true;}});
 assert.equal(outside,false);
});


test("portal anuncia a contagem real de motores independentes sem duplicar missões",()=>{
 const lab=readFileSync("public/estrategia/independentes/index.html","utf8");
 const portal=readFileSync("public/estrategia/index.html","utf8");
 const embedded=[...lab.matchAll(/data-select="([^"]+)"/g)].map(match=>match[1]);
 const linked=[...lab.matchAll(/class="choice[^"]*" href="\.\/([^/]+)\//g)].map(match=>match[1]);
 const ids=[...embedded,...linked];
 assert.ok(ids.length>=10 && ids.length<=150);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(embedded.length,9);
 assert.ok(linked.includes("conselho-de-reinos") && linked.includes("mercado-de-rotas"));
 assert.equal(linked.length,ids.length-9);
 assert.match(lab,new RegExp(String(ids.length)+" motores independentes"));
 assert.match(portal,new RegExp(String(ids.length)+" jogos independentes"));
 assert.match(portal,/href="\.\/independentes\/mercado-de-rotas\/"/);
 assert.match(portal,/href="\.\/independentes\/conselho-de-reinos\/"/);
 assert.match(portal,/href="\.\/independentes\/comando-de-drones\/"/);
 assert.match(portal,/id="pg-bot-in-arena"/);
});
