import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function getFetch(path,scope){
 const listeners=new Map();
 const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener(type,fn){listeners.set(type,fn);}};
 runInNewContext(readFileSync(path,'utf8'),{self,URL,Promise,Set,Response,caches:{open:async()=>({}),match:async()=>undefined},fetch:async()=>new Response('ok')});
 return listeners.get('fetch');
}
test('service worker pai não serve HTML antigo para o jogo de drones',()=>{
 const root='https://example.test/PG-Arcade/estrategia/independentes/';
 const handler=getFetch('public/estrategia/independentes/sw.js',root);
 for(const path of ['comando-de-drones/','comando-de-drones/app.js','comando-de-drones/engine.mjs']){
  let handled=false;
  handler({request:{method:'GET',url:root+path,mode:path.endsWith('/')?'navigate':'cors'},respondWith(){handled=true;}});
  assert.equal(handled,false,path);
 }
});
test('service worker do jogo serve só seus módulos no escopo isolado',()=>{
 const root='https://example.test/PG-Arcade/estrategia/independentes/comando-de-drones/';
 const handler=getFetch('public/estrategia/independentes/comando-de-drones/sw.js',root);
 for(const path of ['','index.html','app.js','engine.mjs','style.css']){
  let handled=false;
  handler({request:{method:'GET',url:root+path,mode:path?'cors':'navigate'},respondWith(){handled=true;}});
  assert.equal(handled,true,path);
 }
 let outside=false;
 handler({request:{method:'GET',url:root+'../naval.mjs',mode:'cors'},respondWith(){outside=true;}});
 assert.equal(outside,false);
});
