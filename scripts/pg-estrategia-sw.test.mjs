import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('PG Estratégia independente intercepta somente seu próprio caminho, nunca o Arcade',()=>{
 const source=readFileSync('public/estrategia/sw.js','utf8');
 const handlers=new Map();
 const self={
  location:{origin:'https://example.test'},
  registration:{scope:'https://example.test/PG-Estrategia/'},
  addEventListener(name,fn){handlers.set(name,fn)}
 };
 runInNewContext(source,{self,URL,Promise,Set,Response,caches:{open:async()=>({put:async()=>{}}),match:async()=>undefined},fetch:async()=>new Response('ok')});
 const onFetch=handlers.get('fetch');
 assert.equal(typeof onFetch,'function');
 for(const path of ['/PG-Arcade/','/PG-Arcade/estrategia/','/PG-Bot/','/PG-Estrategia/independentes/']){
  let caught=false;
  onFetch({request:{method:'GET',url:'https://example.test'+path,mode:'navigate'},respondWith(){caught=true}});
  // Os jogos independentes possuem seu próprio service worker com escopo de subpasta.
  assert.equal(caught,false,path+' não pode ser capturado pelo shell da campanha');
 }
 let captured=false;
 onFetch({request:{method:'GET',url:'https://example.test/PG-Estrategia/index.html',mode:'cors'},respondWith(){captured=true}});
 assert.equal(captured,true,'O shell da campanha mantém sua cache própria');
});
