import test from 'node:test';
import assert from 'node:assert/strict';
import {EXISTING_STRATEGY} from '../public/estrategia/catalog.mjs';
import {STRATEGY_GROUPS, strategyGroupFor, filterStrategyLibrary, strategyLaunchUrl, arcadeGameUrl, readStrategyFavorites, strategyBotTip} from '../public/estrategia/strategy-hub.mjs';

test('biblioteca preserva os 47 jogos históricos com IDs estáveis e grupos sem duplicação',()=>{
 assert.equal(EXISTING_STRATEGY.length,47);
 const ids=EXISTING_STRATEGY.map(([id])=>id);
 assert.equal(new Set(ids).size,47);
 assert.equal(Object.keys(STRATEGY_GROUPS).length,4);
 for(const id of ids)assert.ok(strategyGroupFor(id) && Object.hasOwn(STRATEGY_GROUPS,strategyGroupFor(id)),id);
 assert.equal(filterStrategyLibrary('', 'all').length,47);
 for(const group of Object.keys(STRATEGY_GROUPS))assert.ok(filterStrategyLibrary('',group).length>0);
 assert.equal(Object.values(STRATEGY_GROUPS).flat().length,47);
});
test('busca de estratégia ignora maiúsculas e acentos e combina grupos',()=>{
 assert.deepEqual(filterStrategyLibrary('XADREZ','all').map(g=>g.id),['xadrez']);
 assert.deepEqual(filterStrategyLibrary('relEs','logica').map(g=>g.id),['reles']);
 assert.deepEqual(filterStrategyLibrary('domino','tabuleiro').map(g=>g.id),['domino']);
 assert.equal(filterStrategyLibrary('domino','gestao').length,0);
 assert.equal(filterStrategyLibrary('nao-existe','all').length,0);
 assert.equal(filterStrategyLibrary('','invalid').length,0);
});
test('deep links só aceitam IDs oficiais, preservando a mesma engine e os recordes',()=>{
 assert.equal(strategyLaunchUrl('xadrez'),'?arcade=xadrez#classicos');
 assert.equal(arcadeGameUrl('xadrez'),'../#/jogar/xadrez');
 assert.equal(strategyLaunchUrl('nao-existe'),null);
 assert.equal(arcadeGameUrl('__proto__'),null);
 assert.equal(arcadeGameUrl('../?arcade=x'),null);
});


test('service worker da campanha não apaga caches nem intercepta os jogos independentes',async()=>{
 const {readFileSync}=await import('node:fs');
 const {runInNewContext}=await import('node:vm');
 const root='https://example.test/PG-Arcade/estrategia/';
 const handlers=new Map(),deleted=[];
 const old=['pg-estrategia-shell-v3','pg-estrategia-originais-shell-v9','pg-estrategia-mercado-v2','pg-estrategia-reversi-v1'];
 const self={
  registration:{scope:root},location:{origin:new URL(root).origin},
  clients:{async claim(){}},
  addEventListener(type,callback){handlers.set(type,callback);}
 };
 runInNewContext(readFileSync('public/estrategia/sw.js','utf8'),{
  self,URL,Promise,Set,Response,
  caches:{
   async keys(){return old;},
   async delete(key){deleted.push(key);return true;},
   async match(){return undefined;},
   async open(){return {async put(){}};}
  },fetch:async()=>new Response('ok')
 });
 let activation;
 handlers.get('activate')({waitUntil(promise){activation=promise;}});
 await activation;
 assert.deepEqual(deleted,['pg-estrategia-shell-v3']);
 for(const path of ['independentes/','independentes/naval.mjs','independentes/mercado-de-rotas/','independentes/reversi-tatico/']){
  let intercepted=false;
  handlers.get('fetch')({request:{url:root+path,method:'GET',mode:path.endsWith('/')?'navigate':'cors'},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false,path);
 }
});

test('PG Bot oferece ajuda local relevante para cada jogo e recusa IDs falsos',()=>{
 for(const [id,name] of EXISTING_STRATEGY){
  const answer=strategyBotTip(id);
  assert.ok(answer.includes(name),id);
  assert.ok(answer.length>90,id);
  assert.doesNotMatch(answer,/<\/?[a-z]/i,id);
 }
 assert.equal(strategyBotTip('__proto__'),null);
});


test('favoritos do Arcade acompanham a biblioteca sem criar outro armazenamento',()=>{
 const raw=JSON.stringify({favorites:['xadrez','domino','2048','nao-existe','xadrez']});
 assert.deepEqual(readStrategyFavorites(raw),['xadrez','domino','2048']);
 assert.deepEqual(filterStrategyLibrary('', 'favorites',readStrategyFavorites(raw)).map(g=>g.id),
    ['2048','xadrez','domino']);
 assert.deepEqual(filterStrategyLibrary('xadrez','favorites',readStrategyFavorites(raw)).map(g=>g.id),['xadrez']);
 assert.equal(filterStrategyLibrary('domino','favorites',[]).length,0);
 assert.equal(filterStrategyLibrary('','all',readStrategyFavorites(raw)).length,47);
});
test('favoritos inválidos, corrompidos ou de jogos fora da estratégia são ignorados',()=>{
 assert.deepEqual(readStrategyFavorites(null),[]);
 assert.deepEqual(readStrategyFavorites('{bad'),[]);
 assert.deepEqual(readStrategyFavorites(JSON.stringify({favorites:'xadrez'})),[]);
 assert.deepEqual(readStrategyFavorites(JSON.stringify({favorites:['snake','xadrez',{},null,'__proto__','xadrez']})),['xadrez']);
 assert.equal(filterStrategyLibrary('','favorites').length,0);
});
