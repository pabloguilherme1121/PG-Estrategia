import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function handler(file,scope){
 const callbacks=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(name,fn){callbacks.set(name,fn)}};
 runInNewContext(readFileSync(file,'utf8'),{self,URL,Promise,Set,Response,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response('ok')});
 return callbacks.get('fetch');
}
test('service worker do laboratório não captura o jogo Controle de Tráfego',()=>{
 const scope='https://example.test/PG-Arcade/estrategia/independentes/';
 const fetch=handler('public/estrategia/independentes/sw.js',scope);
 for(const path of ['controle-trafego/','controle-trafego/app.js','controle-trafego/engine.mjs']){
  let handled=false;
  fetch({request:{method:'GET',url:scope+path,mode:path.endsWith('/')?'navigate':'cors'},respondWith(){handled=true}});
  assert.equal(handled,false,path);
 }
});
test('service worker do Tráfego atende somente seu próprio escopo',()=>{
 const scope='https://example.test/PG-Arcade/estrategia/independentes/controle-trafego/';
 const fetch=handler('public/estrategia/independentes/controle-trafego/sw.js',scope);
 for(const path of ['','index.html','app.js','engine.mjs']){
  let handled=false;
  fetch({request:{method:'GET',url:scope+path,mode:path?'cors':'navigate'},respondWith(){handled=true}});
  assert.equal(handled,true,path);
 }
 let handled=false;
 fetch({request:{method:'GET',url:scope+'../app.js',mode:'cors'},respondWith(){handled=true}});
 assert.equal(handled,false);
});
