import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function handler(file,scope){
 const events=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(type,cb){events.set(type,cb);}};
 runInNewContext(readFileSync(file,'utf8'),{
  self,URL,Promise,Set,Response,caches:{open:async()=>({}),match:async()=>undefined},fetch:async()=>new Response('ok'),
 });
 return events.get('fetch');
}
test('o catálogo não intercepta os filhos existentes nem Cifras Reais',()=>{
 const root='https://example.test/PG-Arcade/estrategia/independentes/';
 const parent=handler('public/estrategia/independentes/sw.js',root);
 for(const name of ['cifras-reais/','reversi-tatico/','mercado-de-rotas/','conselho-de-reinos/']){
  let handled=false;
  parent({request:{method:'GET',url:root+name,mode:'navigate'},respondWith(){handled=true;}});
  assert.equal(handled,false,name);
 }
});
test('Cifras Reais tem cache próprio de regras, interface e PG Bot',()=>{
 const scope='https://example.test/PG-Arcade/estrategia/independentes/cifras-reais/';
 const src=readFileSync('public/estrategia/independentes/cifras-reais/sw.js','utf8');
 assert.match(src,/[\x22\x27]\.\/engine\.mjs[\x22\x27]/);
 assert.match(src,/[\x22\x27]\.\/pg-bot\.mjs[\x22\x27]/);
 const child=handler('public/estrategia/independentes/cifras-reais/sw.js',scope);
 for(const path of ['', 'index.html','engine.mjs','pg-bot.mjs','app.js']){
  let handled=false;
  child({request:{method:'GET',url:scope+path,mode:path?'cors':'navigate'},respondWith(){handled=true;}});
  assert.equal(handled,true,path);
 }
 let outside=false;
 child({request:{method:'GET',url:scope+'../naval.mjs',mode:'cors'},respondWith(){outside=true;}});
 assert.equal(outside,false);
});
