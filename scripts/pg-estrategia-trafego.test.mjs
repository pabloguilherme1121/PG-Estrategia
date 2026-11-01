import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraffic,runTrafficTurn,undoTrafficTurn,toggleTrafficPause,TRAFFIC_LEVELS} from '../public/estrategia/independentes/controle-trafego/engine.mjs';

test('dois modos e tres dificuldades possuem dados locais determinísticos e validacao',()=>{
 for(const mode of ['cidade','resgate'])for(const difficulty of Object.keys(TRAFFIC_LEVELS)){
  const a=createTraffic({mode,difficulty,seed:1}),b=createTraffic({mode,difficulty,seed:1});
  assert.deepEqual(a,b);
  assert.equal(a.turn,0);assert.equal(a.phase,'playing');assert.equal(a.lanes.N.length,0);
 }
 assert.throws(()=>createTraffic({mode:'__proto__'}));
 assert.throws(()=>createTraffic({difficulty:'impossivel'}));
 assert.throws(()=>createTraffic({seed:-1}));
});
test('cada fase processa apenas seus dois sentidos e o turno nunca e duplicado',()=>{
 const start=createTraffic({seed:0});
 const a=runTrafficTurn(start,'NS');
 assert.equal(a.turn,1);
 assert.equal(a.served,0);
 assert.equal(a.lanes.E.length,1);
 assert.equal(a.lanes.W.length,1);
 assert.deepEqual(start.lanes.E,[]);
 const b=runTrafficTurn(a,'EW');
 assert.equal(b.turn,2);assert.equal(b.served,2);
 assert.equal(runTrafficTurn(b,'invalido'),b);
});
test('pausa impede avancar e desfazer restaura a fila e o placar',()=>{
 const first=createTraffic({seed:0});
 const paused=toggleTrafficPause(first);
 assert.equal(paused.paused,true);
 assert.equal(runTrafficTurn(paused,'EW'),paused);
 const after=runTrafficTurn(toggleTrafficPause(paused),'EW');
 assert.equal(after.turn,1);
 const undo=undoTrafficTurn(after);
 assert.equal(undo.turn,0);
 assert.deepEqual(undo.lanes,first.lanes);
 assert.equal(undo.served,0);
});
test('fluxo incorreto congestiona e encerra o jogo sem comandos extras',()=>{
 let state=createTraffic({difficulty:'veterano',seed:0});
 for(let i=0;i<12&&state.phase==='playing';i++)state=runTrafficTurn(state,'NS');
 assert.equal(state.phase,'lost');
 assert.equal(runTrafficTurn(state,'EW'),state);
});
test('cidade e resgate podem ser vencidos nos 3 níveis e 4 sementes',()=>{
 for(const mode of ['cidade','resgate'])for(const difficulty of Object.keys(TRAFFIC_LEVELS))for(let seed=0;seed<4;seed++){
  let state=createTraffic({mode,difficulty,seed});
  for(let turn=1;turn<=12&&state.phase==='playing';turn++){
   const flow=(turn+seed)%2===0?'NS':'EW';
   const signal=mode==='resgate'&&(turn===3||turn===9)?'EW':flow;
   state=runTrafficTurn(state,signal);
  }
  assert.equal(state.phase,'won',mode+'/'+difficulty+'/'+seed+': '+state.notice);
  if(mode==='resgate')assert.equal(state.urgentServed,2);
 }
});
