import test from 'node:test';
import assert from 'node:assert/strict';
import {createTides,rotateTide,undoTide,pauseTide,hintTides,MODES,LEVELS} from '../public/estrategia/independentes/relogios-mare/engine.mjs';
test('relógios: gera 2 modos, 3 níveis e sementes determinísticas',()=>{
 for(const mode of MODES)for(const difficulty of Object.keys(LEVELS))for(let seed=0;seed<24;seed++){
  const a=createTides({mode,difficulty,seed});
  assert.deepEqual(a,createTides({mode,difficulty,seed}));
  assert.equal(a.ticks.length,LEVELS[difficulty]);assert.equal(a.phase,'playing');
  assert.ok(a.ticks.every(v=>Number.isInteger(v)&&v>=0&&v<=2));
  assert.ok(a.ticks.some(v=>v!==0));
 }
});
test('relógios: toque altera somente mostrador e vizinhos conforme modo',()=>{
 for(const mode of MODES){
  const g=createTides({mode,difficulty:'recruta',seed:0});
  const n=rotateTide(g,0);
  for(let i=0;i<g.ticks.length;i++){
   const affected=i===0||i===1||(mode==='anel'&&i===g.ticks.length-1);
   assert.equal(n.ticks[i],(g.ticks[i]+(affected?1:0))%3,mode+' index '+i);
  }
  assert.deepEqual(g.ticks,createTides({mode,difficulty:'recruta',seed:0}).ticks);
 }
});
test('relógios: entradas inválidas não gastam jogadas ou modificam estado',()=>{
 const g=createTides();
 for(const key of [-1,4,1.1,NaN,'0',null])assert.equal(rotateTide(g,key),g);
 assert.throws(()=>createTides({difficulty:'nenhuma'}),RangeError);
 assert.throws(()=>createTides({mode:'nenhum'}),RangeError);
 assert.throws(()=>createTides({seed:-3}),RangeError);
});
test('relógios: pausa e desfazer recuperam estado e histórico',()=>{
 const g=createTides(),n=rotateTide(g,1);
 const paused=pauseTide(n);assert.equal(paused.paused,true);
 assert.equal(rotateTide(paused,1),paused);assert.equal(undoTide(paused),paused);
 assert.equal(hintTides(paused),null);
 const resumed=pauseTide(paused),undone=undoTide(resumed);
 assert.deepEqual(undone.ticks,g.ticks);assert.equal(undone.moves,0);assert.equal(undone.history.length,0);
});
test('relógios: busca encontra e executa solução verdadeira para cada modo, nível e semente',()=>{
 for(const mode of MODES)for(const difficulty of Object.keys(LEVELS))for(let seed=0;seed<24;seed++){
  let g=createTides({mode,difficulty,seed}),steps=0;
  while(g.phase==='playing'&&steps++<100){
   const hint=hintTides(g);assert.ok(Number.isInteger(hint),mode+'/'+difficulty+'/'+seed);
   const next=rotateTide(g,hint);assert.notEqual(next,g);g=next;
  }
  assert.equal(g.phase,'won',mode+'/'+difficulty+'/'+seed);assert.ok(g.score>0);
  assert.ok(g.ticks.every(t=>t===0));
 }
});
test('relógios: derrota por jogadas esgotadas e vitória travam tabuleiro',()=>{
 const g=createTides({seed:7});
 const forced={...g,ticks:Array(g.size).fill(1),limit:1,moves:0};
 const lost=rotateTide(forced,0);assert.equal(lost.phase,'lost');
 assert.equal(rotateTide(lost,0),lost);assert.equal(pauseTide(lost),lost);
});

test('relógios: dica não promete vitória quando o limite impede completar a solução',()=>{
 const initial=createTides({mode:'linha',difficulty:'recruta',seed:0});
 const noTime={...initial,moves:initial.limit-1};
 assert.ok(Array.from({length:noTime.size},(_,i)=>rotateTide(noTime,i)).every(next=>next.phase!=='won'));
 assert.equal(hintTides(noTime),null);
 const oneMove={...initial,ticks:[2,2,0,0],moves:initial.limit-1};
 assert.equal(hintTides(oneMove),0);
 assert.equal(rotateTide(oneMove,0).phase,'won');
});