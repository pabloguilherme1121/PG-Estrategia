import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const SRC='public/estrategia/independentes/oficina-automatos/sw.js';
const scope='https://example.test/PG-Arcade/estrategia/independentes/oficina-automatos/';
function harness(){
 const handlers=new Map(),store=new Map(),deleted=[];let online=true,calls=0;
 const self={location:{origin:'https://example.test'},registration:{scope},clients:{async claim(){}},skipWaiting(){},addEventListener(type,fn){handlers.set(type,fn)}};
 const caches={open:async()=>({async addAll(){},async put(key,val){store.set(typeof key==='string'?key:key.url,val.clone())}}),
  match:async key=>store.get(typeof key==='string'?key:key.url)?.clone(),
  keys:async()=>['pg-estrategia-oficina-v0','pg-estrategia-shell-v4','pg-estrategia-originais-shell-v8','pg-estrategia-oficina-v1'],
  async delete(key){deleted.push(key);return true}};
 runInNewContext(readFileSync(SRC,'utf8'),{self,URL,Response,Promise,Set,caches,fetch:async()=>{calls++;if(!online)throw Error('offline');return new Response('online',{status:200})}});
 async function request(url,mode='cors'){let intercepted=null;handlers.get('fetch')({request:{url,method:'GET',mode},respondWith(p){intercepted=p}});return intercepted?await intercepted:null}
 return {handlers,request,deleted,setOnline(v){online=v},get calls(){return calls}};
}
test('Oficina: SW pertence somente ao jogo e guarda motor local',async()=>{
 const h=harness(),url=scope+'engine.mjs';
 assert.equal(await h.request('https://example.test/PG-Arcade/estrategia/app.js'),null);
 assert.equal(await h.request('https://example.test/PG-Arcade/assets/index.js'),null);
 assert.equal(await (await h.request(url)).text(),'online');
 h.setOnline(false);
 assert.equal(await (await h.request(url)).text(),'online');
 assert.equal(h.calls,2);
});
test('Oficina: ativação não apaga caches de outros jogos nem do portal',async()=>{
 const h=harness();let pending=null;
 h.handlers.get('activate')({waitUntil(p){pending=p}});
 await pending;
 assert.deepEqual(h.deleted,['pg-estrategia-oficina-v0']);
});

test('Oficina: o service worker pai não intercepta este subsite',()=>{
 const parentScope='https://example.test/PG-Arcade/estrategia/independentes/';
 const handlers=new Map();
 const self={location:{origin:'https://example.test'},registration:{scope:parentScope},addEventListener(type,fn){handlers.set(type,fn)}};
 runInNewContext(readFileSync('public/estrategia/independentes/sw.js','utf8'),{
  self,URL,Response,Promise,Set,caches:{match:async()=>undefined,open:async()=>({})},fetch:async()=>new Response('ok')
 });
 for(const [path,mode] of [['oficina-automatos/','navigate'],['oficina-automatos/engine.mjs','cors']]){
  let intercepted=false;
  handlers.get('fetch')({request:{method:'GET',url:parentScope+path,mode},respondWith(){intercepted=true}});
  assert.equal(intercepted,false,'SW pai não deve interceptar '+path);
 }
});
