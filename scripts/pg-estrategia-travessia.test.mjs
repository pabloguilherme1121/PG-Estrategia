import test from 'node:test';
import assert from 'node:assert/strict';
import {newCrossing,moveCrossing,undoCrossing,toggleCrossingPause,hintCrossing,CROSSING_LEVELS,CROSSING_MODES} from '../public/estrategia/independentes/travessia-vale/engine.mjs';
test('travessia: 2 modalidades, três dificuldades, estados determinísticos',()=>{
 for(const difficulty of Object.keys(CROSSING_LEVELS))for(const mode of CROSSING_MODES){
  const g=newCrossing({difficulty,mode});
  assert.equal(g.items.length,CROSSING_LEVELS[difficulty]);
  assert.equal(g.capacity,mode==='classico'?1:2);
  assert.deepEqual(g,newCrossing({difficulty,mode}));
 }
});
test('travessia: rejeita configurações ou ações inválidas e dupla incompatível sem supervisão',()=>{
 const g=newCrossing();
 assert.throws(()=>newCrossing({mode:'nao'}),RangeError);
 assert.throws(()=>newCrossing({difficulty:'nao'}),RangeError);
 for(const items of [['lobo'],['cabra','lobo'],['cabra','cabra'],['ferramentas'],['']]){
  assert.equal(moveCrossing(g,items),g);
 }
});
test('travessia: pausa impede ações e desfazer recupera estado sem mutação',()=>{
 const g=newCrossing(),n=moveCrossing(g,['cabra']);
 assert.equal(n.moves,1);assert.equal(g.moves,0);assert.equal(n.bank,1);
 const p=toggleCrossingPause(n);assert.equal(p.paused,true);
 assert.equal(moveCrossing(p,[]),p);assert.equal(undoCrossing(p),p);
 const u=undoCrossing(toggleCrossingPause(p));assert.equal(u.moves,0);assert.equal(u.bank,0);
});
test('travessia: dicas BFS realmente vencem 6 combinações',()=>{
 for(const difficulty of Object.keys(CROSSING_LEVELS))for(const mode of CROSSING_MODES){
  let g=newCrossing({difficulty,mode}),steps=0;
  while(g.phase==='playing'&&steps++<50){
   const hint=hintCrossing(g);
   assert.ok(hint);
   const n=moveCrossing(g,hint);
   assert.notEqual(n,g);
   g=n;
  }
  assert.equal(g.phase,'won',difficulty+'/'+mode);assert.ok(g.score>0);
 }
});
test('travessia: prazo encerrado marca derrota; vitória e derrota não aceitam ações',()=>{
 let g=newCrossing();for(let i=0;i<g.limit;i++)g=moveCrossing(g,['cabra']);
 assert.equal(g.phase,'lost');
 assert.equal(moveCrossing(g,['cabra']),g);
 assert.equal(toggleCrossingPause(g),g);
});
